/**
 * Serviço de Checkpoints — gestão do PLANO (metas por período).
 *
 * Arquitetura unificada (04/2026):
 * - O `currentValue`/`progress` do KR é controlado SOMENTE pelo fluxo de
 *   check-in. Ao atualizar um checkpoint via admin com `actualValue`,
 *   criamos implicitamente um check-in para a semana corrente, mantendo
 *   uma única fonte de verdade.
 * - O `status` dos checkpoints é recalculado automaticamente comparando
 *   o último check-in com a meta planejada.
 */
import { storage } from "../../storage";
import { NotFoundError } from "../../errors/app-error";
import { convertBRToDatabase, formatBrazilianNumber } from "../../shared/formatters";
import { recalcCheckpointStatuses, updateKrAndCascade } from "../../domain/checkpoints/recalc";
import { recordActivity } from "../../lib/audit-log";

type CurrentUser = { id: number };

/**
 * Formata um checkpoint para resposta no padrão brasileiro.
 */
export function formatCheckpointForResponse(c: any) {
  return {
    ...c,
    actualValue: c.actualValue ? formatBrazilianNumber(c.actualValue) : null,
    targetValue: formatBrazilianNumber(c.targetValue || "0"),
    progress: c.progress ? parseFloat(c.progress).toFixed(2) : "0",
  };
}

export function formatCheckpointsForResponse(list: any[]) {
  return list.map(formatCheckpointForResponse);
}

/**
 * Lista checkpoints (opcionalmente filtrados por KR e/ou região/sub-região)
 * e enriquece cada item com o `actualValue` derivado do último check-in
 * registrado para o KR.
 */
export async function listCheckpoints(
  currentUser: CurrentUser,
  keyResultId?: number,
  filters?: { regionId?: number; subRegionId?: number }
) {
  const checkpoints = await storage.getCheckpoints(keyResultId, currentUser.id, filters);

  // Enriquece cada checkpoint com o valor reportado pelo check-in mais recente
  // do KR (a "realidade" sobreposta ao "plano"). Buffer simples por KR para
  // evitar N consultas desnecessárias.
  const krCache = new Map<number, string | null>();
  const enriched = await Promise.all(
    checkpoints.map(async (cp: any) => {
      const krId = cp.keyResultId;
      let reported = krCache.get(krId);
      if (reported === undefined) {
        const latest = await storage.checkIns.latest(krId);
        reported = latest?.currentValue?.toString() ?? null;
        krCache.set(krId, reported);
      }
      return {
        ...cp,
        // Mantém o actualValue histórico do checkpoint, mas adiciona o valor
        // reportado pelo check-in mais recente (fonte de verdade da execução).
        reportedValue: reported,
      };
    })
  );

  return formatCheckpointsForResponse(enriched).map((c, i) => ({
    ...c,
    reportedValue: enriched[i].reportedValue
      ? formatBrazilianNumber(enriched[i].reportedValue)
      : null,
  }));
}

/**
 * Busca um checkpoint validando acesso.
 */
export async function getCheckpoint(currentUser: CurrentUser, id: number) {
  const checkpoint = await storage.getCheckpoint(id, currentUser.id);
  if (!checkpoint) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");
  return checkpoint;
}

/**
 * Cria um check-in implícito quando um admin atualiza um checkpoint com
 * `actualValue`. Mantém a fonte única do `currentValue` no fluxo de check-ins.
 */
async function createImplicitCheckIn(
  authorId: number,
  keyResultId: number,
  reportedValue: number,
  notes?: string | null
): Promise<void> {
  const weekStart = mondayOfWeek(new Date());
  await storage.checkIns.create({
    keyResultId,
    authorId,
    weekStart,
    status: "on_track",
    confidence: 7,
    currentValue: reportedValue.toString(),
    nextSteps: notes ?? null,
    blockers: null,
  });
  await updateKrAndCascade(keyResultId, reportedValue);
}

/** Calcula a data ISO (YYYY-MM-DD) da segunda-feira da semana de uma data. */
function mondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Atualização simples do progresso de um checkpoint (endpoint legado /update).
 * Cria check-in implícito quando há `actualValue` para manter fonte única.
 */
export async function updateCheckpointProgress(
  currentUser: CurrentUser,
  id: number,
  payload: { actualValue?: string; status?: string }
) {
  const existing = await storage.getCheckpoint(id, currentUser.id);
  if (!existing) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");

  const actualValueDb = payload.actualValue ? convertBRToDatabase(payload.actualValue) : null;

  if (actualValueDb !== null) {
    await createImplicitCheckIn(currentUser.id, existing.keyResultId, actualValueDb);
  }

  // Apenas metadados do checkpoint são atualizados aqui (status manual).
  const updated = await storage.updateCheckpoint(id, {
    status: payload.status || existing.status,
  });

  // Recalcula automaticamente o status de todos os checkpoints do KR.
  await recalcCheckpointStatuses(existing.keyResultId);

  await recordActivity({
    userId: currentUser.id,
    action: "update",
    entityType: "checkpoint",
    entityId: id,
    before: existing,
    after: updated,
  });

  return {
    ...updated,
    actualValue: formatBrazilianNumber(updated.actualValue || "0"),
    targetValue: formatBrazilianNumber(updated.targetValue || "0"),
    progress: updated.progress ? parseFloat(updated.progress).toFixed(2) : "0.00",
  };
}

type FullUpdatePayload = {
  actualValue: string;
  notes?: string;
  status?: string;
  completedDate?: string | Date | null;
  completedAt?: string | Date | null;
};

/**
 * Atualização completa de um checkpoint (admin).
 *
 * Quando `actualValue` é fornecido, cria um check-in implícito para a semana
 * corrente e propaga a cascata de progresso. O checkpoint em si recebe apenas
 * notas/status — o `actualValue` será populado via `recalcCheckpointStatuses`.
 */
export async function updateCheckpoint(
  currentUser: CurrentUser,
  id: number,
  payload: FullUpdatePayload
) {
  const existing = await storage.getCheckpoint(id, currentUser.id);
  if (!existing) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");

  const reported = payload.actualValue ? convertBRToDatabase(payload.actualValue) : null;

  if (reported !== null) {
    await createImplicitCheckIn(
      currentUser.id,
      existing.keyResultId,
      reported,
      payload.notes
    );
  }

  const updateData: Record<string, unknown> = {
    notes: payload.notes ?? null,
    status: payload.status || "completed",
  };
  if (payload.status === "completed") {
    updateData.completedDate = payload.completedDate ? new Date(payload.completedDate) : new Date();
    updateData.completedAt = payload.completedAt ? new Date(payload.completedAt) : new Date();
  } else {
    updateData.completedDate = null;
    updateData.completedAt = null;
  }

  const checkpoint = await storage.updateCheckpoint(id, updateData);
  await recalcCheckpointStatuses(existing.keyResultId);

  await recordActivity({
    userId: currentUser.id,
    action: "update",
    entityType: "checkpoint",
    entityId: id,
    before: existing,
    after: checkpoint,
  });

  return checkpoint;
}

/**
 * Remove um checkpoint.
 */
export async function deleteCheckpoint(currentUser: CurrentUser, id: number) {
  const existing = await storage.getCheckpoint(id, currentUser.id);
  if (!existing) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");
  await storage.deleteCheckpoint(id);

  await recordActivity({
    userId: currentUser.id,
    action: "delete",
    entityType: "checkpoint",
    entityId: id,
    before: existing,
  });
}
