import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole } from "../../middleware/auth";
import { insertObjectiveSchema } from "@shared/schema";
import { intParam } from "../../lib/route-utils";
import * as ObjectivesService from "./objectives.service";

export const objectivesRouter: Router = Router();

objectivesRouter.use(requireAuth);

objectivesRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const limit = intParam(req.query.limit);
    const offset = intParam(req.query.offset);
    const filters = {
      regionId: intParam(req.query.regionId),
      subRegionId: intParam(req.query.subRegionId),
      serviceLineId: intParam(req.query.serviceLineId),
      ownerId: intParam(req.query.ownerId),
      currentUserId: req.user.id,
      ...(typeof limit === "number" && limit > 0 ? { limit: Math.min(limit, 200) } : {}),
      ...(typeof offset === "number" && offset >= 0 ? { offset } : {}),
    };
    res.json(await storage.getObjectives(filters));
  })
);

objectivesRouter.get(
  "/:id",
  asyncHandler(async (req: any, res) => {
    res.json(await ObjectivesService.getObjective(req.user, parseInt(req.params.id)));
  })
);

/** Lista os objetivos filhos diretos (cascata pai/filho). */
objectivesRouter.get(
  "/:id/children",
  asyncHandler(async (req: any, res) => {
    res.json(await ObjectivesService.getObjectiveChildren(req.user, parseInt(req.params.id)));
  })
);

objectivesRouter.post(
  "/",
  requireRole(["admin", "gestor"]),
  validate(insertObjectiveSchema),
  asyncHandler(async (req: any, res) => {
    const objective = await ObjectivesService.createObjective(req.user, req.body);
    res.status(201).json(objective);
  })
);

objectivesRouter.put(
  "/:id",
  requireRole(["admin", "gestor"]),
  validate(insertObjectiveSchema.partial()),
  asyncHandler(async (req: any, res) => {
    const updated = await ObjectivesService.updateObjective(
      req.user,
      parseInt(req.params.id),
      req.body
    );
    res.json(updated);
  })
);

objectivesRouter.delete(
  "/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    await ObjectivesService.deleteObjective(req.user, parseInt(req.params.id));
    res.sendStatus(204);
  })
);
