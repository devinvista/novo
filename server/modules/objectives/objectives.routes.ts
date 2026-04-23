import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { ForbiddenError, NotFoundError, ValidationError } from "../../errors/app-error";
import { insertObjectiveSchema } from "@shared/schema";
import { recordActivity } from "../../lib/audit-log";
import { canAccessAnySubRegion, canAccessRegion, isAdmin } from "../../lib/region-guard";

export const objectivesRouter: Router = Router();

objectivesRouter.use(requireAuth);

const intParam = (v: unknown) => (v !== undefined ? parseInt(String(v)) : undefined);

objectivesRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const limit = intParam(req.query.limit);
    const offset = intParam(req.query.offset);
    const filters = {
      regionId: intParam(req.query.regionId),
      subRegionId: intParam(req.query.subRegionId),
      serviceLineId: intParam(req.query.serviceLineId),
      ownerId: intParam(req.query.ownerId),
      currentUserId: req.user.id,
      ...(typeof limit === 'number' && limit > 0 ? { limit: Math.min(limit, 200) } : {}),
      ...(typeof offset === 'number' && offset >= 0 ? { offset } : {}),
    };
    res.json(await storage.getObjectives(filters));
  })
);

objectivesRouter.get(
  "/:id",
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const objective = await storage.getObjective(id, req.user.id);
    if (!objective) throw new NotFoundError("Objetivo não encontrado ou sem acesso");
    res.json(objective);
  })
);

/** Lista os objetivos filhos diretos (cascata pai/filho). */
objectivesRouter.get(
  "/:id/children",
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const parent = await storage.getObjective(id, req.user.id);
    if (!parent) throw new NotFoundError("Objetivo não encontrado ou sem acesso");
    const children = await storage.getObjectives({
      parentObjectiveId: id,
      currentUserId: req.user.id,
    });
    res.json(children);
  })
);

objectivesRouter.post(
  "/",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    let validation: any;
    try {
      validation = insertObjectiveSchema.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) throw new ValidationError("Dados inválidos", err.issues);
      throw err;
    }

    const currentUser = req.user;
    if (!isAdmin(currentUser)) {
      if (validation.regionId && !canAccessRegion(currentUser, validation.regionId)) {
        throw new ForbiddenError("Sem permissão para criar objetivo nesta região");
      }
      const subRegionIdsArr = Array.isArray(validation.subRegionIds)
        ? (validation.subRegionIds as number[])
        : [];
      if (subRegionIdsArr.length > 0 && !canAccessAnySubRegion(currentUser, subRegionIdsArr)) {
        throw new ForbiddenError("Sem permissão para criar objetivo nesta subregião");
      }
    }

    // Garante que o pai (se informado) existe e está acessível
    if (validation.parentObjectiveId) {
      const parent = await storage.getObjective(validation.parentObjectiveId, currentUser.id);
      if (!parent) throw new ForbiddenError("Objetivo pai não encontrado ou sem acesso");
    }

    let responsibleId = validation.ownerId;
    if (currentUser.role === "gestor") {
      responsibleId = currentUser.id;
    } else if (currentUser.role === "admin") {
      try {
        const managers = await storage.getManagers();
        const valSubRegionIds = Array.isArray(validation.subRegionIds)
          ? (validation.subRegionIds as number[])
          : [];
        if (valSubRegionIds.length > 0) {
          const subRegionManager = managers.find((manager: any) => {
            const mgrSubIds = Array.isArray(manager.subRegionIds)
              ? (manager.subRegionIds as number[])
              : [];
            return (
              mgrSubIds.length > 0 &&
              valSubRegionIds.some((subRegionId) => mgrSubIds.includes(subRegionId))
            );
          });
          if (subRegionManager) responsibleId = subRegionManager.id;
        }
        if (!responsibleId && validation.regionId) {
          const regionManager = managers.find((manager: any) => {
            const mgrRegIds = Array.isArray(manager.regionIds)
              ? (manager.regionIds as number[])
              : [];
            return mgrRegIds.includes(validation.regionId);
          });
          if (regionManager) responsibleId = regionManager.id;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Erro ao buscar gestores para definir responsável:", error);
        responsibleId = currentUser.id;
      }
    }

    const objective = await storage.createObjective({
      ...validation,
      ownerId: responsibleId,
    });

    await recordActivity({
      userId: currentUser.id,
      action: "create",
      entityType: "objective",
      entityId: objective.id,
      after: objective,
    });

    res.status(201).json(objective);
  })
);

objectivesRouter.put(
  "/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    let validation: any;
    try {
      validation = insertObjectiveSchema.partial().parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) throw new ValidationError("Dados inválidos", err.issues);
      throw err;
    }
    const existing = await storage.getObjective(id, req.user.id);
    if (!existing) throw new NotFoundError("Objetivo não encontrado ou sem acesso");

    // Previne ciclo na hierarquia
    if (validation.parentObjectiveId) {
      if (validation.parentObjectiveId === id) {
        throw new ValidationError("Um objetivo não pode ser pai de si mesmo");
      }
      const ancestors = await storage.objectives.getAncestorIds(validation.parentObjectiveId);
      if (ancestors.includes(id)) {
        throw new ValidationError("Hierarquia cíclica detectada");
      }
    }

    const updated = await storage.updateObjective(id, validation);
    await recordActivity({
      userId: req.user.id,
      action: "update",
      entityType: "objective",
      entityId: id,
      before: existing,
      after: updated,
    });
    res.json(updated);
  })
);

objectivesRouter.delete(
  "/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getObjective(id, req.user.id);
    if (!existing) throw new NotFoundError("Objetivo não encontrado ou sem acesso");
    await storage.deleteObjective(id);
    await recordActivity({
      userId: req.user.id,
      action: "delete",
      entityType: "objective",
      entityId: id,
      before: existing,
    });
    res.sendStatus(204);
  })
);
