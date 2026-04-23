/**
 * Serviço de Usuários — encapsula regras de escopo, aprovação e hierarquia gestor/operacional.
 */
import { storage } from "../../storage";
import { hashPassword } from "../../auth";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../errors/app-error";
import { sanitizeUser, sanitizeUsers } from "../../middleware/auth";
import type { InsertUser } from "@shared/schema";

type CurrentUser = {
  id: number;
  role: string;
  regionIds?: number[];
  subRegionIds?: number[];
  solutionIds?: number[];
  serviceLineIds?: number[];
  serviceIds?: number[];
};

type ScopeField = "solutionIds" | "serviceLineIds" | "serviceIds";

/**
 * Valida se um gestor só atribui ids dentro do próprio escopo.
 * Admins bypassam esta checagem.
 */
export function assertGestorScope(currentUser: CurrentUser, userData: Record<string, any>) {
  const cur: Record<ScopeField, number[]> = {
    solutionIds: Array.isArray(currentUser.solutionIds) ? currentUser.solutionIds : [],
    serviceLineIds: Array.isArray(currentUser.serviceLineIds) ? currentUser.serviceLineIds : [],
    serviceIds: Array.isArray(currentUser.serviceIds) ? currentUser.serviceIds : [],
  };

  const check = (field: ScopeField, msg: string) => {
    const incoming = userData[field];
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    if (cur[field].length === 0) return;
    const invalid = incoming.filter((id: number) => !cur[field].includes(id));
    if (invalid.length > 0) throw new ForbiddenError(msg);
  };

  check("solutionIds", "Você não tem permissão para atribuir estas soluções ao usuário");
  check("serviceLineIds", "Você não tem permissão para atribuir estas linhas de serviço ao usuário");
  check("serviceIds", "Você não tem permissão para atribuir estes serviços ao usuário");
}

/**
 * Lista usuários visíveis para o usuário atual, respeitando o papel.
 */
export async function listVisibleUsers(currentUser: CurrentUser) {
  let users = await storage.getUsers();

  if (currentUser.role === "gestor") {
    users = users.filter(
      (u: any) =>
        u.id === currentUser.id ||
        (u.role === "operacional" && u.gestorId === currentUser.id)
    );
  } else if (currentUser.role !== "admin") {
    users = users.filter((u: any) => u.id === currentUser.id);
  }

  return sanitizeUsers(users);
}

/**
 * Cria um novo usuário, aplicando restrições de papel/escopo do gestor.
 */
export async function createUser(currentUser: CurrentUser, userData: InsertUser & Record<string, any>) {
  if (currentUser.role === "gestor" && userData.role !== "operacional") {
    throw new ForbiddenError("Gestores só podem criar usuários operacionais");
  }

  if (currentUser.role === "gestor") {
    assertGestorScope(currentUser, userData);
    if (userData.role === "operacional") {
      userData.gestorId = currentUser.id;
    }
  }

  userData.password = await hashPassword(userData.password as string);
  userData.approved = true;

  const user = await storage.createUser(userData);
  return sanitizeUser(user);
}

/**
 * Atualiza um usuário existente aplicando restrições de gestor e hash de senha opcional.
 */
export async function updateUser(
  currentUser: CurrentUser,
  id: number,
  userData: Record<string, any>
) {
  const targetUser = await storage.getUser(id);
  if (!targetUser) throw new NotFoundError("Usuário não encontrado");

  if (currentUser.role === "gestor") {
    if (targetUser.role !== "operacional" || (targetUser as any).gestorId !== currentUser.id) {
      throw new ForbiddenError("Sem permissão para editar este usuário");
    }
    assertGestorScope(currentUser, userData);
  }

  if (userData.password && String(userData.password).trim() !== "") {
    userData.password = await hashPassword(userData.password);
  } else {
    delete userData.password;
  }

  const user = await storage.updateUser(id, userData);
  return sanitizeUser(user);
}

/**
 * Remove um usuário, impedindo auto-exclusão e exclusão fora do escopo do gestor.
 */
export async function deleteUser(currentUser: CurrentUser, id: number) {
  if (id === currentUser.id) {
    throw new ValidationError("Não é possível excluir seu próprio usuário");
  }

  const targetUser = await storage.getUser(id);
  if (!targetUser) throw new NotFoundError("Usuário não encontrado");

  if (currentUser.role === "gestor" && targetUser.role !== "operacional") {
    throw new ForbiddenError("Sem permissão para excluir este usuário");
  }

  await storage.deleteUser(id);
}

/**
 * Altera o status ativo/inativo de um usuário.
 */
export async function setUserActive(currentUser: CurrentUser, id: number, active: boolean) {
  const targetUser = await storage.getUser(id);
  if (!targetUser) throw new NotFoundError("Usuário não encontrado");

  if (currentUser.role === "gestor" && targetUser.role !== "operacional") {
    throw new ForbiddenError("Sem permissão para alterar status deste usuário");
  }

  const user = await storage.updateUser(id, { active });
  return sanitizeUser(user);
}

type ApprovePayload = {
  id: number;
  regionIds?: number[];
  subRegionIds?: number[];
  solutionIds?: number[];
  serviceLineIds?: number[];
  serviceIds?: number[];
};

/**
 * Aprova um usuário herdando/filtrando permissões a partir do gestor vinculado.
 */
export async function approveUser(currentUser: CurrentUser, payload: ApprovePayload) {
  const targetUser = await storage.getUser(payload.id);
  if (!targetUser) throw new NotFoundError("Usuário não encontrado");

  if (currentUser.role === "gestor") {
    if (targetUser.role !== "operacional") {
      throw new ForbiddenError("Gestores só podem aprovar usuários operacionais");
    }
    if ((targetUser as any).gestorId !== currentUser.id) {
      throw new ForbiddenError("Só é possível aprovar usuários vinculados a você");
    }
  }

  const gestor = (targetUser as any).gestorId
    ? await storage.getUserById((targetUser as any).gestorId)
    : null;

  let finalPermissions = {
    regionIds: payload.regionIds || [],
    subRegionIds: payload.subRegionIds || [],
    solutionIds: payload.solutionIds || [],
    serviceLineIds: payload.serviceLineIds || [],
    serviceIds: payload.serviceIds || [],
  };

  if (gestor) {
    const inheritOrFilter = (incoming: number[], gestorScope: number[] | undefined): number[] => {
      const scope = (gestorScope as number[]) || [];
      return incoming.length > 0 ? incoming.filter((id) => scope.includes(id)) : scope;
    };

    finalPermissions = {
      regionIds: inheritOrFilter(finalPermissions.regionIds, (gestor as any).regionIds),
      subRegionIds: inheritOrFilter(finalPermissions.subRegionIds, (gestor as any).subRegionIds),
      solutionIds: inheritOrFilter(finalPermissions.solutionIds, (gestor as any).solutionIds),
      serviceLineIds: inheritOrFilter(
        finalPermissions.serviceLineIds,
        (gestor as any).serviceLineIds
      ),
      serviceIds: inheritOrFilter(finalPermissions.serviceIds, (gestor as any).serviceIds),
    };
  }

  const user = await storage.approveUserWithPermissions(
    payload.id,
    currentUser.id,
    finalPermissions
  );
  return sanitizeUser(user);
}
