import {
  users, regions as regionsTable, objectives, keyResults,
  type Objective, type InsertObjective,
} from '@shared/schema';
import { db } from '../pg-db';
import { eq, and, desc, inArray, isNull, isNotNull, sql } from 'drizzle-orm';
import type { UserRepo } from './user.repo';
import { hasGlobalRegionAccess, isAdmin, userRegionIds } from '../lib/region-guard';

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

    if (filters.currentUserId) {
      const user = await this.userRepo.getUser(filters.currentUserId);
      if (user && !isAdmin(user)) {
        if (!hasGlobalRegionAccess(user)) {
          const regions = userRegionIds(user);
          if (regions.length === 0) return [];
          whereConditions.push(inArray(objectives.regionId, regions));
        }
      }
    }

    if (filters.regionId) whereConditions.push(eq(objectives.regionId, filters.regionId));
    if (filters.ownerId) whereConditions.push(eq(objectives.ownerId, filters.ownerId));
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
    return q;
  }

  async getObjective(id: number, _currentUserId?: number, opts: { includeDeleted?: boolean } = {}): Promise<any | undefined> {
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

    return rows.length > 0 ? rows[0] : undefined;
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

  // sql é usado no método acima caso outras queries precisem de raw — manter import.
  _sql = sql;
}
