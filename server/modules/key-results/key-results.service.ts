/**
 * Serviço de Resultados-Chave — lógica de negócio separada das rotas HTTP.
 */
import { storage } from "../../storage";
import { ForbiddenError, NotFoundError } from "../../errors/app-error";
import { convertBRToDatabase, formatBrazilianNumber } from "../../shared/formatters";
import { recordActivity } from "../../lib/audit-log";
import { recalcObjectiveCascade } from "../../domain/checkpoints/recalc";
import type { InsertKeyResult } from "@shared/schema";

type CurrentUser = { id: number; role: string };

/**
 * Normaliza o body de criação/edição de KR:
 * - converte valores BR → DB (vírgula → ponto)
 * - alinha strategicIndicatorId → strategicIndicatorIds
 * - garante unit não nulo
 */
export function normalizeKRBody(body: Record<string, unknown>): Record<string, unknown> {
  const data = { ...body };
  if (data.strategicIndicatorId && !data.strategicIndicatorIds) {
    data.strategicIndicatorIds = [data.strategicIndicatorId];
  }
  if (data.unit === null) data.unit = "";
  if (data.targetValue) data.targetValue = convertBRToDatabase(String(data.targetValue)).toString();
  if (data.currentValue) data.currentValue = convertBRToDatabase(String(data.currentValue)).toString();
  return data;
}

/**
 * Calcula o status automático de um KR com base nas datas e progresso.
 */
export function resolveKRStatus(
  providedStatus: string | undefined,
  startDate: string | Date,
  endDate: string | Date,
  targetValue: string
): string {
  const today = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (today < start) return "pending";
  if (today > end && parseFloat(targetValue) > 0) return "delayed";
  return providedStatus || "active";
}

/**
 * Formata um array de KRs para exibição no padrão brasileiro.
 */
export function formatKRsForResponse(keyResults: any[]): any[] {
  return keyResults.map((kr) => ({
    ...kr,
    currentValue: formatBrazilianNumber(kr.currentValue || "0"),
    targetValue: formatBrazilianNumber(kr.targetValue || "0"),
    progress:
      kr.progress !== null && kr.progress !== undefined
        ? parseFloat(kr.progress.toString())
        : 0,
  }));
}

/**
 * Cria um resultado-chave, verificando acesso ao objetivo pai.
 */
export async function createKeyResult(currentUser: CurrentUser, data: InsertKeyResult) {
  const objective = await storage.getObjective(data.objectiveId, currentUser.id);
  if (!objective) throw new ForbiddenError("Sem permissão para criar resultado-chave neste objetivo");

  const status = resolveKRStatus(
    data.status ?? undefined,
    data.startDate,
    data.endDate,
    String(data.targetValue ?? "0")
  );

  const keyResult = await storage.createKeyResult({
    ...data,
    targetValue: String(data.targetValue ?? "0"),
    status,
  });

  await recordActivity({
    userId: currentUser.id,
    action: "create",
    entityType: "key_result",
    entityId: keyResult.id,
    after: keyResult,
  });

  return keyResult;
}

/**
 * Atualiza um resultado-chave e recalcula progresso do objetivo pai.
 */
export async function updateKeyResult(
  currentUser: CurrentUser,
  id: number,
  data: Partial<InsertKeyResult>
) {
  const existing = await storage.getKeyResult(id, currentUser.id);
  if (!existing) throw new NotFoundError("Resultado-chave não encontrado ou sem acesso");

  if (data.objectiveId && data.objectiveId !== existing.objectiveId) {
    const newObjective = await storage.getObjective(data.objectiveId, currentUser.id);
    if (!newObjective) throw new ForbiddenError("Sem permissão para mover resultado-chave para este objetivo");
  }

  const updateData: any = { ...data };
  if (updateData.targetValue !== undefined) updateData.targetValue = String(updateData.targetValue);

  const keyResult = await storage.updateKeyResult(id, updateData);

  const objectiveId = keyResult.objectiveId || existing.objectiveId;
  if (objectiveId) {
    try {
      await recalcObjectiveCascade(objectiveId);
    } catch (err) {
      console.error("[KeyResultsService] Erro ao recalcular progresso do objetivo:", err);
    }
  }

  await recordActivity({
    userId: currentUser.id,
    action: "update",
    entityType: "key_result",
    entityId: id,
    before: existing,
    after: keyResult,
  });

  return keyResult;
}

/**
 * Remove um resultado-chave.
 */
export async function deleteKeyResult(currentUser: CurrentUser, id: number) {
  const existing = await storage.getKeyResult(id, currentUser.id);
  if (!existing) throw new NotFoundError("Resultado-chave não encontrado ou sem acesso");

  await storage.deleteKeyResult(id);

  await recordActivity({
    userId: currentUser.id,
    action: "delete",
    entityType: "key_result",
    entityId: id,
    before: existing,
  });
}
