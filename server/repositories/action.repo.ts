import {
  users, objectives, keyResults, actions, actionComments, serviceLines, services,
  type Action, type InsertAction, type ActionComment, type InsertActionComment,
} from '@shared/schema';
import { db } from '../pg-db';
import { eq, and, desc, inArray, isNull, isNotNull } from 'drizzle-orm';
import type { UserRepo } from './user.repo';
import type { ObjectiveRepo } from './objective.repo';
import {
  actionMatchesProductScope,
  buildAccessScope,
  keyResultMatchesProductScope,
} from '../lib/access-scope';

export class ActionRepo {
  constructor(
    private readonly userRepo: UserRepo,
    private readonly objectiveRepo: ObjectiveRepo,
  ) {}

  private async createSystemComment(actionId: number, message: string, userId: number): Promise<void> {
    try {
      await db.insert(actionComments).values({
        actionId,
        userId,
        comment: `🤖 SISTEMA: ${message}`,
        createdAt: new Date(),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating system comment:', error);
    }
  }

  /**
   * Resolve o conjunto de keyResultIds visíveis para um usuário (objetivo + KR).
   * Retorna null quando o usuário tem acesso global e não há restrição.
   */
  private async getVisibleKeyResultIdsForUser(userId: number): Promise<number[] | null> {
    const scope = await buildAccessScope(userId, this.userRepo);
    if (!scope) return [];
    if (scope.isAdmin || (!scope.regionIds.length && !scope.subRegionIds.length && !scope.hasProductScope)) {
      return null;
    }

    const objs = await this.objectiveRepo.getObjectives({ currentUserId: userId });
    const objectiveIds = objs.map((o) => o.id);
    if (objectiveIds.length === 0) return [];

    const krRows = await db
      .select({
        id: keyResults.id,
        serviceLineId: keyResults.serviceLineId,
        serviceLineIds: keyResults.serviceLineIds,
        serviceId: keyResults.serviceId,
      })
      .from(keyResults)
      .where(inArray(keyResults.objectiveId, objectiveIds));

    if (!scope.hasProductScope) {
      return krRows.map((r) => r.id);
    }
    return krRows
      .filter((kr) => keyResultMatchesProductScope(scope, kr))
      .map((kr) => kr.id);
  }

  async getActions(filters?: any): Promise<any[]> {
    let query = db.select({
      id: actions.id,
      title: actions.title,
      description: actions.description,
      priority: actions.priority,
      status: actions.status,
      dueDate: actions.dueDate,
      keyResultId: actions.keyResultId,
      serviceLineId: actions.serviceLineId,
      serviceId: actions.serviceId,
      responsibleId: actions.responsibleId,
      number: actions.number,
      strategicIndicatorId: actions.strategicIndicatorId,
      deletedAt: actions.deletedAt,
      createdAt: actions.createdAt,
      updatedAt: actions.updatedAt,
      responsibleName: users.name,
      responsibleUsername: users.username,
      keyResultTitle: keyResults.title,
      keyResultObjectiveId: keyResults.objectiveId,
      serviceLineName: serviceLines.name,
      serviceName: services.name,
    })
      .from(actions)
      .leftJoin(users, eq(actions.responsibleId, users.id))
      .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .leftJoin(serviceLines, eq(actions.serviceLineId, serviceLines.id))
      .leftJoin(services, eq(actions.serviceId, services.id));

    const whereConditions: any[] = [];

    if (filters?.onlyDeleted) {
      whereConditions.push(isNotNull(actions.deletedAt));
    } else if (!filters?.includeDeleted) {
      whereConditions.push(isNull(actions.deletedAt));
    }

    // Region/sub-region filtering: resolve allowed objective IDs first, then restrict actions
    let allowedObjectiveIds: number[] = [];
    if (filters?.regionId || filters?.subRegionId) {
      const objectiveFilters: any = {};
      if (filters.regionId) objectiveFilters.regionId = filters.regionId;
      if (filters.subRegionId) objectiveFilters.subRegionId = filters.subRegionId;
      if (filters.currentUserId) objectiveFilters.currentUserId = filters.currentUserId;
      const filteredObjectives = await this.objectiveRepo.getObjectives(objectiveFilters);
      allowedObjectiveIds = filteredObjectives.map(obj => obj.id);
      if (allowedObjectiveIds.length === 0) return [];
      whereConditions.push(inArray(objectives.id, allowedObjectiveIds));
    }

    // Filtro por escopo do usuário (cascata via KRs visíveis)
    if (filters?.currentUserId && allowedObjectiveIds.length === 0) {
      const visibleKrIds = await this.getVisibleKeyResultIdsForUser(filters.currentUserId);
      if (visibleKrIds !== null) {
        if (visibleKrIds.length === 0) return [];
        whereConditions.push(inArray(actions.keyResultId, visibleKrIds));
      }
    }

    if (filters?.keyResultId) whereConditions.push(eq(actions.keyResultId, filters.keyResultId));
    if (filters?.responsibleId) whereConditions.push(eq(actions.responsibleId, filters.responsibleId));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    let q: any = (query as any).orderBy(desc(actions.createdAt));
    if (typeof filters?.limit === 'number') q = q.limit(filters.limit);
    if (typeof filters?.offset === 'number') q = q.offset(filters.offset);
    let result = await q;

    // Filtro adicional pelo escopo de produto da própria ação (defesa em profundidade)
    if (filters?.currentUserId) {
      const scope = await buildAccessScope(filters.currentUserId, this.userRepo);
      if (scope && !scope.isAdmin && scope.hasProductScope) {
        result = result.filter((a: any) => {
          // Se a ação tem produto definido, ele precisa casar.
          // Se não tem, mantém visível (já passou pelo filtro do KR pai).
          if (a.serviceId == null && a.serviceLineId == null) return true;
          return actionMatchesProductScope(scope, {
            serviceLineId: a.serviceLineId,
            serviceId: a.serviceId,
          });
        });
      }
    }

    return result.map((action: any) => ({
      id: action.id,
      title: action.title,
      description: action.description,
      priority: action.priority,
      status: action.status,
      dueDate: action.dueDate,
      keyResultId: action.keyResultId,
      serviceLineId: action.serviceLineId,
      serviceId: action.serviceId,
      responsibleId: action.responsibleId,
      number: action.number,
      strategicIndicatorId: action.strategicIndicatorId,
      deletedAt: action.deletedAt,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
      keyResult: action.keyResultTitle ? {
        id: action.keyResultId,
        title: action.keyResultTitle,
        objectiveId: action.keyResultObjectiveId,
      } : undefined,
      serviceLine: action.serviceLineName ? { id: action.serviceLineId, name: action.serviceLineName } : undefined,
      service: action.serviceName ? { id: action.serviceId, name: action.serviceName } : undefined,
      responsible: action.responsibleName ? {
        id: action.responsibleId,
        name: action.responsibleName,
        username: action.responsibleUsername,
      } : undefined,
    }));
  }

  async getAction(id: number, currentUserId?: number, opts: { includeDeleted?: boolean } = {}): Promise<any | undefined> {
    const conds: any[] = [eq(actions.id, id)];
    if (!opts.includeDeleted) conds.push(isNull(actions.deletedAt));

    const result = await db.select({
      action: actions,
      keyResult: keyResults,
      objective: objectives,
    })
      .from(actions)
      .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .where(and(...conds))
      .limit(1);

    if (result.length === 0) return undefined;
    const row = result[0];

    if (currentUserId) {
      const scope = await buildAccessScope(currentUserId, this.userRepo);
      if (!scope) return undefined;
      if (!scope.isAdmin) {
        // Acesso ao objetivo pai (região)
        const objAccess = await this.objectiveRepo.getObjective(row.objective?.id ?? 0, currentUserId);
        if (!objAccess) return undefined;

        // Escopo de produto: ação visível se KR pai casa com escopo OU
        // a própria ação possui um produto que casa com o escopo.
        if (scope.hasProductScope) {
          const krMatches = row.keyResult
            ? keyResultMatchesProductScope(scope, {
                serviceLineId: row.keyResult.serviceLineId,
                serviceLineIds: row.keyResult.serviceLineIds,
                serviceId: row.keyResult.serviceId,
              })
            : false;
          const actionMatches = actionMatchesProductScope(scope, {
            serviceLineId: row.action.serviceLineId,
            serviceId: row.action.serviceId,
          });
          const actionHasProduct = row.action.serviceId != null || row.action.serviceLineId != null;

          if (!krMatches) return undefined;
          if (actionHasProduct && !actionMatches) return undefined;
        }
      }
    }

    return {
      ...row.action,
      keyResult: row.keyResult,
      objective: row.objective,
    };
  }

  async createAction(action: InsertAction): Promise<Action> {
    const rows = await db.insert(actions).values(action).returning();
    const newAction = rows[0];

    if (newAction.id && action.responsibleId) {
      const priorityNames: Record<string, string> = {
        low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
      };
      const dueDateStr = action.dueDate ? new Date(action.dueDate).toLocaleDateString('pt-BR') : 'não definido';
      const priorityLabel = priorityNames[action.priority || 'medium'] || action.priority || 'Média';
      await this.createSystemComment(
        newAction.id,
        `Ação criada com prioridade "${priorityLabel}" e prazo ${dueDateStr}`,
        action.responsibleId,
      );
    }

    return newAction;
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    const current = await db.select().from(actions).where(eq(actions.id, id)).limit(1);
    if (current.length === 0) throw new Error('Action not found');

    const rows = await db
      .update(actions)
      .set({ ...action, updatedAt: new Date() })
      .where(eq(actions.id, id))
      .returning();

    const changes: string[] = [];
    const cur = current[0];

    if (action.status && action.status !== cur.status) {
      const statusNames: Record<string, string> = {
        pending: 'Pendente', in_progress: 'Em Progresso',
        completed: 'Concluída', cancelled: 'Cancelada',
      };
      changes.push(`Status alterado de "${statusNames[cur.status] || cur.status}" para "${statusNames[action.status] || action.status}"`);
    }

    if (action.priority && action.priority !== cur.priority) {
      const priorityNames: Record<string, string> = {
        low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
      };
      changes.push(`Prioridade alterada de "${priorityNames[cur.priority] || cur.priority}" para "${priorityNames[action.priority] || action.priority}"`);
    }

    if (action.title && action.title !== cur.title) {
      changes.push(`Título alterado de "${cur.title}" para "${action.title}"`);
    }

    for (const change of changes) {
      await this.createSystemComment(id, change, cur.responsibleId || 1);
    }

    return rows[0];
  }

  async softDeleteAction(id: number): Promise<void> {
    await db.update(actions).set({ deletedAt: new Date() }).where(eq(actions.id, id));
  }

  async restoreAction(id: number): Promise<void> {
    await db.update(actions).set({ deletedAt: null }).where(eq(actions.id, id));
  }

  /** Mantido como API legada — agora delega para soft-delete. */
  async deleteAction(id: number): Promise<void> {
    await this.softDeleteAction(id);
  }

  // ---- comments ----
  async getActionComments(actionId: number): Promise<any[]> {
    const results = await db.select()
      .from(actionComments)
      .leftJoin(users, eq(actionComments.userId, users.id))
      .where(eq(actionComments.actionId, actionId))
      .orderBy(desc(actionComments.createdAt));

    return results.map(row => ({
      id: row.action_comments.id,
      actionId: row.action_comments.actionId,
      userId: row.action_comments.userId,
      comment: row.action_comments.comment,
      createdAt: row.action_comments.createdAt,
      user: row.users,
    }));
  }

  async createActionComment(comment: InsertActionComment): Promise<ActionComment> {
    const rows = await db.insert(actionComments).values({
      ...comment,
      createdAt: new Date(),
    }).returning();
    return rows[0];
  }
}
