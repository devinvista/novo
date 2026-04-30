import { sql, type SQL } from "drizzle-orm";
import { db } from "../../pg-db";
import { storage } from "../../storage";
import { convertBRToDatabase } from "../../shared/formatters";
import { computeKrProgressForDb } from "../progress/compute";
import { logger } from "../../infra/logger";

/**
 * Mínima interface aceita pelos helpers — tanto `db` quanto a transação
 * retornada por `db.transaction` expõem `.execute()`. Usar essa interface
 * evita acoplar nossos helpers ao tipo concreto da transação do drizzle.
 */
type SqlExecutor = { execute: (query: SQL) => Promise<unknown> };

/**
 * Atomicidade do recálculo (race condition fix):
 *
 * Anteriormente, dois check-ins (ou updates de checkpoint) concorrentes
 * sobre o mesmo Key Result podiam executar a sequência [ler dados →
 * calcular progresso → escrever KR/objetivo] em paralelo, levando a
 * progressos inconsistentes (cada thread escrevia seu próprio resultado
 * com base num snapshot defasado).
 *
 * Agora todo o fluxo crítico ocorre dentro de uma transação Postgres com
 * `pg_advisory_xact_lock` chaveado pelo `objectiveId` (ou `-keyResultId`
 * quando órfão). O lock é exclusivo por sessão e liberado automaticamente
 * no COMMIT/ROLLBACK, garantindo serialização da janela de leitura+escrita
 * por árvore de objetivos sem custo de schema.
 *
 * --- ARQUITETURA UNIFICADA (a partir de 04/2026) ---
 *
 * O check-in semanal é a ÚNICA fonte de verdade do `currentValue` do KR.
 * O checkpoint deixou de gravar `currentValue`/`progress` no KR — ele
 * mantém o PLANO (targetValue por período) e tem seu `status` recalculado
 * automaticamente comparando o último valor reportado pelo check-in com a
 * meta planejada de cada checkpoint.
 *
 * Caminhos de escrita do `currentValue` do KR:
 *   1. POST /api/key-results/:id/check-ins (entrada principal pelo usuário)
 *   2. PUT /api/checkpoints/:id (admin) → cria implicitamente um check-in
 *      semanal antes de salvar o checkpoint, mantendo a fonte única.
 *
 * Função canônica de cálculo de progresso: `computeKrProgress` em
 * `server/domain/progress/compute.ts`.
 */

