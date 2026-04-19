import {
  users, regions as regionsTable, subRegions as subRegionsTable, serviceLines, strategicIndicators,
  objectives, keyResults, actions, checkpoints, actionComments,
  solutions as solutionsTable, services,
  type User, type InsertUser, type Objective, type InsertObjective,
  type KeyResult, type InsertKeyResult, type Action, type InsertAction,
  type Checkpoint, type InsertCheckpoint, type Region, type SubRegion,
  type ServiceLine, type StrategicIndicator,
  type Solution, type Service, type ActionComment, type InsertActionComment
} from "@shared/pg-schema";
import { db } from "./pg-db";
import { eq, and, desc, sql, asc, inArray, count } from "drizzle-orm";
import session from "express-session";
// @ts-ignore
import MemoryStore from "memorystore";
import { getQuarterlyPeriods } from "./quarterly-periods";

const sessionStore = new (MemoryStore(session))({
  checkPeriod: 86400000
});

export interface IStorage {
  sessionStore: any;

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getManagers(): Promise<User[]>;
  getPendingUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  approveUser(id: number, approvedBy: number, subRegionId?: number): Promise<User>;
  approveUserWithPermissions(id: number, approvedBy: number, permissions: {
    regionIds: number[];
    subRegionIds: number[];
    solutionIds: number[];
    serviceLineIds: number[];
    serviceIds: number[];
  }): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  getRegions(): Promise<Region[]>;
  getSubRegions(regionId?: number): Promise<SubRegion[]>;
  getSolutions(): Promise<Solution[]>;
  getServiceLines(solutionId?: number): Promise<ServiceLine[]>;
  getServices(serviceLineId?: number): Promise<Service[]>;
  getStrategicIndicators(): Promise<StrategicIndicator[]>;

  getAvailableQuarters(): Promise<any[]>;
  getQuarterlyData(quarter?: string, currentUserId?: number, filters?: any): Promise<any>;
  getQuarterlyStats(): Promise<any[]>;
  getDashboardKPIs(currentUserId?: number, filters?: any): Promise<any>;

  getObjectives(filters?: any): Promise<any[]>;
  getObjective(id: number, currentUserId?: number): Promise<any | undefined>;
  createObjective(objective: InsertObjective): Promise<Objective>;
  updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective>;
  deleteObjective(id: number): Promise<void>;

  getKeyResults(filters?: any): Promise<any[]>;
  getKeyResult(id: number, currentUserId?: number): Promise<any | undefined>;
  createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult>;
  updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult>;
  deleteKeyResult(id: number): Promise<void>;

  getActions(filters?: any): Promise<any[]>;
  getAction(id: number, currentUserId?: number): Promise<any | undefined>;
  createAction(action: InsertAction): Promise<Action>;
  updateAction(id: number, action: Partial<InsertAction>): Promise<Action>;
  deleteAction(id: number): Promise<void>;

  getCheckpoints(keyResultId?: number, currentUserId?: number): Promise<any[]>;
  getCheckpoint(id: number, currentUserId?: number): Promise<any | undefined>;
  updateCheckpoint(id: number, data: any): Promise<Checkpoint>;
  deleteCheckpoint(id: number): Promise<void>;
  generateCheckpoints(keyResultId: number): Promise<Checkpoint[]>;

  getActionComments(actionId: number): Promise<any[]>;
  createActionComment(comment: InsertActionComment): Promise<ActionComment>;

  createStrategicIndicator(data: { name: string; code: string; description?: string; unit?: string }): Promise<StrategicIndicator>;
  updateStrategicIndicator(id: number, data: { name: string; code: string; description?: string; unit?: string }): Promise<StrategicIndicator>;
  deleteStrategicIndicator(id: number): Promise<void>;

  createRegion(data: { name: string; code: string }): Promise<Region>;
  updateRegion(id: number, data: { name: string; code: string }): Promise<Region>;
  deleteRegion(id: number): Promise<void>;

  createSubRegion(data: { name: string; code: string; regionId: number }): Promise<SubRegion>;
  updateSubRegion(id: number, data: { name: string; code: string; regionId: number }): Promise<SubRegion>;
  deleteSubRegion(id: number): Promise<void>;

