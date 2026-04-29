import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { intParam } from "../../lib/route-utils";

export const quartersRouter: Router = Router();

quartersRouter.use(requireAuth);

quartersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await storage.getAvailableQuarters());
  })
);

quartersRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.json(await storage.getQuarterlyStats());
  })
);

quartersRouter.get(
  "/:quarter/data",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const quarter = String(req.params.quarter);
    const currentUser = req.user;
    const filters = {
      regionId: intParam(req.query.regionId),
      subRegionId: intParam(req.query.subRegionId),
      serviceLineId: intParam(req.query.serviceLineId),
      currentUserId: currentUser.id,
    };
    res.json(await storage.getQuarterlyData(quarter, currentUser.id, filters));
  })
);