async function acquireAdvisoryLock(tx: SqlExecutor, key: number): Promise<void> {
  // BIGINT lock key. pg_advisory_xact_lock é reentrante na mesma sessão
  // (chamadas adicionais com mesma chave são no-op).
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${key})`);
}

/**
 * Implementação do cascade que assume já estar dentro de uma transação
 * com lock advisory adquirido para o objetivo raiz. Adquire locks
 * adicionais para cada ancestral antes de recalculá-los.
 */
async function _recalcObjectiveCascadeLocked(
  tx: SqlExecutor,
  objectiveId: number
): Promise<void> {
  await storage.objectives.recalcProgressFromKeyResults(objectiveId);
  const ancestors = await storage.objectives.getAncestorIds(objectiveId);
  for (const ancestorId of ancestors) {
    await acquireAdvisoryLock(tx, ancestorId);
    await storage.objectives.recalcProgressFromChildren(ancestorId);
  }
}

/**
 * Recalcula o `status` de cada checkpoint de um KR comparando a meta planejada
 * (`targetValue`) e a `dueDate` do checkpoint com o último valor reportado
 * via check-in.
 *
 * Regras:
 *   - dueDate no futuro                  → status mantém-se "pending"
 *   - dueDate no passado e atingiu meta  → "completed" + completedAt = agora
 *   - dueDate no passado e abaixo da meta→ "delayed"
 *   - sem check-in nenhum                → mantém o status atual
 *
 * Esta função NÃO grava `currentValue`/`progress` no KR — isso fica a cargo
 * do POST de check-in.
 */
export async function recalcCheckpointStatuses(keyResultId: number): Promise<void> {
  const kr = await storage.getKeyResult(keyResultId);
  if (!kr) return;

  const allCheckpoints = await storage.getCheckpoints(keyResultId);
  if (allCheckpoints.length === 0) return;

  const latestCheckIn = await storage.checkIns.latest(keyResultId);
  const reportedValue =
    latestCheckIn && latestCheckIn.currentValue !== null && latestCheckIn.currentValue !== undefined
      ? convertBRToDatabase(String(latestCheckIn.currentValue))
      : null;

  if (reportedValue === null) return;

  const now = new Date();
  for (const cp of allCheckpoints) {
    if (!cp.dueDate) continue;
    const due = new Date(cp.dueDate);
    if (due > now) continue; // futuro: não muda

    const target = convertBRToDatabase(String(cp.targetValue ?? "0"));
    if (target <= 0) continue;

    const reached = reportedValue >= target;
    const newStatus = reached ? "completed" : "delayed";

    if (cp.status === newStatus) continue;

    const update: Record<string, unknown> = {
      status: newStatus,
      actualValue: reportedValue.toString(),
    };
    if (reached) {
      update.completedDate = cp.completedDate ?? now;
      update.completedAt = cp.completedAt ?? now;
    } else {
      update.completedDate = null;
      update.completedAt = null;
    }

    try {
      await storage.updateCheckpoint(cp.id, update);
    } catch (err) {
      logger.warn({ err, checkpointId: cp.id }, "Falha ao recalcular status de checkpoint");
    }
  }
}

/**
 * @deprecated Mantido apenas para compatibilidade com chamadas legadas.
 * Use `recalcCheckpointStatuses` + atualização do KR via check-in.
 *
 * Não escreve mais no KR. Apenas recalcula status dos checkpoints e
 * propaga a cascata de progresso do objetivo (que lê o `currentValue`
 * já gravado no KR pelo fluxo de check-in).
 */
export async function recalcKeyResultFromCheckpoints(keyResultId: number): Promise<void> {
  const kr = await storage.getKeyResult(keyResultId);
  if (!kr) return;
  await recalcCheckpointStatuses(keyResultId);
  if (kr.objectiveId) await recalcObjectiveCascade(kr.objectiveId);
}

/**
 * Atualiza o `currentValue` e `progress` do KR a partir de um valor reportado
 * (caminho do check-in) e propaga para a árvore de objetivos. Tudo dentro de
 * uma transação com advisory lock para evitar race conditions.
 */
export async function updateKrAndCascade(
  keyResultId: number,
  reportedValue: number
): Promise<void> {
  const kr = await storage.getKeyResult(keyResultId);
  if (!kr) return;

  const lockKey = kr.objectiveId ?? -keyResultId;
  const progress = computeKrProgressForDb(reportedValue, kr.targetValue);

  try {
    await db.transaction(async (tx) => {
      await acquireAdvisoryLock(tx, lockKey);
      await storage.updateKeyResult(keyResultId, {
        currentValue: reportedValue.toString(),
        progress,
      });
      if (kr.objectiveId) {
        await _recalcObjectiveCascadeLocked(tx, kr.objectiveId);
      }
    });
  } catch (err) {
    logger.error(
      { err, keyResultId, objectiveId: kr.objectiveId },
      "Falha ao atualizar Key Result a partir do check-in"
    );
    throw err;
  }
}

/**
 * Recalcula o progresso de um objetivo (média dos KRs) e propaga em cascata
 * para os ancestrais (cujo progresso é a média dos filhos diretos).
 *
 * Toda a cadeia executa numa transação com advisory lock para serializar
 * com outros recálculos do mesmo objetivo (e seus ancestrais).
 */
export async function recalcObjectiveCascade(objectiveId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await acquireAdvisoryLock(tx, objectiveId);
    await _recalcObjectiveCascadeLocked(tx, objectiveId);
  });
}
