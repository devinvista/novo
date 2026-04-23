import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole } from "../../middleware/auth";
import { NotFoundError } from "../../errors/app-error";
import { insertKeyResultSchema } from "@shared/schema";
import { intParam } from "../../lib/route-utils";
import * as KRService from "./key-results.service";

export const keyResultsRouter: Router = Router();

keyResultsRouter.use(requireAuth);

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
      ...(typeof limit === "number" && limit > 0 ? { limit: Math.min(limit, 200) } : {}),
      ...(typeof offset === "number" && offset >= 0 ? { offset } : {}),
    };
    const keyResults = await storage.getKeyResults(filters);
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.json(KRService.formatKRsForResponse(keyResults));
  })
);

keyResultsRouter.post(
  "/",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const normalized = KRService.normalizeKRBody(req.body);
    const validated = insertKeyResultSchema.parse(normalized);
    const keyResult = await KRService.createKeyResult(req.user, validated);
    res.status(201).json(keyResult);
  })
);

keyResultsRouter.put(
  "/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const normalized = KRService.normalizeKRBody(req.body);
    const validated = insertKeyResultSchema.partial().parse(normalized);
    const keyResult = await KRService.updateKeyResult(req.user, parseInt(req.params.id), validated);
    res.json(keyResult);
  })
);

keyResultsRouter.delete(
  "/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    await KRService.deleteKeyResult(req.user, parseInt(req.params.id));
    res.sendStatus(204);
  })
);

keyResultsRouter.post(
  "/:id/recreate-checkpoints",
  asyncHandler(async (req: any, res) => {
    const keyResultId = parseInt(req.params.id);
    const keyResult = await storage.getKeyResult(keyResultId, req.user.id);
    if (!keyResult) throw new NotFoundError("Resultado-chave não encontrado ou sem acesso");
    res.json(await storage.generateCheckpoints(keyResultId));
  })
);