  createSolution(data: { name: string; code: string; description?: string }): Promise<Solution>;
  updateSolution(id: number, data: { name: string; code: string; description?: string }): Promise<Solution>;
  deleteSolution(id: number): Promise<void>;

  createServiceLine(data: { name: string; code: string; description?: string; solutionId: number }): Promise<ServiceLine>;
  updateServiceLine(id: number, data: { name: string; code: string; description?: string; solutionId: number }): Promise<ServiceLine>;
  deleteServiceLine(id: number): Promise<void>;

  createService(data: { name: string; code: string; description?: string; serviceLineId: number }): Promise<Service>;
  updateService(id: number, data: { name: string; code: string; description?: string; serviceLineId: number }): Promise<Service>;
  deleteService(id: number): Promise<void>;
}

export class PgStorage implements IStorage {
  sessionStore: any = sessionStore;

  private parseUserJsonFields(user: any): User {
    return {
      ...user,
      regionIds: Array.isArray(user.regionIds) ? user.regionIds : (user.regionIds ? (typeof user.regionIds === 'string' ? JSON.parse(user.regionIds) : user.regionIds) : []),
      subRegionIds: Array.isArray(user.subRegionIds) ? user.subRegionIds : (user.subRegionIds ? (typeof user.subRegionIds === 'string' ? JSON.parse(user.subRegionIds) : user.subRegionIds) : []),
      solutionIds: Array.isArray(user.solutionIds) ? user.solutionIds : (user.solutionIds ? (typeof user.solutionIds === 'string' ? JSON.parse(user.solutionIds) : user.solutionIds) : []),
      serviceLineIds: Array.isArray(user.serviceLineIds) ? user.serviceLineIds : (user.serviceLineIds ? (typeof user.serviceLineIds === 'string' ? JSON.parse(user.serviceLineIds) : user.serviceLineIds) : []),
      serviceIds: Array.isArray(user.serviceIds) ? user.serviceIds : (user.serviceIds ? (typeof user.serviceIds === 'string' ? JSON.parse(user.serviceIds) : user.serviceIds) : []),
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows.length > 0 ? this.parseUserJsonFields(rows[0]) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows.length > 0 ? this.parseUserJsonFields(rows[0]) : undefined;
  }

  async getUsers(): Promise<User[]> {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    return rows.map(u => this.parseUserJsonFields(u));
  }

  async getManagers(): Promise<User[]> {
    const rows = await db.select().from(users).where(eq(users.role, 'gestor')).orderBy(asc(users.username));
    return rows.map(u => this.parseUserJsonFields(u));
  }

  async getPendingUsers(): Promise<User[]> {
    const rows = await db.select().from(users).where(eq(users.approved, false)).orderBy(desc(users.createdAt));
    return rows.map(u => this.parseUserJsonFields(u));
  }

  async createUser(user: InsertUser): Promise<User> {
    const rows = await db.insert(users).values(user).returning();
    return this.parseUserJsonFields(rows[0]);
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const rows = await db.update(users).set(user).where(eq(users.id, id)).returning();
    if (rows.length === 0) throw new Error('User not found');
    return this.parseUserJsonFields(rows[0]);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(actionComments).where(eq(actionComments.userId, id));
    await db.update(objectives).set({ ownerId: 0 }).where(eq(objectives.ownerId, id));
    await db.update(actions).set({ responsibleId: null }).where(eq(actions.responsibleId, id));
    await db.update(users).set({ gestorId: null }).where(eq(users.gestorId, id));
    await db.update(users).set({ approvedBy: null }).where(eq(users.approvedBy, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async approveUser(id: number, approvedBy: number, subRegionId?: number): Promise<User> {
    const updateData: any = {
      approved: true,
      approvedAt: new Date(),
      approvedBy,
    };
    if (subRegionId) {
      updateData.subRegionIds = [subRegionId];
    }
    const rows = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    if (rows.length === 0) throw new Error('User not found');
    return this.parseUserJsonFields(rows[0]);
  }

  async approveUserWithPermissions(id: number, approvedBy: number, permissions: any): Promise<User> {
    const rows = await db.update(users).set({
      approved: true,
      approvedAt: new Date(),
      approvedBy,
      regionIds: permissions.regionIds,
      subRegionIds: permissions.subRegionIds,
      solutionIds: permissions.solutionIds,
      serviceLineIds: permissions.serviceLineIds,
      serviceIds: permissions.serviceIds,
    }).where(eq(users.id, id)).returning();
    if (rows.length === 0) throw new Error('User not found');
    return this.parseUserJsonFields(rows[0]);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getRegions(): Promise<Region[]> {
    return db.select().from(regionsTable).orderBy(asc(regionsTable.id));
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    if (regionId) {
      return db.select().from(subRegionsTable).where(eq(subRegionsTable.regionId, regionId)).orderBy(asc(subRegionsTable.id));
    }
    return db.select().from(subRegionsTable).orderBy(asc(subRegionsTable.id));
  }

  async getSolutions(): Promise<Solution[]> {
    return db.select().from(solutionsTable).orderBy(asc(solutionsTable.name));
  }

  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    if (solutionId) {
      return db.select().from(serviceLines).where(eq(serviceLines.solutionId, solutionId)).orderBy(asc(serviceLines.name));
    }
    return db.select().from(serviceLines).orderBy(asc(serviceLines.name));
  }

  async getServices(serviceLineId?: number): Promise<Service[]> {
    if (serviceLineId) {
      return db.select().from(services).where(eq(services.serviceLineId, serviceLineId)).orderBy(asc(services.name));
    }
    return db.select().from(services).orderBy(asc(services.name));
  }

  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    return db.select().from(strategicIndicators).orderBy(asc(strategicIndicators.name));
  }

  async getAvailableQuarters(): Promise<any[]> {
    const allObjectives = await db.select({
      startDate: objectives.startDate,
      endDate: objectives.endDate
    }).from(objectives);

    if (allObjectives.length === 0) {
      return [
        { id: '2025-T1', name: 'T1 2025', startDate: '2025-01-01', endDate: '2025-03-31' },
        { id: '2025-T2', name: 'T2 2025', startDate: '2025-04-01', endDate: '2025-06-30' },
        { id: '2025-T3', name: 'T3 2025', startDate: '2025-07-01', endDate: '2025-09-30' },
        { id: '2025-T4', name: 'T4 2025', startDate: '2025-10-01', endDate: '2025-12-31' }
      ];
    }

    const dates = allObjectives.map(obj => [obj.startDate, obj.endDate]).flat();
    const earliestDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
    const latestDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    const quarterPeriods = getQuarterlyPeriods(earliestDate, latestDate);

    const quarters = quarterPeriods.map(period => ({
      id: period.quarter,
      name: `T${period.quarterNumber} ${period.year}`,
      startDate: period.startDate.toISOString().split('T')[0],
      endDate: period.endDate.toISOString().split('T')[0]
    }));

    return quarters.length > 0 ? quarters : [
      { id: '2025-T1', name: 'T1 2025', startDate: '2025-01-01', endDate: '2025-03-31' },
      { id: '2025-T2', name: 'T2 2025', startDate: '2025-04-01', endDate: '2025-06-30' },
      { id: '2025-T3', name: 'T3 2025', startDate: '2025-07-01', endDate: '2025-09-30' },
      { id: '2025-T4', name: 'T4 2025', startDate: '2025-10-01', endDate: '2025-12-31' }
    ];
  }

  async getQuarterlyData(quarter?: string, currentUserId?: number, filters?: any): Promise<any> {
    if (!currentUserId) {
      return { objectives: [], keyResults: [], actions: [] };
    }

    const objectiveFilters = {
      currentUserId,
      regionId: filters?.regionId,
      subRegionId: filters?.subRegionId,
      serviceLineId: filters?.serviceLineId
    };

    const userObjectives = await this.getObjectives(objectiveFilters);

    let quarterObjectives = userObjectives;
    if (quarter && quarter !== 'all') {
      const quarterMatch = quarter.match(/(\d{4})-T(\d)/);
      if (quarterMatch) {
        const year = parseInt(quarterMatch[1]);
        const quarterNum = parseInt(quarterMatch[2]);
        const quarterStartMonth = (quarterNum - 1) * 3;
        const quarterStartDate = new Date(year, quarterStartMonth, 1);
        const quarterEndDate = new Date(year, quarterStartMonth + 3, 0);

        quarterObjectives = userObjectives.filter(obj => {
          const objStart = new Date(obj.startDate);
          const objEnd = new Date(obj.endDate);
          return objStart <= quarterEndDate && objEnd >= quarterStartDate;
        });
      }
    }

    const objectiveIds = quarterObjectives.map(obj => obj.id);
    let quarterKeyResults: any[] = [];
    let quarterActions: any[] = [];

    if (objectiveIds.length > 0) {
      const userKeyResults = await this.getKeyResults({ currentUserId });
      quarterKeyResults = userKeyResults.filter(kr => objectiveIds.includes(kr.objectiveId));

      if (filters?.serviceLineId) {
        quarterKeyResults = quarterKeyResults.filter(kr => kr.serviceLineId === filters.serviceLineId);
      }

      const keyResultIds = quarterKeyResults.map(kr => kr.id);
      if (keyResultIds.length > 0) {
        const userActions = await this.getActions({ currentUserId });
        quarterActions = userActions.filter(action => keyResultIds.includes(action.keyResultId));
      }
    }

    return {
      objectives: quarterObjectives,
      keyResults: quarterKeyResults,
      actions: quarterActions
    };
  }

  async getQuarterlyStats(): Promise<any[]> {
    const allObjectives = await db.select({
      startDate: objectives.startDate,
      endDate: objectives.endDate
    }).from(objectives);

    const dates = allObjectives.map(obj => [obj.startDate, obj.endDate]).flat();
    if (dates.length === 0) return [];

    const earliestDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
    const latestDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    const quarterPeriods = getQuarterlyPeriods(earliestDate, latestDate);

    const stats = [];
    for (const period of quarterPeriods) {
      const quarterData = await this.getQuarterlyData(period.quarter);
      stats.push({
        period: period.quarter,
        name: `T${period.quarterNumber} ${period.year}`,
        ...quarterData
      });
    }

    return stats;
  }

  async getDashboardKPIs(currentUserId?: number, filters?: any): Promise<any> {
    let objectivesResult, keyResultsResult, actionsResult;

    if (filters?.quarter && filters.quarter !== 'all') {
      const allObjectives = await this.getObjectives({ currentUserId });
      objectivesResult = allObjectives.filter(obj => {
        const startDate = new Date(obj.startDate);
        const endDate = new Date(obj.endDate);
        const [year, quarter] = filters.quarter.split('-T');
        const quarterStart = new Date(parseInt(year), (parseInt(quarter) - 1) * 3, 1);
        const quarterEnd = new Date(parseInt(year), parseInt(quarter) * 3, 0);
        return startDate <= quarterEnd && endDate >= quarterStart;
      });

      const objectiveIds = objectivesResult.map(obj => obj.id);
      const allKeyResults = await this.getKeyResults({ currentUserId });
      const allActions = await this.getActions({ currentUserId });

      keyResultsResult = allKeyResults.filter(kr => objectiveIds.includes(kr.objectiveId));
      const keyResultIds = keyResultsResult.map(kr => kr.id);
      actionsResult = allActions.filter(action => keyResultIds.includes(action.keyResultId));
    } else {
      objectivesResult = await this.getObjectives({ currentUserId, ...filters });
      keyResultsResult = await this.getKeyResults({ currentUserId });
      actionsResult = await this.getActions({ currentUserId });
    }

    const completedObjectives = objectivesResult.filter(obj => obj.status === 'completed').length;
    const onTrackObjectives = objectivesResult.filter(obj => obj.status === 'active').length;
    const delayedObjectives = objectivesResult.filter(obj => obj.status === 'delayed').length;

    let totalProgress = 0;
    let validKRCount = 0;
    for (const kr of keyResultsResult) {
      const currentValue = parseFloat(kr.currentValue || '0');
      const targetValue = parseFloat(kr.targetValue || '1');
      if (!isNaN(currentValue) && !isNaN(targetValue) && targetValue > 0) {
        totalProgress += Math.min((currentValue / targetValue) * 100, 100);
        validKRCount++;
      }
    }

    const completionRate = validKRCount > 0 ? Math.round(totalProgress / validKRCount) : 0;

    return {
      objectives: objectivesResult.length,
      keyResults: keyResultsResult.length,
      actions: actionsResult.length,
      checkpoints: 0,
      completionRate,
      onTrackObjectives,
      delayedObjectives,
      activeUsers: 1
    };
  }

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
      ownerUsername: users.username
    })
    .from(objectives)
    .leftJoin(users, eq(objectives.ownerId, users.id))
    .leftJoin(regionsTable, eq(objectives.regionId, regionsTable.id));

    const whereConditions: any[] = [];

    if (filters?.currentUserId) {
      const user = await this.getUser(filters.currentUserId);
      if (user && user.role !== 'admin') {
        const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
        if (userRegionIds.length > 0) {
          whereConditions.push(inArray(objectives.regionId, userRegionIds));
        } else {
          return [];
        }
      }
    }

    if (filters?.regionId) {
      whereConditions.push(eq(objectives.regionId, filters.regionId));
    }

    if (filters?.ownerId) {
      whereConditions.push(eq(objectives.ownerId, filters.ownerId));
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    return (query as any).orderBy(desc(objectives.createdAt));
  }

  async getObjective(id: number, currentUserId?: number): Promise<any | undefined> {
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
      ownerUsername: users.username
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
    const rows = await db.update(objectives).set({ ...objective, updatedAt: new Date() }).where(eq(objectives.id, id)).returning();
    return rows[0];
  }

  async deleteObjective(id: number): Promise<void> {
    const objectiveKeyResults = await db.select({ id: keyResults.id }).from(keyResults).where(eq(keyResults.objectiveId, id));
    for (const kr of objectiveKeyResults) {
      await this.deleteKeyResult(kr.id);
    }
    await db.delete(objectives).where(eq(objectives.id, id));
  }

  async getKeyResults(filters?: any): Promise<any[]> {
    let allowedObjectiveIds: number[] = [];

    if (filters?.regionId || filters?.subRegionId) {
      const objectiveFilters: any = {};
      if (filters.regionId) objectiveFilters.regionId = filters.regionId;
      if (filters.currentUserId) objectiveFilters.currentUserId = filters.currentUserId;

      const filteredObjectives = await this.getObjectives(objectiveFilters);
      allowedObjectiveIds = filteredObjectives.map(obj => obj.id);

      if (allowedObjectiveIds.length === 0) return [];
    }

    const whereConditions: any[] = [];

    if (filters?.objectiveId) {
      whereConditions.push(eq(keyResults.objectiveId, filters.objectiveId));
    }

    if (allowedObjectiveIds.length > 0) {
      whereConditions.push(inArray(keyResults.objectiveId, allowedObjectiveIds));
    }

    if (filters?.serviceLineId) {
      whereConditions.push(eq(keyResults.serviceLineId, filters.serviceLineId));
    }

    if (filters?.currentUserId && allowedObjectiveIds.length === 0) {
      const user = await this.getUser(filters.currentUserId);
      if (user && user.role !== 'admin') {
        const userObjectives = await this.getObjectives({ currentUserId: filters.currentUserId });
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

  async getKeyResult(id: number, currentUserId?: number): Promise<any | undefined> {
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
    const rows = await db.update(keyResults).set({ ...keyResult, updatedAt: new Date() }).where(eq(keyResults.id, id)).returning();
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
      serviceName: services.name
    })
    .from(actions)
    .leftJoin(users, eq(actions.responsibleId, users.id))
    .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
    .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
    .leftJoin(serviceLines, eq(actions.serviceLineId, serviceLines.id))
    .leftJoin(services, eq(actions.serviceId, services.id));

    const whereConditions: any[] = [];

    if (filters?.currentUserId) {
      const user = await this.getUser(filters.currentUserId);
      if (user && user.role !== 'admin') {
        const userObjectives = await this.getObjectives({ currentUserId: filters.currentUserId });
        const objectiveIds = userObjectives.map(obj => obj.id);
        if (objectiveIds.length > 0) {
          whereConditions.push(inArray(objectives.id, objectiveIds));
        } else {
          return [];
        }
      }
    }

    if (filters?.keyResultId) {
      whereConditions.push(eq(actions.keyResultId, filters.keyResultId));
    }

    if (filters?.responsibleId) {
      whereConditions.push(eq(actions.responsibleId, filters.responsibleId));
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    const result = await (query as any).orderBy(desc(actions.createdAt));

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
        objectiveId: action.keyResultObjectiveId
      } : undefined,
      serviceLine: action.serviceLineName ? { id: action.serviceLineId, name: action.serviceLineName } : undefined,
      service: action.serviceName ? { id: action.serviceId, name: action.serviceName } : undefined,
      responsible: action.responsibleName ? {
        id: action.responsibleId,
        name: action.responsibleName,
        username: action.responsibleUsername
      } : undefined
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
      const user = await this.getUser(currentUserId);
      if (user && user.role !== 'admin') {
        const userObjectives = await this.getObjectives({ currentUserId });
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

  private async createSystemComment(actionId: number, message: string, userId: number): Promise<void> {
    try {
      await db.insert(actionComments).values({
        actionId,
        userId,
        comment: `🤖 SISTEMA: ${message}`,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error creating system comment:', error);
    }
  }

  async createAction(action: InsertAction): Promise<Action> {
    const rows = await db.insert(actions).values(action).returning();
    const newAction = rows[0];

    if (newAction.id && action.responsibleId) {
      const priorityNames: Record<string, string> = {
        'low': 'Baixa', 'medium': 'Média', 'high': 'Alta', 'critical': 'Crítica'
      };
      const dueDateStr = action.dueDate ? new Date(action.dueDate).toLocaleDateString('pt-BR') : 'não definido';
      const priorityLabel = priorityNames[action.priority || 'medium'] || action.priority || 'Média';
      await this.createSystemComment(
        newAction.id,
        `Ação criada com prioridade "${priorityLabel}" e prazo ${dueDateStr}`,
        action.responsibleId
      );
    }

    return newAction;
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    const current = await db.select().from(actions).where(eq(actions.id, id)).limit(1);
    if (current.length === 0) throw new Error('Action not found');

    const rows = await db.update(actions).set({ ...action, updatedAt: new Date() }).where(eq(actions.id, id)).returning();

    const changes: string[] = [];
    const cur = current[0];

    if (action.status && action.status !== cur.status) {
      const statusNames: Record<string, string> = {
        'pending': 'Pendente', 'in_progress': 'Em Progresso',
        'completed': 'Concluída', 'cancelled': 'Cancelada'
      };
      changes.push(`Status alterado de "${statusNames[cur.status] || cur.status}" para "${statusNames[action.status] || action.status}"`);
    }

    if (action.priority && action.priority !== cur.priority) {
      const priorityNames: Record<string, string> = {
        'low': 'Baixa', 'medium': 'Média', 'high': 'Alta', 'critical': 'Crítica'
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

    if (keyResultId) {
      conditions.push(eq(checkpoints.keyResultId, keyResultId));
    }

    if (currentUserId) {
      const user = await this.getUser(currentUserId);
      if (user && user.role !== 'admin') {
        const userObjectives = await this.getObjectives({ currentUserId });
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

  async getCheckpoint(id: number, currentUserId?: number): Promise<any | undefined> {
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
    const keyResult = await this.getKeyResult(keyResultId);
    if (!keyResult) throw new Error('Key result not found');

    await db.delete(checkpoints).where(eq(checkpoints.keyResultId, keyResultId));

    const startDate = new Date(keyResult.startDate);
    const endDate = new Date(keyResult.endDate);
    const frequency = keyResult.frequency;
    const totalTarget = Number(keyResult.targetValue);

    const periods: { number: number; dueDate: Date }[] = [];
    let currentDate = new Date(startDate);
    let checkpointNumber = 1;

    while (currentDate <= endDate) {
      let nextDate: Date;
      switch (frequency) {
        case 'weekly':
          nextDate = new Date(currentDate);
          nextDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          nextDate = new Date(currentDate);
          nextDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          nextDate = new Date(currentDate);
          nextDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate = new Date(currentDate);
          nextDate.setMonth(currentDate.getMonth() + 3);
          break;
        default:
          nextDate = new Date(endDate);
      }

      if (nextDate > endDate) nextDate = endDate;
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
      const targetValue = isLastCheckpoint ? totalTarget : (totalTarget / totalPeriods) * (i + 1);

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
        actualValue: "0",
        status: "pending",
        dueDate: new Date(period.dueDate),
      }).returning();

      if (rows[0]) createdCheckpoints.push(rows[0]);
    }

    return createdCheckpoints;
  }

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

  async createStrategicIndicator(data: { name: string; code: string; description?: string; unit?: string }): Promise<StrategicIndicator> {
    const rows = await db.insert(strategicIndicators).values(data).returning();
    return rows[0];
  }

  async updateStrategicIndicator(id: number, data: { name: string; code: string; description?: string; unit?: string }): Promise<StrategicIndicator> {
    const rows = await db.update(strategicIndicators).set(data).where(eq(strategicIndicators.id, id)).returning();
    return rows[0];
  }

  async deleteStrategicIndicator(id: number): Promise<void> {
    await db.delete(strategicIndicators).where(eq(strategicIndicators.id, id));
  }

  async createRegion(data: { name: string; code: string }): Promise<Region> {
    const rows = await db.insert(regionsTable).values(data).returning();
    return rows[0];
  }

  async updateRegion(id: number, data: { name: string; code: string }): Promise<Region> {
    const rows = await db.update(regionsTable).set(data).where(eq(regionsTable.id, id)).returning();
    return rows[0];
  }

  async deleteRegion(id: number): Promise<void> {
    await db.delete(regionsTable).where(eq(regionsTable.id, id));
  }

  async createSubRegion(data: { name: string; code: string; regionId: number }): Promise<SubRegion> {
    const rows = await db.insert(subRegionsTable).values(data).returning();
    return rows[0];
  }

  async updateSubRegion(id: number, data: { name: string; code: string; regionId: number }): Promise<SubRegion> {
    const rows = await db.update(subRegionsTable).set(data).where(eq(subRegionsTable.id, id)).returning();
    return rows[0];
  }

  async deleteSubRegion(id: number): Promise<void> {
    await db.delete(subRegionsTable).where(eq(subRegionsTable.id, id));
  }

  async createSolution(data: { name: string; code: string; description?: string }): Promise<Solution> {
    const rows = await db.insert(solutionsTable).values(data).returning();
    return rows[0];
  }

  async updateSolution(id: number, data: { name: string; code: string; description?: string }): Promise<Solution> {
    const rows = await db.update(solutionsTable).set(data).where(eq(solutionsTable.id, id)).returning();
    return rows[0];
  }

  async deleteSolution(id: number): Promise<void> {
    await db.delete(solutionsTable).where(eq(solutionsTable.id, id));
  }

  async createServiceLine(data: { name: string; code: string; description?: string; solutionId: number }): Promise<ServiceLine> {
    const rows = await db.insert(serviceLines).values(data).returning();
    return rows[0];
  }

  async updateServiceLine(id: number, data: { name: string; code: string; description?: string; solutionId: number }): Promise<ServiceLine> {
    const rows = await db.update(serviceLines).set(data).where(eq(serviceLines.id, id)).returning();
    return rows[0];
  }

  async deleteServiceLine(id: number): Promise<void> {
    await db.delete(serviceLines).where(eq(serviceLines.id, id));
  }

  async createService(data: { name: string; code: string; description?: string; serviceLineId: number }): Promise<Service> {
    const rows = await db.insert(services).values(data).returning();
    return rows[0];
  }

  async updateService(id: number, data: { name: string; code: string; description?: string; serviceLineId: number }): Promise<Service> {
    const rows = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return rows[0];
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }
}

export const storage = new PgStorage();
