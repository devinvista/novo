import {
  objectives, keyResults, actions, checkpoints, actionComments,
  type KeyResult, type InsertKeyResult,
} from '@shared/pg-schema';
import { db } from '../pg-db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { UserRepo } from './user.repo';
import type { ObjectiveRepo } from './objective.repo';

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
      if (filters.currentUserId) objectiveFilters.currentUserId = filters.currentUserId;

      const filteredObjectives = await this.objectiveRepo.getObjectives(objectiveFilters);
      allowedObjectiveIds = filteredObjectives.map(obj => obj.id);
      if (allowedObjectiveIds.length === 0) return [];
    }

    const whereConditions: any[] = [];

    if (filters?.objectiveId) whereConditions.push(eq(keyResults.objectiveId, filters.objectiveId));
    if (allowedObjectiveIds.length > 0) whereConditions.push(inArray(keyResults.objectiveId, allowedObjectiveIds));
    if (filters?.serviceLineId) whereConditions.push(eq(keyResults.serviceLineId, filters.serviceLineId));

    if (filters?.currentUserId && allowedObjectiveIds.length === 0) {
      const user = await this.userRepo.getUser(filters.currentUserId);
      if (user && user.role !== 'admin') {
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
    const result = await query.orderBy(desc(keyResults.createdAt));

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

  async getKeyResult(id: number, _currentUserId?: number): Promise<any | undefined> {
    const result = await db.select({
      keyResults: keyResults,
      objectives: objectives,
    })
      .from(keyResults)
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .where(eq(keyResults.id, id))
      .limit(1);

    if (result.length === 0) return undefined;
    const row = result[0];
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

  async deleteKeyResult(id: number): Promise<void> {
    const krActions = await db.select({ id: actions.id }).from(actions).where(eq(actions.keyResultId, id));
    for (const action of krActions) {
      await db.delete(actionComments).where(eq(actionComments.actionId, action.id));
    }
    await db.delete(actions).where(eq(actions.keyResultId, id));
    await db.delete(checkpoints).where(eq(checkpoints.keyResultId, id));
    await db.delete(keyResults).where(eq(keyResults.id, id));
  }
}
