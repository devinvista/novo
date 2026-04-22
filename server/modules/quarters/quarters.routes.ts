import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";

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
  asyncHandler(async (req: any, res) => {
    const { quarter } = req.params;
    const currentUser = req.user;
    const filters = {
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      subRegionId: req.query.subRegionId ? parseInt(req.query.subRegionId as string) : undefined,
      serviceLineId: req.query.serviceLineId
        ? parseInt(req.query.serviceLineId as string)
        : undefined,
      currentUserId: currentUser.id,
    };
    res.json(await storage.getQuarterlyData(quarter, currentUser.id, filters));
  })
);
