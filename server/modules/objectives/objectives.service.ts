/**
 * Serviço de Objetivos — contém toda a lógica de negócio.
 * As rotas ficam finas (validação → serviço → resposta HTTP).
 */
import { storage } from "../../storage";
import { ForbiddenError, NotFoundError, ValidationError } from "../../errors/app-error";
import { recordActivity } from "../../lib/audit-log";
import { canAccessAnySubRegion, canAccessRegion, isAdmin } from "../../lib/region-guard";
import type { InsertObjective } from "@shared/schema";

type CurrentUser = {
  id: number;
  role: string;
  regionIds?: number[];
  subRegionIds?: number[];
};

/**
 * Resolve o responsável (ownerId) com base no papel do usuário atual.
 * - gestor: sempre o próprio usuário
 * - admin: busca o gestor responsável pela região/sub-região
 * - operacional: usa o valor enviado no payload (ou nenhum)
 */
async function resolveOwnerId(
  currentUser: CurrentUser,
  validatedData: Partial<InsertObjective>
): Promise<number | undefined> {
  if (currentUser.role === "gestor") return currentUser.id;

  if (currentUser.role === "admin") {
    try {
      const managers = await storage.getManagers();
      const subRegionIds = Array.isArray(validatedData.subRegionIds)
        ? (validatedData.subRegionIds as number[])
        : [];

      if (subRegionIds.length > 0) {
        const bySubRegion = managers.find((m: any) => {
          const mgrSubs: number[] = Array.isArray(m.subRegionIds) ? m.subRegionIds : [];
          return mgrSubs.length > 0 && subRegionIds.some((id) => mgrSubs.includes(id));
        });
        if (bySubRegion) return bySubRegion.id;
      }

      if (validatedData.regionId) {
        const byRegion = managers.find((m: any) => {
          const mgrRegions: number[] = Array.isArray(m.regionIds) ? m.regionIds : [];
          return mgrRegions.includes(validatedData.regionId!);
        });
        if (byRegion) return byRegion.id;
      }
    } catch (err) {
      console.error("[ObjectivesService] Erro ao buscar gestores:", err);
    }
    return validatedData.ownerId ?? currentUser.id;
  }

  return validatedData.ownerId;
}

/**
 * Valida permissões de escopo regional para criação de objetivos.
 */
function assertScopePermissions(
  currentUser: CurrentUser,
  validatedData: Partial<InsertObjective>
): void {
  if (isAdmin(currentUser)) return;

  if (validatedData.regionId && !canAccessRegion(currentUser, validatedData.regionId)) {
    throw new ForbiddenError("Sem permissão para criar objetivo nesta região");
  }

  const subRegionIds = Array.isArray(validatedData.subRegionIds)
    ? (validatedData.subRegionIds as number[])
    : [];

  if (subRegionIds.length > 0 && !canAccessAnySubRegion(currentUser, subRegionIds)) {
    throw new ForbiddenError("Sem permissão para criar objetivo nesta subregião");
  }
}

/**
 * Cria um novo objetivo após validar permissões e resolver o responsável.
 */
export async function createObjective(
  currentUser: CurrentUser,
  data: InsertObjective
) {
  assertScopePermissions(currentUser, data);

  if (data.parentObjectiveId) {
    const parent = await storage.getObjective(data.parentObjectiveId, currentUser.id);
    if (!parent) throw new ForbiddenError("Objetivo pai não encontrado ou sem acesso");
  }

  const resolvedOwnerId = await resolveOwnerId(currentUser, data);
  const objective = await storage.createObjective({
    ...data,
    ...(resolvedOwnerId !== undefined ? { ownerId: resolvedOwnerId } : {}),
  } as InsertObjective);

  await recordActivity({
    userId: currentUser.id,
    action: "create",
    entityType: "objective",
    entityId: objective.id,
    after: objective,
  });

  return objective;
}

/**
 * Atualiza um objetivo existente com detecção de ciclo hierárquico.
 */
export async function updateObjective(
  currentUser: CurrentUser,
  id: number,
  data: Partial<InsertObjective>
) {
  const existing = await storage.getObjective(id, currentUser.id);
  if (!existing) throw new NotFoundError("Objetivo não encontrado ou sem acesso");

  if (data.parentObjectiveId) {
    const parentId = data.parentObjectiveId;
    if (parentId === id) {
      throw new ValidationError("Um objetivo não pode ser pai de si mesmo");
    }
    const ancestors = await storage.objectives.getAncestorIds(parentId);
    if (ancestors.includes(id)) {
      throw new ValidationError("Hierarquia cíclica detectada");
    }
  }

  const updated = await storage.updateObjective(id, data);

  await recordActivity({
    userId: currentUser.id,
    action: "update",
    entityType: "objective",
    entityId: id,
    before: existing,
    after: updated,
  });

  return updated;
}

/**
 * Remove um objetivo existente.
 */
export async function deleteObjective(currentUser: CurrentUser, id: number) {
  const existing = await storage.getObjective(id, currentUser.id);
  if (!existing) throw new NotFoundError("Objetivo não encontrado ou sem acesso");

  await storage.deleteObjective(id);

  await recordActivity({
    userId: currentUser.id,
    action: "delete",
    entityType: "objective",
    entityId: id,
    before: existing,
  });
}

/**
 * Busca um objetivo verificando acesso do usuário.
 */
export async function getObjective(currentUser: CurrentUser, id: number) {
  const objective = await storage.getObjective(id, currentUser.id);
  if (!objective) throw new NotFoundError("Objetivo não encontrado ou sem acesso");
  return objective;
}

/**
 * Lista objetivos filhos de um objetivo pai.
 */
export async function getObjectiveChildren(currentUser: CurrentUser, parentId: number) {
  const parent = await storage.getObjective(parentId, currentUser.id);
  if (!parent) throw new NotFoundError("Objetivo não encontrado ou sem acesso");
  return storage.getObjectives({ parentObjectiveId: parentId, currentUserId: currentUser.id });
}
