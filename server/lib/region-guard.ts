import type { User } from "@shared/schema";

/**
 * Centraliza autorização por região/sub-região e por produto
 * (solução / linha de serviço / serviço).
 *
 * Use estas helpers em rotas e repositórios para evitar lógica duplicada.
 */

type AnyUser = Pick<User, "role"> & {
  id?: number;
  regionIds?: unknown;
  subRegionIds?: unknown;
  solutionIds?: unknown;
  serviceLineIds?: unknown;
  serviceIds?: unknown;
};

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((v) => Number.isFinite(v));
}

export function isAdmin(user: AnyUser | undefined | null): boolean {
  return !!user && user.role === "admin";
}

// ─── Region scope ────────────────────────────────────────────────────────────

export function userRegionIds(user: AnyUser | undefined | null): number[] {
  if (!user) return [];
  return toNumberArray(user.regionIds);
}

export function userSubRegionIds(user: AnyUser | undefined | null): number[] {
  if (!user) return [];
  return toNumberArray(user.subRegionIds);
}

/** True quando o usuário pode atuar em qualquer região (admin ou sem restrição). */
export function hasGlobalRegionAccess(user: AnyUser | undefined | null): boolean {
  return isAdmin(user) || (userRegionIds(user).length === 0 && userSubRegionIds(user).length === 0);
}

/** True se o usuário pode acessar a região indicada. */
export function canAccessRegion(
  user: AnyUser | undefined | null,
  regionId: number | null | undefined
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const allowed = userRegionIds(user);
  if (allowed.length === 0) return true; // sem restrição
  if (regionId == null) return false;
  return allowed.includes(regionId);
}

/** True se o usuário pode acessar pelo menos uma das sub-regiões indicadas. */
export function canAccessAnySubRegion(
  user: AnyUser | undefined | null,
  subRegionIds: number[] | null | undefined
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const allowed = userSubRegionIds(user);
  if (allowed.length === 0) return true;
  if (!subRegionIds || subRegionIds.length === 0) return true;
  return subRegionIds.some((id) => allowed.includes(id));
}

// ─── Product scope (solução / linha de serviço / serviço) ────────────────────

export function userSolutionIds(user: AnyUser | undefined | null): number[] {
  if (!user) return [];
  return toNumberArray(user.solutionIds);
}

export function userServiceLineIds(user: AnyUser | undefined | null): number[] {
  if (!user) return [];
  return toNumberArray(user.serviceLineIds);
}

export function userServiceIds(user: AnyUser | undefined | null): number[] {
  if (!user) return [];
  return toNumberArray(user.serviceIds);
}

/** True se o usuário tem qualquer escopo de produto definido (solução / linha / serviço). */
export function hasProductScope(user: AnyUser | undefined | null): boolean {
  return (
    userSolutionIds(user).length > 0 ||
    userServiceLineIds(user).length > 0 ||
    userServiceIds(user).length > 0
  );
}

/** True quando o usuário tem acesso global por produto (admin ou sem restrição). */
export function hasGlobalProductAccess(user: AnyUser | undefined | null): boolean {
  return isAdmin(user) || !hasProductScope(user);
}

/** True quando o usuário pode ver tudo (sem qualquer restrição). */
export function hasGlobalAccess(user: AnyUser | undefined | null): boolean {
  return hasGlobalRegionAccess(user) && hasGlobalProductAccess(user);
}
