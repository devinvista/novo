import { activities, users, type Activity } from "@shared/schema";
import { db } from "../pg-db";
import { and, desc, eq } from "drizzle-orm";

export interface ListActivityFilters {
  entityType?: string;
  entityId?: number;
  userId?: number;
  limit?: number;
  offset?: number;
}

export class ActivityRepo {
  async list(filters: ListActivityFilters = {}): Promise<Array<Activity & { userName?: string | null }>> {
    const conditions: any[] = [];
    if (filters.entityType) conditions.push(eq(activities.entityType, filters.entityType));
    if (filters.entityId !== undefined) conditions.push(eq(activities.entityId, filters.entityId));
    if (filters.userId !== undefined) conditions.push(eq(activities.userId, filters.userId));

    let q: any = db
      .select({
        id: activities.id,
        userId: activities.userId,
        action: activities.action,
        entityType: activities.entityType,
        entityId: activities.entityId,
        details: activities.details,
        createdAt: activities.createdAt,
        userName: users.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id));

    if (conditions.length > 0) q = q.where(and(...conditions));
    q = q.orderBy(desc(activities.createdAt));

    const limit = Math.min(filters.limit ?? 100, 500);
    q = q.limit(limit);
    if (filters.offset && filters.offset > 0) q = q.offset(filters.offset);

    return q;
  }
}
