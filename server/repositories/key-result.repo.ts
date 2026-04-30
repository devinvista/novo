import {
  objectives, keyResults, actions,
  type KeyResult, type InsertKeyResult, type Objective,
} from '@shared/schema';
import { db } from '../pg-db';
import { eq, and, desc, inArray, isNull, isNotNull, type SQL } from 'drizzle-orm';
import type { UserRepo } from './user.repo';
import type { ObjectiveRepo, ObjectiveFilters } from './objective.repo';
import { buildAccessScope, keyResultMatchesProductScope } from '../lib/access-scope';
import { computeKrProgress } from '../domain/progress/compute';

/**
 * KR enriquecido com objetivo e progresso recalculado para a UI.
 *
 * Usamos `Omit` porque o `progress` no banco é `numeric` (string), mas para
 * a camada de aplicação convertemos para number — então precisamos sobrescrever
 * o tipo do campo.
 */
export type KeyResultWithRelations = Omit<KeyResult, 'progress'> & {
  objective: Objective | null;
  progress: number;
};

export interface KeyResultFilters {
  regionId?: number;
  subRegionId?: number;
  objectiveId?: number;
  serviceLineId?: number;
  currentUserId?: number;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export class KeyResultRepo {
  constructor(
    private readonly userRepo: UserRepo,
    private readonly objectiveRepo: ObjectiveRepo,
  ) {}

  async getKeyResults(filters?: KeyResultFilters): Promise<KeyResultWithRelations[]> {
    let allowedObjectiveIds: number[] = [];

    if (filters?.regionId || filters?.subRegionId) {
      const objectiveFilters: ObjectiveFilters = {};
      if (filters.regionId) objectiveFilters.regionId = filters.regionId;
      if (filters.subRegionId) objectiveFilters.subRegionId = filters.subRegionId;
      if (filters.currentUserId) objectiveFilters.currentUserId = filters.currentUserId;

      const filteredObjectives = await this.objectiveRepo.getObjectives(objectiveFilters);
      allowedObjectiveIds = filteredObjectives.map(obj => obj.id);
      if (allowedObjectiveIds.length === 0) return [];
    }

    const whereConditions: SQL[] = [];

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
    }).from(keyResults).leftJoin(objectives, eq(keyResults.objectiveId, objectives.id));

    if (whereConditions.length > 0) {
      // Cast por limitação da API encadeada do Drizzle (sem tipo público para o branch após .where).
      query = query.where(and(...whereConditions)) as typeof query;
    }
    let q: typeof query = query.orderBy(desc(keyResults.createdAt)) as typeof query;
    if (typeof filters?.limit === 'number') q = q.limit(filters.limit) as typeof query;
    if (typeof filters?.offset === 'number') q = q.offset(filters.offset) as typeof query;
    let result = await q;

    // ─── Filtro adicional pelo escopo de produto do KR ───────────────────
    if (filters?.currentUserId) {
      const scope = await buildAccessScope(filters.currentUserId, this.userRepo);
      if (scope && !scope.isAdmin && scope.hasProductScope) {
        result = result.filter((row) => {
          const kr = row.keyResults;
          return keyResultMatchesProductScope(scope, {
            serviceLineId: kr.serviceLineId,
            serviceLineIds: kr.serviceLineIds as number[] | null,
            serviceId: kr.serviceId,
          });
        });
      }
    }

    return result.map((row): KeyResultWithRelations => {
      const kr = row.keyResults;
      const objective = row.objectives ?? null;
      // Usa a função canônica para garantir consistência entre todos os caminhos
      // (lista de KRs, recálculo de objetivos, check-in, checkpoint admin).
      const calculated = computeKrProgress(kr.currentValue, kr.targetValue);
      const stored = (kr.progress !== null && kr.progress !== undefined)
        ? parseFloat(kr.progress.toString()) : 0;
      const finalProgress = calculated > 0 ? calculated : stored;
      return { ...kr, progress: finalProgress, objective };
    });
  }

  async getKeyResult(
    id: number,
    currentUserId?: number,
    opts: { includeDeleted?: boolean } = {}
  ): Promise<(KeyResult & { objective: Objective | null }) | undefined> {
    const conditions: SQL[] = [eq(keyResults.id, id)];
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
      ...row.keyResults,
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
