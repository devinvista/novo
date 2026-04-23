import {
  users, regions as regionsTable, objectives, keyResults,
  type Objective, type InsertObjective,
} from '@shared/schema';
import { db } from '../pg-db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { UserRepo } from './user.repo';

export class ObjectiveRepo {
  constructor(private readonly userRepo: UserRepo) {}

  async getObjectives(filters?: any): Promise<any[]> {
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
      createdAt: objectives.createdAt,
      updatedAt: objectives.updatedAt,
      ownerName: users.name,
      ownerUsername: users.username,
    })
      .from(objectives)
      .leftJoin(users, eq(objectives.ownerId, users.id))
      .leftJoin(regionsTable, eq(objectives.regionId, regionsTable.id));

    const whereConditions: any[] = [];

    if (filters?.currentUserId) {
      const user = await this.userRepo.getUser(filters.currentUserId);
      if (user && user.role !== 'admin') {
        const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
        if (userRegionIds.length > 0) {
          whereConditions.push(inArray(objectives.regionId, userRegionIds));
        } else {
          return [];
        }
      }
    }

    if (filters?.regionId) whereConditions.push(eq(objectives.regionId, filters.regionId));
    if (filters?.ownerId) whereConditions.push(eq(objectives.ownerId, filters.ownerId));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    let q: any = (query as any).orderBy(desc(objectives.createdAt));
    if (typeof filters?.limit === 'number') q = q.limit(filters.limit);
    if (typeof filters?.offset === 'number') q = q.offset(filters.offset);
    return q;
  }

  async getObjective(id: number, _currentUserId?: number): Promise<any | undefined> {
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
      createdAt: objectives.createdAt,
      updatedAt: objectives.updatedAt,
      ownerName: users.name,
      ownerUsername: users.username,
    })
      .from(objectives)
      .leftJoin(users, eq(objectives.ownerId, users.id))
      .leftJoin(regionsTable, eq(objectives.regionId, regionsTable.id))
      .where(eq(objectives.id, id))
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
    const rows = await db.select({ id: keyResults.id }).from(keyResults).where(eq(keyResults.objectiveId, id));
    return rows.map(r => r.id);
  }

  async deleteObjectiveRow(id: number): Promise<void> {
    await db.delete(objectives).where(eq(objectives.id, id));
  }
}
