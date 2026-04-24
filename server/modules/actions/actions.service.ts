/**
 * Serviço de Ações — lógica de negócio isolada das rotas HTTP.
 */
import { storage } from "../../storage";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../errors/app-error";
import { recordActivity } from "../../lib/audit-log";
import type { InsertAction } from "@shared/schema";

type CurrentUser = { id: number; role: string };

const FINAL_STATUSES = ["completed", "cancelled"] as const;

const STATUS_LABELS: Record<string, string> = {
  completed: "CONCLUÍDA",
  cancelled: "CANCELADA",
};

function formatDateBR(value: string | Date): string {
  const d = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

function assertActionWithinKR(
  keyResult: { startDate: string | Date; endDate: string | Date },
  dueDate: string | Date | null | undefined
) {
  if (!dueDate) return;
  const krStart = new Date(keyResult.startDate);
  const krEnd = new Date(keyResult.endDate);
  const due = new Date(dueDate);

  if (due < krStart || due > krEnd) {
    throw new BadRequestError(
      `A data de vencimento da ação deve estar dentro do período do resultado-chave (${formatDateBR(
        keyResult.startDate
      )} até ${formatDateBR(keyResult.endDate)})`
    );
  }
}

/**
 * Normaliza o body removendo campos nulos/vazios que devem virar undefined.
 */
export function cleanActionBody<T extends Record<string, any>>(body: T): T {
  const data: Record<string, any> = { ...body };
  if (data.responsibleId === null) data.responsibleId = undefined;
  if (data.dueDate === null || data.dueDate === "") data.dueDate = undefined;
  return data as T;
}

/**
 * Cria uma ação após verificar acesso ao KR pai.
 */
export async function createAction(currentUser: CurrentUser, data: InsertAction) {
  const keyResult = await storage.getKeyResult(data.keyResultId, currentUser.id);
  if (!keyResult) {
    throw new ForbiddenError("Sem permissão para criar ação neste resultado-chave");
  }

  assertActionWithinKR(keyResult, data.dueDate);

  const action = await storage.createAction(data);

  await recordActivity({
    userId: currentUser.id,
    action: "create",
    entityType: "action",
    entityId: action.id,
    after: action,
  });

  return action;
}

/**
 * Atualiza uma ação, exigindo comentário de conclusão ao mover para status final.
 * Persiste o comentário como registro em action_comments quando fornecido.
 */
export async function updateAction(
  currentUser: CurrentUser,
  id: number,
  data: Partial<InsertAction> & { completionComment?: string }
) {
  const existing = await storage.getAction(id, currentUser.id);
  if (!existing) throw new NotFoundError("Ação não encontrada ou sem acesso");

  if (data.dueDate !== undefined || data.keyResultId !== undefined) {
    const targetKrId = data.keyResultId ?? existing.keyResultId;
    const targetDueDate = data.dueDate ?? existing.dueDate;
    if (targetKrId && targetDueDate) {
      const parentKR = await storage.getKeyResult(targetKrId, currentUser.id);
      if (!parentKR) {
        throw new ForbiddenError("Sem permissão para vincular ação a este resultado-chave");
      }
      assertActionWithinKR(parentKR, targetDueDate);
    }
  }

  const currentIsFinal = FINAL_STATUSES.includes(existing.status as any);
  const newStatus = data.status as string | undefined;
  const newIsFinal = newStatus ? FINAL_STATUSES.includes(newStatus as any) : false;

  if (!currentIsFinal && newIsFinal && !data.completionComment?.trim()) {
    throw new BadRequestError(
      "Comentário de conclusão é obrigatório ao alterar para status final",
      { requiresCompletionComment: true }
    );
  }

  const { completionComment, ...updatePayload } = data;

  const updated = await storage.updateAction(id, updatePayload as Partial<InsertAction>);

  if (completionComment?.trim()) {
    const label = STATUS_LABELS[newStatus || ""] || newStatus?.toUpperCase() || "DESCONHECIDO";
    await storage.createActionComment({
      actionId: id,
      userId: currentUser.id,
      comment: `🏁 STATUS FINAL - ${label}: ${completionComment}`,
    });
  }

  await recordActivity({
    userId: currentUser.id,
    action: "update",
    entityType: "action",
    entityId: id,
    before: existing,
    after: updated,
  });

  return updated;
}

/**
 * Remove uma ação.
 */
export async function deleteAction(currentUser: CurrentUser, id: number) {
  const existing = await storage.getAction(id, currentUser.id);
  if (!existing) throw new NotFoundError("Ação não encontrada ou sem acesso");

  await storage.deleteAction(id);

  await recordActivity({
    userId: currentUser.id,
    action: "delete",
    entityType: "action",
    entityId: id,
    before: existing,
  });
}
