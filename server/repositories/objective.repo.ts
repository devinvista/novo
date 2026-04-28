import {
  users, regions as regionsTable, objectives, keyResults,
  type Objective, type InsertObjective,
} from '@shared/schema';
import { db } from '../pg-db';
import { eq, and, desc, inArray, isNull, isNotNull, sql, or } from 'drizzle-orm';
import type { UserRepo } from './user.repo';
import {
  buildAccessScope,
  keyResultMatchesProductScope,
  objectiveDirectlyMatchesProductScope,
  type AccessScope,
} from '../lib/access-scope';

export interface ObjectiveFilters {
  regionId?: number;
  subRegionId?: number;
  serviceLineId?: number;
  ownerId?: number;
  currentUserId?: number;
  parentObjectiveId?: number | null;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export class ObjectiveRepo {
  constructor(private readonly userRepo: UserRepo) {}

  /**
   * Calcula os IDs de objetivos visíveis para o escopo de produto:
   * união entre objetivos com serviceLineId direto e objetivos cujos KRs
   * casam com o escopo (linha de serviço, lista json, ou serviço).
   */
  private async getObjectiveIdsByProductScope(scope: AccessScope): Promise<number[] | null> {
    if (!scope.hasProductScope || scope.isAdmin) return null;

    const slIds = scope.effectiveServiceLineIds;
    const svcIds = scope.serviceIds;

    const directIds = new Set<number>();
    if (slIds.length > 0) {
      const rows = await db
        .select({ id: objectives.id })
        .from(objectives)
        .where(inArray(objectives.serviceLineId, slIds));
      rows.forEach((r) => directIds.add(r.id));
    }

    // Objetivos visíveis indiretamente: aqueles com KRs que casam com o escopo.
    const krConds: any[] = [];
    if (slIds.length > 0) {
      krConds.push(inArray(keyResults.serviceLineId, slIds));
      // Linhas listadas no campo json — verificadas em memória abaixo.
    }
    if (svcIds.length > 0) {
      krConds.push(inArray(keyResults.serviceId, svcIds));
    }

    const indirectIds = new Set<number>();
    if (krConds.length > 0) {
      const krRows = await db
        .select({ objectiveId: keyResults.objectiveId })
        .from(keyResults)
        .where(or(...krConds));
      krRows.forEach((r) => indirectIds.add(r.objectiveId));
    }

    // Verificação adicional para serviceLineIds (json) em memória.
    if (slIds.length > 0) {
      const krRows2 = await db
        .select({ objectiveId: keyResults.objectiveId, serviceLineIds: keyResults.serviceLineIds })
        .from(keyResults);
      for (const row of krRows2) {
        const list: number[] = Array.isArray(row.serviceLineIds)
          ? (row.serviceLineIds as number[])
          : [];
        if (list.some((id) => slIds.includes(id))) indirectIds.add(row.objectiveId);
      }
    }

    return Array.from(new Set([...directIds, ...indirectIds]));
  }

  /**
   * Garante que o resultado da query respeite o escopo de acesso completo
   * (região + produto). Inclui ancestrais visíveis para preservar a árvore
   * de alinhamento (um objetivo filho visível mantém o pai acessível).
   */
  private async expandWithAncestors(visibleIds: Set<number>): Promise<Set<number>> {
    const expanded = new Set(visibleIds);
    if (visibleIds.size === 0) return expanded;

    const all = await db
      .select({ id: objectives.id, parent: objectives.parentObjectiveId })
      .from(objectives);
    const parentMap = new Map<number, number | null>();
    all.forEach((r) => parentMap.set(r.id, r.parent ?? null));

    for (const id of Array.from(visibleIds)) {
      let current: number | null = parentMap.get(id) ?? null;
      let depth = 0;
      while (current && !expanded.has(current) && depth < 16) {
        expanded.add(current);
        current = parentMap.get(current) ?? null;
        depth++;
      }
    }
    return expanded;
  }

  async getObjectives(filters: ObjectiveFilters = {}): Promise<any[]> {
    let query = db.select({
      id: objectives.id,
      title: objectives.title,
      description: objectives.description,
      startDate: objectives.startDate,
      endDate: objectives.endDate,
      status: objectives.status,
      regionId: objectives.regionId,
      regionName: regionsTable.name,
      regionCode: regionsTable.code,
      subRegionIds: objectives.subRegionIds,
      ownerId: objectives.ownerId,
      parentObjectiveId: objectives.parentObjectiveId,
      serviceLineId: objectives.serviceLineId,
      progress: objectives.progress,
      deletedAt: objectives.deletedAt,
      createdAt: objectives.createdAt,
      updatedAt: objectives.updatedAt,
      ownerName: users.name,
      ownerUsername: users.username,
    })
      .from(objectives)
      .leftJoin(users, eq(objectives.ownerId, users.id))
      .leftJoin(regionsTable, eq(objectives.regionId, regionsTable.id));

    const whereConditions: any[] = [];

    if (filters.onlyDeleted) {
      whereConditions.push(isNotNull(objectives.deletedAt));
    } else if (!filters.includeDeleted) {
      whereConditions.push(isNull(objectives.deletedAt));
    }

    let scope: AccessScope | null = null;
    if (filters.currentUserId) {
      scope = await buildAccessScope(filters.currentUserId, this.userRepo);
      if (!scope) return [];

      // ─── Region filter (drizzle WHERE) ─────────────────────────────────
      if (!scope.isAdmin && scope.regionIds.length > 0) {
        whereConditions.push(inArray(objectives.regionId, scope.regionIds));
      }

      // ─── Product filter ────────────────────────────────────────────────
      const productIds = await this.getObjectiveIdsByProductScope(scope);
      if (productIds !== null) {
        if (productIds.length === 0) return [];
        const expanded = await this.expandWithAncestors(new Set(productIds));
        whereConditions.push(inArray(objectives.id, Array.from(expanded)));
      }
    }

    if (filters.regionId) whereConditions.push(eq(objectives.regionId, filters.regionId));
    if (filters.ownerId) whereConditions.push(eq(objectives.ownerId, filters.ownerId));
    if (filters.serviceLineId) whereConditions.push(eq(objectives.serviceLineId, filters.serviceLineId));
    if (filters.parentObjectiveId === null) {
      whereConditions.push(isNull(objectives.parentObjectiveId));
    } else if (typeof filters.parentObjectiveId === 'number') {
      whereConditions.push(eq(objectives.parentObjectiveId, filters.parentObjectiveId));
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    let q: any = (query as any).orderBy(desc(objectives.createdAt));
    if (typeof filters.limit === 'number') q = q.limit(filters.limit);
    if (typeof filters.offset === 'number') q = q.offset(filters.offset);

    let rows: any[] = await q;

    // Pós-filtro por sub-região (json column → filtro em memória).
    if (scope && !scope.isAdmin && scope.subRegionIds.length > 0) {
      rows = rows.filter((o: any) => {
        const subs: number[] = Array.isArray(o.subRegionIds) ? o.subRegionIds : [];
        if (subs.length === 0) return true;
        return subs.some((id) => scope!.subRegionIds.includes(id));
      });
    }

    if (typeof filters.subRegionId === 'number') {
      const target = filters.subRegionId;
      rows = rows.filter((o: any) => Array.isArray(o.subRegionIds) && o.subRegionIds.includes(target));
    }

    return rows;
  }

  /**
   * Verifica se um objetivo é acessível pelo escopo do usuário (região + produto).
   * Usado por getObjective(id, currentUserId).
   */
  private async isObjectiveAccessible(
    scope: AccessScope,
    obj: { id: number; regionId: number | null; subRegionIds: unknown; serviceLineId: number | null }
  ): Promise<boolean> {
    if (scope.isAdmin) return true;

    // Região
    if (scope.regionIds.length > 0) {
      if (obj.regionId == null || !scope.regionIds.includes(obj.regionId)) return false;
    }
    if (scope.subRegionIds.length > 0) {
      const subs: number[] = Array.isArray(obj.subRegionIds) ? (obj.subRegionIds as number[]) : [];
      if (subs.length > 0 && !subs.some((id) => scope.subRegionIds.includes(id))) return false;
    }

    // Produto
    if (scope.hasProductScope) {
      if (objectiveDirectlyMatchesProductScope(scope, obj)) return true;

      // Match indireto via KRs filhos
      const krRows = await db
        .select({
          serviceLineId: keyResults.serviceLineId,
          serviceLineIds: keyResults.serviceLineIds,
          serviceId: keyResults.serviceId,
        })
        .from(keyResults)
        .where(eq(keyResults.objectiveId, obj.id));
      if (krRows.some((kr) => keyResultMatchesProductScope(scope, kr))) return true;

      // Match indireto via objetivos descendentes (alinhamento)
      const childIds = await this.getDescendantIds(obj.id);
      if (childIds.length > 0) {
        const directDescendants = await db
          .select({ id: objectives.id, serviceLineId: objectives.serviceLineId })
          .from(objectives)
          .where(inArray(objectives.id, childIds));
        if (directDescendants.some((d) => objectiveDirectlyMatchesProductScope(scope, d))) {
          return true;
        }
        const krInDescendants = await db
          .select({
            serviceLineId: keyResults.serviceLineId,
            serviceLineIds: keyResults.serviceLineIds,
            serviceId: keyResults.serviceId,
          })
          .from(keyResults)
          .where(inArray(keyResults.objectiveId, childIds));
        if (krInDescendants.some((kr) => keyResultMatchesProductScope(scope, kr))) return true;
      }
      return false;
    }

    return true;
  }

  /** IDs de descendentes (até 16 níveis). */
  private async getDescendantIds(rootId: number): Promise<number[]> {
    const all = await db
      .select({ id: objectives.id, parent: objectives.parentObjectiveId })
      .from(objectives);
    const childrenMap = new Map<number, number[]>();
    all.forEach((r) => {
      if (r.parent != null) {
        const arr = childrenMap.get(r.parent) ?? [];
        arr.push(r.id);
        childrenMap.set(r.parent, arr);
      }
    });
    const out: number[] = [];
    const stack: { id: number; depth: number }[] = [{ id: rootId, depth: 0 }];
    const seen = new Set<number>([rootId]);
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur.depth >= 16) continue;
      const kids = childrenMap.get(cur.id) ?? [];
      for (const k of kids) {
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(k);
        stack.push({ id: k, depth: cur.depth + 1 });
      }
    }
    return out;
  }

