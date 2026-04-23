import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";
import { intParam } from "../../lib/route-utils";
import * as CheckpointsService from "./checkpoints.service";

export const checkpointsRouter: Router = Router();

checkpointsRouter.use(requireAuth);

checkpointsRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    res.json(
      await CheckpointsService.listCheckpoints(req.user, intParam(req.query.keyResultId))
    );
  })
);

checkpointsRouter.get(
  "/:id",
  asyncHandler(async (req: any, res) => {
    res.json(await CheckpointsService.getCheckpoint(req.user, parseInt(req.params.id)));
  })
);

checkpointsRouter.post(
  "/:id/update",
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
  asyncHandler(async (req: any, res) => {
    await CheckpointsService.deleteCheckpoint(req.user, parseInt(req.params.id));
    res.sendStatus(204);
  })
);
