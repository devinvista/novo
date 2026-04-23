import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";
import { BadRequestError, ForbiddenError, NotFoundError, ValidationError } from "../../errors/app-error";
import { insertActionSchema } from "@shared/schema";
import { recordActivity } from "../../lib/audit-log";

export const actionsRouter: Router = Router();

actionsRouter.use(requireAuth);

const intParam = (v: unknown) => (v !== undefined ? parseInt(String(v)) : undefined);

function cleanActionBody(body: any) {
  const requestData = { ...body };
  if (requestData.responsibleId === null) requestData.responsibleId = undefined;
  if (requestData.dueDate === null || requestData.dueDate === "") requestData.dueDate = undefined;
  return requestData;
}

actionsRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const limit = intParam(req.query.limit);
    const offset = intParam(req.query.offset);
    const actions = await storage.getActions({
      keyResultId: intParam(req.query.keyResultId),
      currentUserId: req.user?.id,
      ...(typeof limit === 'number' && limit > 0 ? { limit: Math.min(limit, 200) } : {}),
      ...(typeof offset === 'number' && offset >= 0 ? { offset } : {}),
    });
    res.json(actions);
  })
);

actionsRouter.post(
  "/",
  asyncHandler(async (req: any, res) => {
    const requestData = cleanActionBody(req.body);
    let validation: any;
    try {
      validation = insertActionSchema.parse(requestData);
    } catch (err) {
      if (err instanceof z.ZodError) throw new ValidationError("Dados inválidos", err.issues);
      throw err;
    }
    const keyResult = await storage.getKeyResult(validation.keyResultId, req.user.id);
    if (!keyResult) throw new ForbiddenError("Sem permissão para criar ação neste resultado-chave");
    const action = await storage.createAction(validation);
    await recordActivity({
      userId: req.user.id,
      action: "create",
      entityType: "action",
      entityId: action.id,
      after: action,
    });
    res.status(201).json(action);
  })
);

actionsRouter.put(
  "/:id",
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getAction(id, req.user.id);
    if (!existing) throw new NotFoundError("Ação não encontrada ou sem acesso");

    const requestData = cleanActionBody(req.body);

    const finalStatuses = ["completed", "cancelled"];
    const currentIsFinal = finalStatuses.includes(existing.status);
    const newIsFinal = requestData.status && finalStatuses.includes(requestData.status);

    if (!currentIsFinal && newIsFinal && !requestData.completionComment?.trim()) {
      throw new BadRequestError(
        "Comentário de conclusão é obrigatório ao alterar para status final",
        { requiresCompletionComment: true }
      );
    }

    let validation: any;
    try {
      validation = insertActionSchema.partial().parse(requestData);
    } catch (err) {
      if (err instanceof z.ZodError) throw new ValidationError("Dados inválidos", err.issues);
      throw err;
    }

    const updatedAction = await storage.updateAction(id, validation);

    if (requestData.completionComment?.trim()) {
      const statusLabels: Record<string, string> = {
        completed: "CONCLUÍDA",
        cancelled: "CANCELADA",
      };
      const statusLabel =
        statusLabels[requestData.status as string] ||
        requestData.status?.toUpperCase() ||
        "DESCONHECIDO";
      await storage.createActionComment({
        actionId: id,
        userId: req.user.id,
        comment: `🏁 STATUS FINAL - ${statusLabel}: ${requestData.completionComment}`,
      });
    }

    await recordActivity({
      userId: req.user.id,
      action: "update",
      entityType: "action",
      entityId: id,
      before: existing,
      after: updatedAction,
    });

    res.json(updatedAction);
  })
);

actionsRouter.delete(
  "/:id",
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getAction(id, req.user.id);
    if (!existing) throw new NotFoundError("Ação não encontrada ou sem acesso");
    await storage.deleteAction(id);
    await recordActivity({
      userId: req.user.id,
      action: "delete",
      entityType: "action",
      entityId: id,
      before: existing,
    });
    res.sendStatus(204);
  })
);