  async getObjective(
    id: number,
    currentUserId?: number,
    opts: { includeDeleted?: boolean } = {}
  ): Promise<any | undefined> {
    const conditions: any[] = [eq(objectives.id, id)];
    if (!opts.includeDeleted) conditions.push(isNull(objectives.deletedAt));

    const rows = await db.select({
      id: objectives.id,
      title: objectives.title,
      description: objectives.description,
      startDate: objectives.startDate,
      endDate: objectives.endDate,
      status: objectives.status,
      regionId: objectives.regionId,
      regionName: regionsTable.name,
      regionCode: regionsTable.code,
      subRegionIds: objectives.subRegionIds,
      ownerId: objectives.ownerId,
      parentObjectiveId: objectives.parentObjectiveId,
      serviceLineId: objectives.serviceLineId,
      progress: objectives.progress,
      deletedAt: objectives.deletedAt,
      createdAt: objectives.createdAt,
      updatedAt: objectives.updatedAt,
      ownerName: users.name,
      ownerUsername: users.username,
    })
      .from(objectives)
      .leftJoin(users, eq(objectives.ownerId, users.id))
      .leftJoin(regionsTable, eq(objectives.regionId, regionsTable.id))
      .where(and(...conditions))
      .limit(1);

    if (rows.length === 0) return undefined;
    const obj = rows[0];

    if (currentUserId) {
      const scope = await buildAccessScope(currentUserId, this.userRepo);
      if (!scope) return undefined;
      const ok = await this.isObjectiveAccessible(scope, obj);
      if (!ok) return undefined;
    }

    return obj;
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    const rows = await db.insert(objectives).values(objective).returning();
    return rows[0];
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    const rows = await db
      .update(objectives)
      .set({ ...objective, updatedAt: new Date() })
      .where(eq(objectives.id, id))
      .returning();
    return rows[0];
  }

