import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole } from "../../middleware/auth";
import { BadRequestError } from "../../errors/app-error";

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
    const indicator = await storage.createStrategicIndicator(req.body as any);
    res.json(indicator);
  })
);

adminLookupsRouter.put(
  "/strategic-indicators/:id",
  validate(idParam, "params"),
  validate(nameCode),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const indicator = await storage.updateStrategicIndicator(id, req.body as any);
    res.json(indicator);
  })
);

adminLookupsRouter.delete(
  "/strategic-indicators/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const keyResults = await storage.getKeyResults({});
    const isUsed = keyResults.some((kr: any) => {
      const indicators = Array.isArray(kr.strategicIndicatorIds)
        ? kr.strategicIndicatorIds
        : JSON.parse(kr.strategicIndicatorIds || "[]");
      return indicators.includes(id);
    });
    if (isUsed) {
      throw new BadRequestError(
        "Não é possível excluir indicador que está sendo usado em resultados-chave"
      );
    }
    await storage.deleteStrategicIndicator(id);
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
    const region = await storage.createRegion(req.body as any);
    res.json(region);
  })
);

adminLookupsRouter.put(
  "/regions/:id",
  validate(idParam, "params"),
  validate(regionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const region = await storage.updateRegion(id, req.body as any);
    res.json(region);
  })
);

adminLookupsRouter.delete(
  "/regions/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const [objectives, subRegions] = await Promise.all([
      storage.getObjectives({}),
      storage.getSubRegions(),
    ]);
    if (
      objectives.some((o: any) => o.regionId === id) ||
      subRegions.some((s: any) => s.regionId === id)
    ) {
      throw new BadRequestError(
        "Não é possível excluir região que possui objetivos ou sub-regiões associadas"
      );
    }
    await storage.deleteRegion(id);
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
    const sr = await storage.createSubRegion(req.body as any);
    res.json(sr);
  })
);

adminLookupsRouter.put(
  "/sub-regions/:id",
  validate(idParam, "params"),
  validate(subRegionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const sr = await storage.updateSubRegion(id, req.body as any);
    res.json(sr);
  })
);

adminLookupsRouter.delete(
  "/sub-regions/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const objectives = await storage.getObjectives({});
    if (objectives.some((o: any) => o.subRegionId === id)) {
      throw new BadRequestError(
        "Não é possível excluir sub-região que possui objetivos associados"
      );
    }
    await storage.deleteSubRegion(id);
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
    const solution = await storage.createSolution(req.body as any);
    res.json(solution);
  })
);

adminLookupsRouter.put(
  "/solutions/:id",
  validate(idParam, "params"),
  validate(solutionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const solution = await storage.updateSolution(id, req.body as any);
    res.json(solution);
  })
);

adminLookupsRouter.delete(
  "/solutions/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const serviceLines = await storage.getServiceLines();
    if (serviceLines.some((sl: any) => sl.solutionId === id)) {
      throw new BadRequestError(
        "Não é possível excluir solução que possui linhas de serviço associadas"
      );
    }
    await storage.deleteSolution(id);
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
    const sl = await storage.createServiceLine(req.body as any);
    res.json(sl);
  })
);

adminLookupsRouter.put(
  "/service-lines/:id",
  validate(idParam, "params"),
  validate(serviceLineSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const sl = await storage.updateServiceLine(id, req.body as any);
    res.json(sl);
  })
);

adminLookupsRouter.delete(
  "/service-lines/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const [services, objectives, keyResults] = await Promise.all([
      storage.getServices(),
      storage.getObjectives({}),
      storage.getKeyResults({}),
    ]);
    if (
      services.some((s: any) => s.serviceLineId === id) ||
      objectives.some((o: any) => o.serviceLineId === id) ||
      keyResults.some((kr: any) => kr.serviceLineId === id)
    ) {
      throw new BadRequestError(
        "Não é possível excluir linha de serviço que está sendo utilizada"
      );
    }
    await storage.deleteServiceLine(id);
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
    const svc = await storage.createService(req.body as any);
    res.json(svc);
  })
);

adminLookupsRouter.put(
  "/services/:id",
  validate(idParam, "params"),
  validate(serviceSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const svc = await storage.updateService(id, req.body as any);
    res.json(svc);
  })
);

adminLookupsRouter.delete(
  "/services/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    const keyResults = await storage.getKeyResults({});
    if (keyResults.some((kr: any) => kr.serviceId === id)) {
      throw new BadRequestError(
        "Não é possível excluir serviço que está sendo utilizado em resultados-chave"
      );
    }
    await storage.deleteService(id);
    res.json({ message: "Serviço excluído com sucesso" });
  })
);
