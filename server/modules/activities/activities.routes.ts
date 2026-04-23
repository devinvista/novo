import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";

export const activitiesRouter: Router = Router();

activitiesRouter.use(requireAuth);

const intParam = (v: unknown) => (v !== undefined ? parseInt(String(v)) : undefined);

/**
 * GET /api/activities — log de atividades (audit trail).
 * Suporta filtros por entityType, entityId, userId, com paginação.
 */
activitiesRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const items = await storage.activities.list({
      entityType: req.query.entityType ? String(req.query.entityType) : undefined,
      entityId: intParam(req.query.entityId),
      userId: intParam(req.query.userId),
      action: req.query.action ? String(req.query.action) : undefined,
      limit: intParam(req.query.limit),
      offset: intParam(req.query.offset),
    });
    const parsed = items.map((row: any) => {
      let details: any = null;
      if (row.details) {
        try { details = JSON.parse(row.details); } catch { details = row.details; }
      }
      return { ...row, details };
    });
    res.json(parsed);
  })
);