  async getKeyResultIdsForObjective(id: number): Promise<number[]> {
    const rows = await db
      .select({ id: keyResults.id })
      .from(keyResults)
      .where(and(eq(keyResults.objectiveId, id), isNull(keyResults.deletedAt)));
    return rows.map(r => r.id);
  }

  async softDeleteObjective(id: number): Promise<void> {
    await db.update(objectives).set({ deletedAt: new Date() }).where(eq(objectives.id, id));
  }

  async restoreObjective(id: number): Promise<void> {
    await db.update(objectives).set({ deletedAt: null }).where(eq(objectives.id, id));
  }

  async deleteObjectiveRow(id: number): Promise<void> {
    await db.delete(objectives).where(eq(objectives.id, id));
  }

  /** IDs de objetivos filhos diretos (1 nível). */
  async getChildIds(id: number): Promise<number[]> {
    const rows = await db
      .select({ id: objectives.id })
      .from(objectives)
      .where(and(eq(objectives.parentObjectiveId, id), isNull(objectives.deletedAt)));
    return rows.map(r => r.id);
  }

  /** Ancestrais (do mais próximo até a raiz) sem ciclos. Limite de 16 níveis. */
  async getAncestorIds(id: number): Promise<number[]> {
    const ancestors: number[] = [];
    let current = id;
    for (let depth = 0; depth < 16; depth++) {
      const rows = await db
        .select({ parentId: objectives.parentObjectiveId })
        .from(objectives)
        .where(eq(objectives.id, current))
        .limit(1);
      const parent = rows[0]?.parentId;
      if (!parent || ancestors.includes(parent)) break;
      ancestors.push(parent);
      current = parent;
    }
    return ancestors;
  }

