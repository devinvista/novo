import { Router } from "express";
import { storage } from "../../storage";
import { cached } from "../../cache";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";

export const lookupsRouter: Router = Router();

lookupsRouter.use(requireAuth);

lookupsRouter.get(
  "/solutions",
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    let solutions = await cached("solutions:all", () => storage.getSolutions());

    if (user && user.role !== "admin") {
      const ids = Array.isArray(user.solutionIds) ? user.solutionIds : [];
      if (ids.length > 0) {
        solutions = solutions.filter((s: any) => ids.includes(s.id));
      }
    }
    res.json(solutions);
  })
);

lookupsRouter.get(
  "/regions",
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    let regions = await cached("regions:all", () => storage.getRegions());

    if (user && user.role !== "admin") {
      const ids = Array.isArray(user.regionIds) ? user.regionIds : [];
      if (ids.length > 0) {
        regions = regions.filter((r: any) => ids.includes(r.id));
      }
    }
    res.json(regions);
  })
);

lookupsRouter.get(
  "/sub-regions",
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
    let subRegions = await cached(`sub-regions:${regionId ?? "all"}`, () =>
      storage.getSubRegions(regionId)
    );

    if (user && user.role !== "admin") {
      const subIds = Array.isArray(user.subRegionIds) ? user.subRegionIds : [];
      const regIds = Array.isArray(user.regionIds) ? user.regionIds : [];
      if (subIds.length > 0) {
        subRegions = subRegions.filter((sr: any) => subIds.includes(sr.id));
      } else if (regIds.length > 0) {
        subRegions = subRegions.filter((sr: any) => regIds.includes(sr.regionId));
      }
    }
    res.json(subRegions);
  })
);

lookupsRouter.get(
  "/service-lines",
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    const solutionId = req.query.solutionId ? parseInt(req.query.solutionId as string) : undefined;
    let serviceLines = await cached(`service-lines:${solutionId ?? "all"}`, () =>
      storage.getServiceLines(solutionId)
    );

    if (user && user.role !== "admin") {
      const lineIds = Array.isArray(user.serviceLineIds) ? user.serviceLineIds : [];
      const solIds = Array.isArray(user.solutionIds) ? user.solutionIds : [];
      if (lineIds.length > 0) {
        serviceLines = serviceLines.filter((sl: any) => lineIds.includes(sl.id));
      } else if (solIds.length > 0) {
        serviceLines = serviceLines.filter((sl: any) => solIds.includes(sl.solutionId));
      }
    }
    res.json(serviceLines);
  })
);

lookupsRouter.get(
  "/services",
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    const serviceLineId = req.query.serviceLineId
      ? parseInt(req.query.serviceLineId as string)
      : undefined;
    let services = await cached(`services:${serviceLineId ?? "all"}`, () =>
      storage.getServices(serviceLineId)
    );

    if (user && user.role !== "admin") {
      const svcIds = Array.isArray(user.serviceIds) ? user.serviceIds : [];
      const lineIds = Array.isArray(user.serviceLineIds) ? user.serviceLineIds : [];
      if (svcIds.length > 0) {
        services = services.filter((s: any) => svcIds.includes(s.id));
      } else if (lineIds.length > 0) {
        services = services.filter((s: any) => lineIds.includes(s.serviceLineId));
      }
    }
    res.json(services);
  })
);

lookupsRouter.get(
  "/strategic-indicators",
  asyncHandler(async (_req, res) => {
    const indicators = await cached("strategic-indicators:all", () =>
      storage.getStrategicIndicators()
    );
    res.json(indicators);
  })
);
