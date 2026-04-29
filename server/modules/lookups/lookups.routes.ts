import { Router } from "express";
import { storage } from "../../storage";
import { cached } from "../../cache";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { intParam } from "../../lib/route-utils";

export const lookupsRouter: Router = Router();

lookupsRouter.use(requireAuth);

type WithId = { id: number };
type SubRegion = WithId & { regionId: number };
type ServiceLine = WithId & { solutionId: number };
type Service = WithId & { serviceLineId: number };

lookupsRouter.get(
  "/solutions",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = req.user;
    let solutions = (await cached("solutions:all", () => storage.getSolutions())) as WithId[];

    if (user.role !== "admin") {
      const ids = Array.isArray(user.solutionIds) ? user.solutionIds : [];
      if (ids.length > 0) {
        solutions = solutions.filter((s) => ids.includes(s.id));
      }
    }
    res.json(solutions);
  })
);

lookupsRouter.get(
  "/regions",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = req.user;
    let regions = (await cached("regions:all", () => storage.getRegions())) as WithId[];

    if (user.role !== "admin") {
      const ids = Array.isArray(user.regionIds) ? user.regionIds : [];
      if (ids.length > 0) {
        regions = regions.filter((r) => ids.includes(r.id));
      }
    }
    res.json(regions);
  })
);

lookupsRouter.get(
  "/sub-regions",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = req.user;
    const regionId = intParam(req.query.regionId);
    let subRegions = (await cached(`sub-regions:${regionId ?? "all"}`, () =>
      storage.getSubRegions(regionId)
    )) as SubRegion[];

    if (user.role !== "admin") {
      const subIds = Array.isArray(user.subRegionIds) ? user.subRegionIds : [];
      const regIds = Array.isArray(user.regionIds) ? user.regionIds : [];
      if (subIds.length > 0) {
        subRegions = subRegions.filter((sr) => subIds.includes(sr.id));
      } else if (regIds.length > 0) {
        subRegions = subRegions.filter((sr) => regIds.includes(sr.regionId));
      }
    }
    res.json(subRegions);
  })
);

lookupsRouter.get(
  "/service-lines",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = req.user;
    const solutionId = intParam(req.query.solutionId);
    let serviceLines = (await cached(`service-lines:${solutionId ?? "all"}`, () =>
      storage.getServiceLines(solutionId)
    )) as ServiceLine[];

    if (user.role !== "admin") {
      const lineIds = Array.isArray(user.serviceLineIds) ? user.serviceLineIds : [];
      const solIds = Array.isArray(user.solutionIds) ? user.solutionIds : [];
      if (lineIds.length > 0) {
        serviceLines = serviceLines.filter((sl) => lineIds.includes(sl.id));
      } else if (solIds.length > 0) {
        serviceLines = serviceLines.filter((sl) => solIds.includes(sl.solutionId));
      }
    }
    res.json(serviceLines);
  })
);

lookupsRouter.get(
  "/services",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = req.user;
    const serviceLineId = intParam(req.query.serviceLineId);
    let services = (await cached(`services:${serviceLineId ?? "all"}`, () =>
      storage.getServices(serviceLineId)
    )) as Service[];

    if (user.role !== "admin") {
      const svcIds = Array.isArray(user.serviceIds) ? user.serviceIds : [];
      const lineIds = Array.isArray(user.serviceLineIds) ? user.serviceLineIds : [];
      if (svcIds.length > 0) {
        services = services.filter((s) => svcIds.includes(s.id));
      } else if (lineIds.length > 0) {
        services = services.filter((s) => lineIds.includes(s.serviceLineId));
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
