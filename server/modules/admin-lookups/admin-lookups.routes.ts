import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as AdminLookupsService from "./admin-lookups.service";

export const adminLookupsRouter: Router = Router();

adminLookupsRouter.use(requireAuth, requireRole(["admin"]));

const idParam = z.object({ id: z.coerce.number().int().positive() });

const nameCode = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(255),
  code: z.string().trim().min(1, "Código é obrigatório").max(64),
  description: z.string().trim().optional(),
  unit: z.string().trim().optional(),
});

// ────────────── Strategic Indicators ──────────────
adminLookupsRouter.post(
  "/strategic-indicators",
  validate(nameCode),
  asyncHandler(async (req, res) => {
    res.json(await AdminLookupsService.createStrategicIndicator(req.body));
  })
);

adminLookupsRouter.put(
  "/strategic-indicators/:id",
  validate(idParam, "params"),
  validate(nameCode),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    res.json(await AdminLookupsService.updateStrategicIndicator(id, req.body));
  })
);

adminLookupsRouter.delete(
  "/strategic-indicators/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    await AdminLookupsService.deleteStrategicIndicator(id);
    res.json({ message: "Indicador estratégico excluído com sucesso" });
  })
);

// ────────────── Regions ──────────────
const regionSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  code: z.string().trim().min(1, "Código é obrigatório"),
});

adminLookupsRouter.post(
  "/regions",
  validate(regionSchema),
  asyncHandler(async (req, res) => {
    res.json(await AdminLookupsService.createRegion(req.body));
  })
);

adminLookupsRouter.put(
  "/regions/:id",
  validate(idParam, "params"),
  validate(regionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    res.json(await AdminLookupsService.updateRegion(id, req.body));
  })
);

adminLookupsRouter.delete(
  "/regions/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    await AdminLookupsService.deleteRegion(id);
    res.json({ message: "Região excluída com sucesso" });
  })
);

// ────────────── Sub-regions ──────────────
const subRegionSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  regionId: z.coerce.number().int().positive(),
});

adminLookupsRouter.post(
  "/sub-regions",
  validate(subRegionSchema),
  asyncHandler(async (req, res) => {
    res.json(await AdminLookupsService.createSubRegion(req.body));
  })
);

adminLookupsRouter.put(
  "/sub-regions/:id",
  validate(idParam, "params"),
  validate(subRegionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    res.json(await AdminLookupsService.updateSubRegion(id, req.body));
  })
);

adminLookupsRouter.delete(
  "/sub-regions/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    await AdminLookupsService.deleteSubRegion(id);
    res.json({ message: "Sub-região excluída com sucesso" });
  })
);

// ────────────── Solutions ──────────────
const solutionSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  code: z.string().trim().min(1, "Código é obrigatório"),
  description: z.string().trim().optional(),
});

adminLookupsRouter.post(
  "/solutions",
  validate(solutionSchema),
  asyncHandler(async (req, res) => {
    res.json(await AdminLookupsService.createSolution(req.body));
  })
);

adminLookupsRouter.put(
  "/solutions/:id",
  validate(idParam, "params"),
  validate(solutionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    res.json(await AdminLookupsService.updateSolution(id, req.body));
  })
);

adminLookupsRouter.delete(
  "/solutions/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    await AdminLookupsService.deleteSolution(id);
    res.json({ message: "Solução excluída com sucesso" });
  })
);

// ────────────── Service Lines ──────────────
const serviceLineSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  code: z.string().trim().min(1, "Código é obrigatório"),
  description: z.string().trim().optional(),
  solutionId: z.coerce.number().int().positive(),
});

adminLookupsRouter.post(
  "/service-lines",
  validate(serviceLineSchema),
  asyncHandler(async (req, res) => {
    res.json(await AdminLookupsService.createServiceLine(req.body));
  })
);

adminLookupsRouter.put(
  "/service-lines/:id",
  validate(idParam, "params"),
  validate(serviceLineSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    res.json(await AdminLookupsService.updateServiceLine(id, req.body));
  })
);

adminLookupsRouter.delete(
  "/service-lines/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    await AdminLookupsService.deleteServiceLine(id);
    res.json({ message: "Linha de serviço excluída com sucesso" });
  })
);

// ────────────── Services ──────────────
const serviceSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  code: z.string().trim().min(1, "Código é obrigatório"),
  description: z.string().trim().optional(),
  serviceLineId: z.coerce.number().int().positive(),
});

adminLookupsRouter.post(
  "/services",
  validate(serviceSchema),
  asyncHandler(async (req, res) => {
    res.json(await AdminLookupsService.createService(req.body));
  })
);

adminLookupsRouter.put(
  "/services/:id",
  validate(idParam, "params"),
  validate(serviceSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    res.json(await AdminLookupsService.updateService(id, req.body));
  })
);

adminLookupsRouter.delete(
  "/services/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    await AdminLookupsService.deleteService(id);
    res.json({ message: "Serviço excluído com sucesso" });
  })
);
