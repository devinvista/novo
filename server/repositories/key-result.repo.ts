import {
  objectives, keyResults, actions,
  type KeyResult, type InsertKeyResult,
} from '@shared/schema';
import { db } from '../pg-db';
import { eq, and, desc, inArray, isNull, isNotNull } from 'drizzle-orm';
import type { UserRepo } from './user.repo';
import type { ObjectiveRepo } from './objective.repo';
import { buildAccessScope, keyResultMatchesProductScope } from '../lib/access-scope';

export class KeyResultRepo {
  constructor(
    private readonly userRepo: UserRepo,
    private readonly objectiveRepo: ObjectiveRepo,
  ) {}

  async getKeyResults(filters?: any): Promise<any[]> {
    let allowedObjectiveIds: number[] = [];

    if (filters?.regionId || filters?.subRegionId) {
      const objectiveFilters: any = {};
      if (filters.regionId) objectiveFilters.regionId = filters.regionId;
      if (filters.subRegionId) objectiveFilters.subRegionId = filters.subRegionId;
      if (filters.currentUserId) objectiveFilters.currentUserId = filters.currentUserId;

      const filteredObjectives = await this.objectiveRepo.getObjectives(objectiveFilters);
      allowedObjectiveIds = filteredObjectives.map(obj => obj.id);
      if (allowedObjectiveIds.length === 0) return [];
    }

    const whereConditions: any[] = [];

    if (filters?.onlyDeleted) {
      whereConditions.push(isNotNull(keyResults.deletedAt));
    } else if (!filters?.includeDeleted) {
      whereConditions.push(isNull(keyResults.deletedAt));
    }

    if (filters?.objectiveId) whereConditions.push(eq(keyResults.objectiveId, filters.objectiveId));
    if (allowedObjectiveIds.length > 0) whereConditions.push(inArray(keyResults.objectiveId, allowedObjectiveIds));
    if (filters?.serviceLineId) whereConditions.push(eq(keyResults.serviceLineId, filters.serviceLineId));

    // Restrição por escopo do usuário (objetivos visíveis)
    if (filters?.currentUserId && allowedObjectiveIds.length === 0) {
      const scope = await buildAccessScope(filters.currentUserId, this.userRepo);
      if (!scope) return [];
      if (!scope.isAdmin) {
        const userObjectives = await this.objectiveRepo.getObjectives({ currentUserId: filters.currentUserId });
        const objectiveIds = userObjectives.map(obj => obj.id);
        if (objectiveIds.length > 0) {
          whereConditions.push(inArray(keyResults.objectiveId, objectiveIds));
        } else {
          return [];
        }
      }
    }

    let query = db.select({
      keyResults: keyResults,
      objectives: objectives,
    }).from(keyResults).leftJoin(objectives, eq(keyResults.objectiveId, objectives.id)) as any;

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    let q: any = query.orderBy(desc(keyResults.createdAt));
    if (typeof filters?.limit === 'number') q = q.limit(filters.limit);
    if (typeof filters?.offset === 'number') q = q.offset(filters.offset);
    let result = await q;

    // ─── Filtro adicional pelo escopo de produto do KR ───────────────────
    if (filters?.currentUserId) {
      const scope = await buildAccessScope(filters.currentUserId, this.userRepo);
      if (scope && !scope.isAdmin && scope.hasProductScope) {
        result = result.filter((row: any) => {
          const kr = row.keyResults ?? row;
          return keyResultMatchesProductScope(scope, {
            serviceLineId: kr.serviceLineId,
            serviceLineIds: kr.serviceLineIds,
            serviceId: kr.serviceId,
          });
        });
      }
    }

    return result.map((row: any) => {
      const kr = row.keyResults ?? row;
      const objective = row.objectives ?? null;
      let calculatedProgress = 0;
      if (kr.currentValue && kr.targetValue) {
        const current = parseFloat(kr.currentValue.toString());
        const target = parseFloat(kr.targetValue.toString());
        if (target > 0) {
          calculatedProgress = Math.round((current / target) * 100 * 100) / 100;
        }
      }
      const finalProgress = (kr.currentValue && kr.targetValue && calculatedProgress > 0)
        ? calculatedProgress
        : (kr.progress !== null && kr.progress !== undefined)
          ? parseFloat(kr.progress.toString())
          : 0;
      return { ...kr, progress: finalProgress, objective };
    });
  }

  async getKeyResult(id: number, currentUserId?: number, opts: { includeDeleted?: boolean } = {}): Promise<any | undefined> {
    const conditions: any[] = [eq(keyResults.id, id)];
    if (!opts.includeDeleted) conditions.push(isNull(keyResults.deletedAt));

    const result = await db.select({
      keyResults: keyResults,
      objectives: objectives,
    })
      .from(keyResults)
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .where(and(...conditions))
      .limit(1);

    if (result.length === 0) return undefined;
    const row = result[0];

    if (currentUserId) {
      const scope = await buildAccessScope(currentUserId, this.userRepo);
      if (!scope) return undefined;
      if (!scope.isAdmin) {
        // Verifica acesso ao objetivo pai (região + permite indireto)
        const objAccess = await this.objectiveRepo.getObjective(row.keyResults.objectiveId, currentUserId);
        if (!objAccess) return undefined;
        // Verifica produto no próprio KR
        if (scope.hasProductScope &&
            !keyResultMatchesProductScope(scope, {
              serviceLineId: row.keyResults.serviceLineId,
              serviceLineIds: row.keyResults.serviceLineIds,
              serviceId: row.keyResults.serviceId,
            })) {
          return undefined;
        }
      }
    }

    return {
      id: row.keyResults.id,
      objectiveId: row.keyResults.objectiveId,
      title: row.keyResults.title,
      description: row.keyResults.description,
      targetValue: row.keyResults.targetValue,
      currentValue: row.keyResults.currentValue,
      unit: row.keyResults.unit,
      frequency: row.keyResults.frequency,
      startDate: row.keyResults.startDate,
      endDate: row.keyResults.endDate,
      status: row.keyResults.status,
      progress: row.keyResults.progress,
      strategicIndicatorIds: row.keyResults.strategicIndicatorIds,
      serviceLineIds: row.keyResults.serviceLineIds,
      serviceLineId: row.keyResults.serviceLineId,
      serviceId: row.keyResults.serviceId,
      deletedAt: row.keyResults.deletedAt,
      createdAt: row.keyResults.createdAt,
      updatedAt: row.keyResults.updatedAt,
      objective: row.objectives,
    };
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    const rows = await db.insert(keyResults).values(keyResult).returning();
    return rows[0];
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    const rows = await db
      .update(keyResults)
      .set({ ...keyResult, updatedAt: new Date() })
      .where(eq(keyResults.id, id))
      .returning();
    return rows[0];
  }

  /** Soft-delete: marca como excluído e cascata para ações. */
  async softDeleteKeyResult(id: number): Promise<void> {
    const now = new Date();
    await db.update(actions)
      .set({ deletedAt: now })
      .where(and(eq(actions.keyResultId, id), isNull(actions.deletedAt)));
    await db.update(keyResults).set({ deletedAt: now }).where(eq(keyResults.id, id));
  }

  async restoreKeyResult(id: number): Promise<void> {
    await db.update(keyResults).set({ deletedAt: null }).where(eq(keyResults.id, id));
  }

  /** Mantido como API legada — agora delega para soft-delete. */
  async deleteKeyResult(id: number): Promise<void> {
    await this.softDeleteKeyResult(id);
  }
}