  /**
   * Atualiza o progresso de um objetivo a partir da média ponderada do progresso
   * dos seus KRs ativos. Usado por jobs de recálculo.
   */
  async recalcProgressFromKeyResults(objectiveId: number): Promise<number> {
    const rows = await db
      .select({ progress: keyResults.progress, current: keyResults.currentValue, target: keyResults.targetValue })
      .from(keyResults)
      .where(and(eq(keyResults.objectiveId, objectiveId), isNull(keyResults.deletedAt)));

    if (rows.length === 0) {
      await db.update(objectives).set({ progress: '0.00' }).where(eq(objectives.id, objectiveId));
      return 0;
    }

    const total = rows.reduce((sum, kr) => {
      const direct = kr.progress ? parseFloat(kr.progress.toString()) : NaN;
      if (!Number.isNaN(direct) && direct > 0) {
        return sum + Math.min(direct, 100);
      }
      const current = parseFloat(kr.current?.toString() ?? '0');
      const target = parseFloat(kr.target?.toString() ?? '0');
      const p = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      return sum + p;
    }, 0);

    const avg = total / rows.length;
    await db.update(objectives).set({ progress: avg.toFixed(2) }).where(eq(objectives.id, objectiveId));
    return avg;
  }

  /**
   * Para objetivos pai (parent_objective_id na hierarquia), recalcula a partir da
   * média do progresso dos filhos diretos. Caso não haja filhos, mantém valor.
   */
  async recalcProgressFromChildren(objectiveId: number): Promise<number | null> {
    const rows = await db
      .select({ progress: objectives.progress })
      .from(objectives)
      .where(and(eq(objectives.parentObjectiveId, objectiveId), isNull(objectives.deletedAt)));

    if (rows.length === 0) return null;
    const total = rows.reduce((sum, r) => sum + (r.progress ? parseFloat(r.progress.toString()) : 0), 0);
    const avg = total / rows.length;
    await db.update(objectives).set({ progress: avg.toFixed(2) }).where(eq(objectives.id, objectiveId));
    return avg;
  }

  // sql é usado caso outras queries precisem de raw — manter import.
  _sql = sql;
}
