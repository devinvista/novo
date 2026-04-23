import type { User } from "@shared/schema";

/**
 * Centraliza autorização por região / sub-região.
 * Use estas helpers em rotas e repositórios para evitar lógica duplicada.
 */

type AnyUser = Pick<User, "role"> & {
  id?: number;
  regionIds?: unknown;
  subRegionIds?: unknown;
};

export function isAdmin(user: AnyUser | undefined | null): boolean {
  return !!user && user.role === "admin";
}

export function userRegionIds(user: AnyUser | undefined | null): number[] {
  if (!user) return [];
  return Array.isArray(user.regionIds) ? (user.regionIds as number[]) : [];
}

export function userSubRegionIds(user: AnyUser | undefined | null): number[] {
  if (!user) return [];
  return Array.isArray(user.subRegionIds) ? (user.subRegionIds as number[]) : [];
}

/** True quando o usuário pode atuar em qualquer região (admin ou sem restrição). */
export function hasGlobalRegionAccess(user: AnyUser | undefined | null): boolean {
  return isAdmin(user) || userRegionIds(user).length === 0;
}

/** True se o usuário pode acessar a região indicada. */
export function canAccessRegion(user: AnyUser | undefined | null, regionId: number | null | undefined): boolean {
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
