/**
 * Serviço de Checkpoints — conversão BR↔DB, recálculo em cascata e formatação de resposta.
 */
import { storage } from "../../storage";
import { NotFoundError } from "../../errors/app-error";
import { convertBRToDatabase, formatBrazilianNumber } from "../../shared/formatters";
import { recalcKeyResultFromCheckpoints } from "../../domain/checkpoints/recalc";

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
 * Lista checkpoints (opcionalmente filtrados por KR) e formata valores.
 */
export async function listCheckpoints(currentUser: CurrentUser, keyResultId?: number) {
  const checkpoints = await storage.getCheckpoints(keyResultId, currentUser.id);
  return formatCheckpointsForResponse(checkpoints);
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
 * Atualização simples do progresso de um checkpoint (endpoint legado /update).
 * Dispara recálculo em cascata e retorna valores já no formato BR.
 */
export async function updateCheckpointProgress(
  currentUser: CurrentUser,
  id: number,
  payload: { actualValue?: string; status?: string }
) {
  const existing = await storage.getCheckpoint(id, currentUser.id);
  if (!existing) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");

  const actualValueDb = payload.actualValue ? convertBRToDatabase(payload.actualValue) : 0;

  const updated = await storage.updateCheckpoint(id, {
    actualValue: actualValueDb.toString(),
    status: payload.status || "pending",
  });

  await recalcKeyResultFromCheckpoints(existing.keyResultId);

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
 * Atualização completa de um checkpoint com cálculo de progresso e datas de conclusão.
 */
export async function updateCheckpoint(
  currentUser: CurrentUser,
  id: number,
  payload: FullUpdatePayload
) {
  const existing = await storage.getCheckpoint(id, currentUser.id);
  if (!existing) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");

  const targetValue = convertBRToDatabase(existing.targetValue);
  const actual = convertBRToDatabase(payload.actualValue);
  const progress = targetValue > 0 ? (actual / targetValue) * 100 : 0;

  const updateData: any = {
    actualValue: actual.toString(),
    notes: payload.notes,
    status: payload.status || "completed",
    progress: progress.toString(),
  };

  if (payload.status === "completed") {
    updateData.completedDate = payload.completedDate ? new Date(payload.completedDate) : new Date();
    updateData.completedAt = payload.completedAt ? new Date(payload.completedAt) : new Date();
  } else {
    updateData.completedDate = null;
    updateData.completedAt = null;
  }

  const checkpoint = await storage.updateCheckpoint(id, updateData);
  await recalcKeyResultFromCheckpoints(existing.keyResultId);
  return checkpoint;
}

/**
 * Remove um checkpoint.
 */
export async function deleteCheckpoint(currentUser: CurrentUser, id: number) {
  const existing = await storage.getCheckpoint(id, currentUser.id);
  if (!existing) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");
  await storage.deleteCheckpoint(id);
}
