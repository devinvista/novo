import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { ForbiddenError, NotFoundError, ValidationError } from "../../errors/app-error";
import { insertKeyResultSchema } from "@shared/schema";
import { convertBRToDatabase, formatBrazilianNumber } from "../../shared/formatters";
import { recordActivity } from "../../lib/audit-log";
import { recalcObjectiveCascade } from "../../domain/checkpoints/recalc";

export const keyResultsRouter: Router = Router();

keyResultsRouter.use(requireAuth);

const intParam = (v: unknown) => (v !== undefined ? parseInt(String(v)) : undefined);

function normalizeKRBody(body: any) {
  const requestData = { ...body };
  if (requestData.strategicIndicatorId && !requestData.strategicIndicatorIds) {
    requestData.strategicIndicatorIds = [requestData.strategicIndicatorId];
  }
  if (requestData.unit === null) requestData.unit = "";
  if (requestData.targetValue) {
    requestData.targetValue = convertBRToDatabase(requestData.targetValue).toString();
  }
  if (requestData.currentValue) {
    requestData.currentValue = convertBRToDatabase(requestData.currentValue).toString();
  }
  return requestData;
}

keyResultsRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const limit = intParam(req.query.limit);
    const offset = intParam(req.query.offset);
    const filters = {
      objectiveId: intParam(req.query.objectiveId),
      regionId: intParam(req.query.regionId),
      subRegionId: intParam(req.query.subRegionId),
      serviceLineId: intParam(req.query.serviceLineId),
      currentUserId: req.user.id,
      ...(typeof limit === 'number' && limit > 0 ? { limit: Math.min(limit, 200) } : {}),
      ...(typeof offset === 'number' && offset >= 0 ? { offset } : {}),
    };
    const keyResults = await storage.getKeyResults(filters);
    const keyResultsBR = keyResults.map((kr: any) => ({
      ...kr,
      currentValue: formatBrazilianNumber(kr.currentValue || "0"),
      targetValue: formatBrazilianNumber(kr.targetValue || "0"),
      progress:
        kr.progress !== null && kr.progress !== undefined
          ? parseFloat(kr.progress.toString())
          : 0,
    }));
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.json(keyResultsBR);
  })
);

keyResultsRouter.post(
  "/",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const requestData = normalizeKRBody(req.body);
    let validation: any;
    try {
      validation = insertKeyResultSchema.parse(requestData);
    } catch (err) {
      if (err instanceof z.ZodError) throw new ValidationError("Dados inválidos", err.issues);
      throw err;
    }

    const objective = await storage.getObjective(validation.objectiveId, req.user.id);
    if (!objective)
      throw new ForbiddenError("Sem permissão para criar resultado-chave neste objetivo");

    const startDate = new Date(validation.startDate);
    const endDate = new Date(validation.endDate);
    const today = new Date();
    let status = validation.status || "active";
    if (today < startDate) status = "pending";
    else if (today > endDate && 0 < parseFloat(validation.targetValue.toString())) status = "delayed";

    const keyResult = await storage.createKeyResult({
      ...validation,
      targetValue: validation.targetValue?.toString() || "0",
      startDate: validation.startDate,
      endDate: validation.endDate,
      status,
    });
    await recordActivity({
      userId: req.user.id,
      action: "create",
      entityType: "key_result",
      entityId: keyResult.id,
      after: keyResult,
    });
    res.status(201).json(keyResult);
  })
);

keyResultsRouter.put(
  "/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const requestData = normalizeKRBody(req.body);
    let validation: any;
    try {
      validation = insertKeyResultSchema.partial().parse(requestData);
    } catch (err) {
      if (err instanceof z.ZodError) throw new ValidationError("Dados inválidos", err.issues);
      throw err;
    }

    const existing = await storage.getKeyResult(id, req.user.id);
    if (!existing) throw new NotFoundError("Resultado-chave não encontrado ou sem acesso");

    if (validation.objectiveId && validation.objectiveId !== existing.objectiveId) {
      const newObjective = await storage.getObjective(validation.objectiveId, req.user.id);
      if (!newObjective)
        throw new ForbiddenError("Sem permissão para mover resultado-chave para este objetivo");
    }

    const updateData: any = { ...validation };
    if (updateData.targetValue !== undefined) {
      updateData.targetValue = updateData.targetValue.toString();
    }
    const keyResult = await storage.updateKeyResult(id, updateData);

    const objectiveId = keyResult.objectiveId || existing.objectiveId;
    if (objectiveId) {
      try {
        await recalcObjectiveCascade(objectiveId);
      } catch (objError) {
        // eslint-disable-next-line no-console
        console.error("Error updating objective progress from KR update:", objError);
      }
    }

    await recordActivity({
      userId: req.user.id,
      action: "update",
      entityType: "key_result",
      entityId: id,
      before: existing,
      after: keyResult,
    });

    res.json(keyResult);
  })
);

keyResultsRouter.delete(
  "/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getKeyResult(id, req.user.id);
    if (!existing) throw new NotFoundError("Resultado-chave não encontrado ou sem acesso");
    await storage.deleteKeyResult(id);
    await recordActivity({
      userId: req.user.id,
      action: "delete",
      entityType: "key_result",
      entityId: id,
      before: existing,
    });
    res.sendStatus(204);
  })
);

// /api/key-results/:id/recreate-checkpoints
keyResultsRouter.post(
  "/:id/recreate-checkpoints",
  asyncHandler(async (req: any, res) => {
    const keyResultId = parseInt(req.params.id);
    const keyResult = await storage.getKeyResult(keyResultId, req.user.id);
    if (!keyResult) throw new NotFoundError("Resultado-chave não encontrado ou sem acesso");
    res.json(await storage.generateCheckpoints(keyResultId));
  })
);
