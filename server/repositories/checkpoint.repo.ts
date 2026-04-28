import {
  objectives, keyResults, checkpoints,
  type Checkpoint,
} from '@shared/schema';
import { db } from '../pg-db';
import { eq, and, asc, inArray } from 'drizzle-orm';
import type { UserRepo } from './user.repo';
import type { ObjectiveRepo } from './objective.repo';
import type { KeyResultRepo } from './key-result.repo';

/**
 * Parses a YYYY-MM-DD string as a LOCAL date (no UTC offset).
 * Prevents the common bug where new Date('2026-01-01') becomes Dec 31 in UTC-3.
 */
function parseLocalDate(str: string): Date {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Normalizes frequency values from both Portuguese and English names
 * to a canonical English key used internally.
 */
function normalizeFrequency(frequency: string): string {
  const map: Record<string, string> = {
    semanal: 'weekly',
    weekly: 'weekly',
    quinzenal: 'biweekly',
    biweekly: 'biweekly',
    mensal: 'monthly',
    monthly: 'monthly',
    trimestral: 'quarterly',
    quarterly: 'quarterly',
  };
  return map[frequency?.toLowerCase().trim()] ?? 'default';
}

export class CheckpointRepo {
  constructor(
    private readonly userRepo: UserRepo,
    private readonly objectiveRepo: ObjectiveRepo,
    private readonly keyResultRepo: KeyResultRepo,
  ) {}

  async getCheckpoints(keyResultId?: number, currentUserId?: number): Promise<any[]> {
    let query = db.select({
      checkpoints: checkpoints,
      keyResults: keyResults,
      objectives: objectives,
    })
      .from(checkpoints)
      .leftJoin(keyResults, eq(checkpoints.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id));

    const conditions: any[] = [];

    if (keyResultId) conditions.push(eq(checkpoints.keyResultId, keyResultId));

    if (currentUserId) {
      const user = await this.userRepo.getUser(currentUserId);
      if (user && user.role !== 'admin') {
        const userObjectives = await this.objectiveRepo.getObjectives({ currentUserId });
        const objectiveIds = userObjectives.map(obj => obj.id);
        if (objectiveIds.length > 0) {
          conditions.push(inArray(objectives.id, objectiveIds));
        } else {
          return [];
        }
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await (query as any).orderBy(asc(checkpoints.dueDate));

    return results.map((row: any) => ({
      ...row.checkpoints,
      keyResult: row.keyResults,
      objective: row.objectives,
    }));
  }

  async getCheckpoint(id: number, _currentUserId?: number): Promise<any | undefined> {
    const rows = await db.select().from(checkpoints).where(eq(checkpoints.id, id)).limit(1);
    return rows.length > 0 ? rows[0] : undefined;
  }

  async updateCheckpoint(id: number, data: any): Promise<Checkpoint> {
    const rows = await db.update(checkpoints).set(data).where(eq(checkpoints.id, id)).returning();
    return rows[0];
  }

  async deleteCheckpoint(id: number): Promise<void> {
    await db.delete(checkpoints).where(eq(checkpoints.id, id));
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    const keyResult = await this.keyResultRepo.getKeyResult(keyResultId);
    if (!keyResult) throw new Error('Key result not found');

    await db.delete(checkpoints).where(eq(checkpoints.keyResultId, keyResultId));

    // Parse as local dates to avoid UTC-offset shifting the day
    const startDate = parseLocalDate(keyResult.startDate);
    const endDate = parseLocalDate(keyResult.endDate);
    const frequency = normalizeFrequency(keyResult.frequency);
    const totalTarget = Number(keyResult.targetValue);

    const periods: { number: number; dueDate: Date }[] = [];
    let currentDate = new Date(startDate);
    let checkpointNumber = 1;

    while (currentDate <= endDate) {
      let nextDate: Date = new Date(currentDate);

      switch (frequency) {
        case 'weekly':
          nextDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          nextDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          nextDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(currentDate.getMonth() + 3);
          break;
        default:
          nextDate = new Date(endDate);
      }

      if (nextDate > endDate) nextDate = new Date(endDate);
      periods.push({ number: checkpointNumber, dueDate: nextDate });
      currentDate = new Date(nextDate);
      currentDate.setDate(currentDate.getDate() + 1);
      checkpointNumber++;
      if (nextDate >= endDate) break;
    }

    const totalPeriods = periods.length;

    const formatBrazilianDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}`;
    };

    const createdCheckpoints: Checkpoint[] = [];

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const isLastCheckpoint = i === periods.length - 1;
      const targetValue = isLastCheckpoint
        ? totalTarget
        : (totalTarget / totalPeriods) * (i + 1);

      let periodStart: Date;
      if (i === 0) {
        periodStart = new Date(startDate);
      } else {
        periodStart = new Date(periods[i - 1].dueDate);
        periodStart.setDate(periodStart.getDate() + 1);
      }

      const title = `${formatBrazilianDate(period.dueDate)} ${period.number}/${totalPeriods}`;
      const periodText = `(${formatBrazilianDate(periodStart)} a ${formatBrazilianDate(period.dueDate)})`;
      const formattedTargetValue = targetValue.toFixed(2);

      const rows = await db.insert(checkpoints).values({
        keyResultId,
        title,
        period: periodText,
        targetValue: formattedTargetValue,
        actualValue: '0',
        status: 'pending',
        dueDate: new Date(period.dueDate),
      }).returning();

      if (rows[0]) createdCheckpoints.push(rows[0]);
    }

    return createdCheckpoints;
  }
}
