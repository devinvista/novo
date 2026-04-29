import { krCheckIns, users, keyResults, type KrCheckIn, type InsertKrCheckIn } from "@shared/schema";
import { db } from "../pg-db";
import { and, desc, eq, inArray } from "drizzle-orm";

export class KrCheckInRepo {
  async list(keyResultId: number): Promise<Array<KrCheckIn & { authorName?: string | null }>> {
    const rows = await db
      .select({
        id: krCheckIns.id,
        keyResultId: krCheckIns.keyResultId,
        authorId: krCheckIns.authorId,
        weekStart: krCheckIns.weekStart,
        status: krCheckIns.status,
        confidence: krCheckIns.confidence,
        currentValue: krCheckIns.currentValue,
        nextSteps: krCheckIns.nextSteps,
        blockers: krCheckIns.blockers,
        createdAt: krCheckIns.createdAt,
        authorName: users.name,
      })
      .from(krCheckIns)
      .leftJoin(users, eq(krCheckIns.authorId, users.id))
      .where(eq(krCheckIns.keyResultId, keyResultId))
      .orderBy(desc(krCheckIns.weekStart), desc(krCheckIns.createdAt));
    return rows;
  }

  async latest(keyResultId: number): Promise<KrCheckIn | undefined> {
    const rows = await db
      .select()
      .from(krCheckIns)
      .where(eq(krCheckIns.keyResultId, keyResultId))
      .orderBy(desc(krCheckIns.weekStart), desc(krCheckIns.createdAt))
      .limit(1);
    return rows[0];
  }

  async create(data: InsertKrCheckIn): Promise<KrCheckIn> {
    const rows = await db.insert(krCheckIns).values(data).returning();
    return rows[0];
  }

  async listAcrossKeyResults(keyResultIds: number[], limit?: number): Promise<KrCheckIn[]> {
    if (keyResultIds.length === 0) return [];
    let query: any = db
      .select()
      .from(krCheckIns)
      .where(inArray(krCheckIns.keyResultId, keyResultIds))
      .orderBy(desc(krCheckIns.weekStart), desc(krCheckIns.createdAt));
    if (typeof limit === "number") query = query.limit(limit);
    return await query;
  }

  async ensureKrExists(keyResultId: number): Promise<boolean> {
    const rows = await db.select({ id: keyResults.id }).from(keyResults).where(eq(keyResults.id, keyResultId)).limit(1);
    return rows.length > 0;
  }
}
