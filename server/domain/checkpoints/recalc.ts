import { sql, type SQL } from "drizzle-orm";
import { db } from "../../pg-db";
import { storage } from "../../storage";
import { convertBRToDatabase } from "../../shared/formatters";
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
 * sobre o mesmo Key Result podiam executar a sequência [ler checkpoints
 * → calcular progresso → escrever KR/objetivo] em paralelo, levando a
 * progressos inconsistentes (cada thread escrevia seu próprio resultado
 * com base num snapshot defasado).
 *
 * Agora todo o fluxo crítico ocorre dentro de uma transação Postgres com
 * `pg_advisory_xact_lock` chaveado pelo `objectiveId` (ou `-keyResultId`
 * quando órfão). O lock é exclusivo por sessão e liberado automaticamente
 * no COMMIT/ROLLBACK, garantindo serialização da janela de leitura+escrita
 * por árvore de objetivos sem custo de schema (não exige SELECT FOR UPDATE
 * em todas as tabelas envolvidas).
 *
 * Os writes via `storage.*` continuam usando o pool padrão — o lock
 * advisory garante apenas exclusão mútua entre concorrentes; os writes
 * são individualmente auto-committed e ficam visíveis assim que retornam.
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
 * Recalcula currentValue/progress de um Key Result a partir dos seus checkpoints.
 * Usa o checkpoint mais recente (por dueDate) com actualValue preenchido.
 * Em seguida propaga progresso para o objetivo pai e — em cascata — para os
 * ancestrais (até 16 níveis), suportando OKRs hierárquicos.
 *
 * IMPORTANTE: chamado SEM userId — controle de acesso já deve ter sido feito
 * no endpoint que invocou esta função.
 *
 * Erros são propagados ao chamador para que o handler central de erros possa
 * notificar o usuário. Anteriormente eram engolidos silenciosamente, fazendo
 * com que o usuário visse "sucesso" mesmo quando o recálculo falhava — o que
 * gerava progresso inconsistente sem aviso visível.
 */
export async function recalcKeyResultFromCheckpoints(keyResultId: number): Promise<void> {
  const currentKR = await storage.getKeyResult(keyResultId);
  if (!currentKR) return;

  // Lock por árvore de objetivo. Para KRs órfãos usamos -keyResultId para
  // evitar colisão com chaves de objetivos.
  const lockKey = currentKR.objectiveId ?? -keyResultId;

  try {
    await db.transaction(async (tx) => {
      await acquireAdvisoryLock(tx, lockKey);

      // Re-leitura dos checkpoints DENTRO do lock — antes da correção, a
      // leitura ocorria fora da seção crítica e podia ficar defasada.
      const allCheckpoints = await storage.getCheckpoints(keyResultId);

      // Apenas checkpoints já atualizados (status "completed") representam
      // medições reais. Checkpoints pendentes têm actualValue=0 por padrão
      // e não devem zerar o progresso do KR.
      const withValue = allCheckpoints
        .filter((cp): cp is typeof cp => {
          const v = cp.actualValue;
          if (v === null || v === undefined || v === "") return false;
          return cp.status === "completed";
        })
        .sort((a, b) => {
          // dueDate é nullable no schema; checkpoints sem data caem para o final.
          const ta = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const tb = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return tb - ta;
        });

      const krTargetValue = convertBRToDatabase(currentKR.targetValue || "0");
      const latestValueRaw = withValue.length > 0 ? withValue[0].actualValue : "0";
      const currentValueNum = convertBRToDatabase(latestValueRaw || "0");
      const rawProgress =
        krTargetValue > 0 ? (currentValueNum / krTargetValue) * 100 : 0;
      const safeProgress = Number.isFinite(rawProgress) ? rawProgress : 0;
      const newKRProgress = Math.max(0, Math.min(safeProgress, 999.99));

      await storage.updateKeyResult(keyResultId, {
        currentValue: currentValueNum.toString(),
        progress: newKRProgress.toFixed(2),
      });

      if (currentKR.objectiveId) {
        await _recalcObjectiveCascadeLocked(tx, currentKR.objectiveId);
      }
    });
  } catch (err) {
    logger.error(
      { err, keyResultId, objectiveId: currentKR.objectiveId },
      "Falha ao recalcular Key Result a partir dos checkpoints"
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
