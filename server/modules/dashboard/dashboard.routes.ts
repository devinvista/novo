import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";

export const dashboardRouter: Router = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/kpis",
  asyncHandler(async (req: any, res) => {
    const currentUser = req.user;
    const filters: any = {
      regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
      subRegionId: req.query.subRegionId ? parseInt(req.query.subRegionId as string) : undefined,
      quarter: (req.query.quarter as string) || undefined,
    };

    if (currentUser.role !== "admin") {
      const userRegionIds = currentUser.regionIds || [];
      const userSubRegionIds = currentUser.subRegionIds || [];
      if (userRegionIds.length > 0 && !filters.regionId) {
        filters.userRegionIds = userRegionIds;
      }
      if (userSubRegionIds.length > 0 && !filters.subRegionId) {
        filters.userSubRegionIds = userSubRegionIds;
      }
    }

    res.json(await storage.getDashboardKPIs(currentUser.id, filters));
  })
);
