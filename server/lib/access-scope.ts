/**
 * Calcula o escopo de acesso efetivo de um usuário.
 *
 * Regras de visibilidade:
 *
 * 1. Admin (role === "admin") => acesso global a tudo.
 *
 * 2. Escopo regional (regionIds / subRegionIds): se algum estiver definido,
 *    o usuário só vê dados das regiões/sub-regiões correspondentes.
 *    - subRegionIds atua como filtro adicional sobre objetivos com sub-regiões
 *      explicitamente atribuídas (objetivos sem sub-região continuam visíveis
 *      desde que a região seja permitida).
 *
 * 3. Escopo de produto (solutionIds / serviceLineIds / serviceIds): se algum
 *    estiver definido, o usuário só vê dados ligados ao produto:
 *    - effectiveServiceLineIds:
 *        * se serviceLineIds próprios não estiverem vazios, usa-os como
 *          REFINAMENTO explícito dentro das soluções (NÃO faz união);
 *        * caso contrário, e havendo solutionIds, deriva todas as linhas de
 *          serviço daquelas soluções (acesso a toda a solução).
 *    - serviceIds = serviceIds explicitamente atribuídos
 *    - Um KR/Ação é visível quando casa por serviceId, serviceLineId
 *      (singular ou na lista json) ou — para ações — quando o KR pai é visível.
 *    - Um Objetivo é visível quando o seu serviceLineId casa OU quando ele
 *      possui ao menos um KR visível pelas regras acima.
 *
 * Quando o usuário NÃO tem nenhum escopo (regional nem de produto) e não é
 * admin, mantemos a semântica legada de acesso global — assim usuários
 * "operacionais" sem nenhuma restrição continuam vendo tudo.
 */

import { inArray } from "drizzle-orm";
import { serviceLines } from "@shared/schema";
import { db } from "../pg-db";
import {
  hasGlobalAccess,
  hasGlobalProductAccess,
  hasProductScope,
  isAdmin,
  userRegionIds,
  userServiceIds,
  userServiceLineIds,
  userSolutionIds,
  userSubRegionIds,
} from "./region-guard";
import type { UserRepo } from "../repositories/user.repo";
import type { User } from "@shared/schema";

export interface AccessScope {
  user: User;
  isAdmin: boolean;
  /** True quando o usuário tem acesso global (admin ou sem qualquer restrição). */
  hasGlobalAccess: boolean;
  /** True quando o usuário tem qualquer escopo de produto definido. */
  hasProductScope: boolean;
  regionIds: number[];
  subRegionIds: number[];
  /** Linhas de serviço (próprias + derivadas de soluções). Vazio = sem restrição. */
  effectiveServiceLineIds: number[];
  /** Serviços explicitamente atribuídos. Vazio = sem restrição. */
  serviceIds: number[];
  /** Soluções explicitamente atribuídas (apenas informativo). */
  solutionIds: number[];
}

const scopeCache = new Map<number, { scope: AccessScope; ts: number }>();
const SCOPE_TTL_MS = 5_000;

/**
 * Constrói (com cache curto) o escopo de acesso efetivo do usuário.
 * Retorna null se o usuário não existir.
 */
export async function buildAccessScope(
  userId: number | undefined,
  userRepo: UserRepo
): Promise<AccessScope | null> {
  if (!userId) return null;

  const cached = scopeCache.get(userId);
  if (cached && Date.now() - cached.ts < SCOPE_TTL_MS) {
    return cached.scope;
  }

  const user = await userRepo.getUser(userId);
  if (!user) return null;

  const sols = userSolutionIds(user);
  const directLines = userServiceLineIds(user);

  // serviceLineIds explícitos refinam as soluções; quando não houver, derivamos
  // todas as linhas de serviço das soluções atribuídas.
  let effectiveLines: number[];
  if (directLines.length > 0) {
    effectiveLines = Array.from(new Set(directLines));
  } else if (sols.length > 0) {
    const rows = await db
      .select({ id: serviceLines.id })
      .from(serviceLines)
      .where(inArray(serviceLines.solutionId, sols));
    effectiveLines = Array.from(new Set(rows.map((r) => r.id)));
  } else {
    effectiveLines = [];
  }

  const scope: AccessScope = {
    user,
    isAdmin: isAdmin(user),
    hasGlobalAccess: hasGlobalAccess(user),
    hasProductScope: hasProductScope(user),
    regionIds: userRegionIds(user),
    subRegionIds: userSubRegionIds(user),
    effectiveServiceLineIds: effectiveLines,
    serviceIds: userServiceIds(user),
    solutionIds: sols,
  };

  scopeCache.set(userId, { scope, ts: Date.now() });
  return scope;
}

/** Invalida o cache de escopo (use quando o perfil de um usuário é atualizado). */
export function invalidateAccessScope(userId?: number): void {
  if (userId == null) scopeCache.clear();
  else scopeCache.delete(userId);
}

/**
 * Retorna true se um KR é compatível com o escopo de produto.
 * Quando o usuário não tem escopo de produto, devolve sempre true.
 */
export function keyResultMatchesProductScope(
  scope: AccessScope,
  kr: {
    serviceLineId?: number | null;
    serviceLineIds?: unknown;
    serviceId?: number | null;
  }
): boolean {
  if (scope.isAdmin) return true;
  if (!scope.hasProductScope) return true;

  const slIds = scope.effectiveServiceLineIds;
  const svcIds = scope.serviceIds;

  if (svcIds.length > 0 && kr.serviceId != null && svcIds.includes(kr.serviceId)) {
    return true;
  }
  if (slIds.length > 0) {
    if (kr.serviceLineId != null && slIds.includes(kr.serviceLineId)) return true;
    const list = Array.isArray(kr.serviceLineIds)
      ? (kr.serviceLineIds as unknown[])
          .map((v) => (typeof v === "number" ? v : Number(v)))
          .filter((v) => Number.isFinite(v))
      : [];
    if (list.some((id) => slIds.includes(id))) return true;
  }
  return false;
}

/**
 * Retorna true se uma ação é compatível com o escopo de produto.
 * (Idêntico ao KR, mas considerando os campos da ação.)
 */
export function actionMatchesProductScope(
  scope: AccessScope,
  action: { serviceLineId?: number | null; serviceId?: number | null }
): boolean {
  if (scope.isAdmin) return true;
  if (!scope.hasProductScope) return true;

  const slIds = scope.effectiveServiceLineIds;
  const svcIds = scope.serviceIds;

  if (svcIds.length > 0 && action.serviceId != null && svcIds.includes(action.serviceId)) {
    return true;
  }
  if (slIds.length > 0 && action.serviceLineId != null && slIds.includes(action.serviceLineId)) {
    return true;
  }
  return false;
}

/**
 * Retorna true se um objetivo casa diretamente com o escopo de produto via
 * o seu serviceLineId. Não verifica filhos — combine com a lista de objetivos
 * que possuem KRs/ações visíveis para visibilidade completa.
 */
export function objectiveDirectlyMatchesProductScope(
  scope: AccessScope,
  obj: { serviceLineId?: number | null }
): boolean {
  if (scope.isAdmin) return true;
  if (!scope.hasProductScope) return true;

  const slIds = scope.effectiveServiceLineIds;
  if (slIds.length === 0) {
    // Usuário tem somente serviceIds — sem como casar diretamente em objetivos.
    return false;
  }
  return obj.serviceLineId != null && slIds.includes(obj.serviceLineId);
}

export { hasGlobalProductAccess };
