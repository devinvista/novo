import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { NotFoundError } from "../../errors/app-error";
import { recordActivity } from "../../lib/audit-log";

export const trashRouter: Router = Router();

trashRouter.use(requireAuth);

/**
 * GET /api/trash — lista todos os itens com soft-delete.
 * Visível apenas para admin/gestor.
 */
trashRouter.get(
  "/",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const [objectives, keyResults, actions] = await Promise.all([
      storage.getObjectives({ onlyDeleted: true, currentUserId: req.user.id, limit: 200 }),
      storage.getKeyResults({ onlyDeleted: true, currentUserId: req.user.id, limit: 200 }),
      storage.getActions({ onlyDeleted: true, currentUserId: req.user.id, limit: 200 }),
    ]);
    res.json({ objectives, keyResults, actions });
  })
);

trashRouter.post(
  "/objectives/:id/restore",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    await storage.objectives.restoreObjective(id);
    await recordActivity({
      userId: req.user.id,
      action: "restore",
      entityType: "objective",
      entityId: id,
    });
    const restored = await storage.getObjective(id, req.user.id);
    if (!restored) throw new NotFoundError("Objetivo não encontrado após restauração");
    res.json(restored);
  })
);

trashRouter.post(
  "/key-results/:id/restore",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    await storage.keyResults.restoreKeyResult(id);
    await recordActivity({
      userId: req.user.id,
      action: "restore",
      entityType: "key_result",
      entityId: id,
    });
    res.json({ ok: true });
  })
);

trashRouter.post(
  "/actions/:id/restore",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    await storage.actions.restoreAction(id);
    await recordActivity({
      userId: req.user.id,
      action: "restore",
      entityType: "action",
      entityId: id,
    });
    res.json({ ok: true });
  })
);
