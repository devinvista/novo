import {
  users, objectives, keyResults, actions, actionComments, serviceLines, services,
  type Action, type InsertAction, type ActionComment, type InsertActionComment,
} from '@shared/schema';
import { db } from '../pg-db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { UserRepo } from './user.repo';
import type { ObjectiveRepo } from './objective.repo';

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

    if (filters?.currentUserId) {
      const user = await this.userRepo.getUser(filters.currentUserId);
      if (user && user.role !== 'admin') {
        const userObjectives = await this.objectiveRepo.getObjectives({ currentUserId: filters.currentUserId });
        const objectiveIds = userObjectives.map(obj => obj.id);
        if (objectiveIds.length > 0) {
          whereConditions.push(inArray(objectives.id, objectiveIds));
        } else {
          return [];
        }
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
    const result = await q;

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

  async getAction(id: number, currentUserId?: number): Promise<any | undefined> {
    const result = await db.select({
      action: actions,
      keyResult: keyResults,
      objective: objectives,
    })
      .from(actions)
      .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .where(eq(actions.id, id))
      .limit(1);

    if (result.length === 0) return undefined;
    const row = result[0];

    if (currentUserId) {
      const user = await this.userRepo.getUser(currentUserId);
      if (user && user.role !== 'admin') {
        const userObjectives = await this.objectiveRepo.getObjectives({ currentUserId });
        const hasAccess = userObjectives.some(obj => obj.id === row.objective?.id);
        if (!hasAccess) return undefined;
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

  async deleteAction(id: number): Promise<void> {
    await db.delete(actionComments).where(eq(actionComments.actionId, id));
    await db.delete(actions).where(eq(actions.id, id));
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
