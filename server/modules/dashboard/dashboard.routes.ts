import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { intParam } from "../../lib/route-utils";

export const dashboardRouter: Router = Router();

dashboardRouter.use(requireAuth);

type DashboardKpiFilters = {
  regionId?: number;
  subRegionId?: number;
  quarter?: string;
  userRegionIds?: number[];
  userSubRegionIds?: number[];
};

dashboardRouter.get(
  "/kpis",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const currentUser = req.user;
    const filters: DashboardKpiFilters = {
      regionId: intParam(req.query.regionId),
      subRegionId: intParam(req.query.subRegionId),
      quarter: typeof req.query.quarter === "string" ? req.query.quarter : undefined,
    };

    if (currentUser.role !== "admin") {
      const userRegionIds = Array.isArray(currentUser.regionIds)
        ? (currentUser.regionIds as number[])
        : [];
      const userSubRegionIds = Array.isArray(currentUser.subRegionIds)
        ? (currentUser.subRegionIds as number[])
        : [];
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
