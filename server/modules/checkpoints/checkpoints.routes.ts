import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { intParam } from "../../lib/route-utils";
import * as CheckpointsService from "./checkpoints.service";

export const checkpointsRouter: Router = Router();

checkpointsRouter.use(requireAuth);

const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "id deve ser numérico"),
});

const checkpointStatusEnum = z.enum(["pending", "in_progress", "completed", "delayed"]);

const checkpointProgressPayloadSchema = z.object({
  actualValue: z.union([z.string(), z.number()]).optional(),
  status: checkpointStatusEnum.optional(),
});

const checkpointFullUpdatePayloadSchema = z.object({
  actualValue: z.union([z.string(), z.number()]),
  notes: z.string().max(2000).optional(),
  status: checkpointStatusEnum.optional(),
  completedDate: z.union([z.string(), z.date()]).nullable().optional(),
  completedAt: z.union([z.string(), z.date()]).nullable().optional(),
});

checkpointsRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    res.json(
      await CheckpointsService.listCheckpoints(req.user, intParam(req.query.keyResultId), {
        regionId: intParam(req.query.regionId),
        subRegionId: intParam(req.query.subRegionId),
      })
    );
  })
);

checkpointsRouter.get(
  "/:id",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req: any, res) => {
    res.json(await CheckpointsService.getCheckpoint(req.user, parseInt(req.params.id)));
  })
);

checkpointsRouter.post(
  "/:id/update",
  validate(idParamsSchema, "params"),
  validate(checkpointProgressPayloadSchema),
  asyncHandler(async (req: any, res) => {
    const result = await CheckpointsService.updateCheckpointProgress(
      req.user,
      parseInt(req.params.id),
      req.body
    );
    res.json(result);
  })
);

checkpointsRouter.put(
  "/:id",
  validate(idParamsSchema, "params"),
  validate(checkpointFullUpdatePayloadSchema),
  asyncHandler(async (req: any, res) => {
    const result = await CheckpointsService.updateCheckpoint(
      req.user,
      parseInt(req.params.id),
      req.body
    );
    res.json(result);
  })
);

checkpointsRouter.delete(
  "/:id",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req: any, res) => {
    await CheckpointsService.deleteCheckpoint(req.user, parseInt(req.params.id));
    res.sendStatus(204);
  })
);
