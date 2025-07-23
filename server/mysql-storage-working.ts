import { 
  users, regions, subRegions, serviceLines, strategicIndicators, 
  objectives, keyResults, actions, checkpoints, actionComments,
  solutions, services,
  type User, type InsertUser, type Objective, type InsertObjective,
  type KeyResult, type InsertKeyResult, type Action, type InsertAction,
  type Checkpoint, type InsertCheckpoint, type Region, type SubRegion,
  type ServiceLine, type StrategicIndicator,
  type Solution, type Service, type ActionComment, type InsertActionComment
} from "@shared/schema";
import { db, connection } from "./db";
import { eq, and, desc, sql, asc, inArray } from "drizzle-orm";
import session from "express-session";
// @ts-ignore - memorystore types are outdated
import MemoryStore from "memorystore";
import { getQuarterlyPeriods, getQuarterlyPeriod, getCurrentQuarter, formatQuarter } from "./quarterly-periods";

export interface IStorage {
  // User management
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

  // Reference data
  getRegions(): Promise<Region[]>;
  getSubRegions(regionId?: number): Promise<SubRegion[]>;
  getSolutions(): Promise<Solution[]>;
  getServiceLines(solutionId?: number): Promise<ServiceLine[]>;
  getServices(serviceLineId?: number): Promise<Service[]>;
  getStrategicIndicators(): Promise<StrategicIndicator[]>;

  // Objectives
  getObjectives(filters?: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
    ownerId?: number;
    currentUserId?: number;
  }): Promise<(Objective & { 
    owner: User; 
    region?: Region; 
    subRegion?: SubRegion; 
    serviceLine?: ServiceLine 
  })[]>;
  getObjective(id: number, currentUserId?: number): Promise<Objective | undefined>;
  createObjective(objective: InsertObjective): Promise<Objective>;
  updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective>;
  deleteObjective(id: number): Promise<void>;

  // Key Results
  getKeyResults(objectiveId?: number, currentUserId?: number): Promise<(KeyResult & { 
    objective: Objective; 
    strategicIndicator?: StrategicIndicator 
  })[]>;
  getKeyResult(id: number, currentUserId?: number): Promise<KeyResult | undefined>;
  createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult>;
  updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult>;
  deleteKeyResult(id: number): Promise<void>;

  // Actions
  getActions(keyResultId?: number, currentUserId?: number): Promise<(Action & { 
    keyResult: KeyResult; 
    responsible?: User 
  })[]>;
  getAction(id: number, currentUserId?: number): Promise<Action | undefined>;
  createAction(action: InsertAction): Promise<Action>;
  updateAction(id: number, action: Partial<InsertAction>): Promise<Action>;
  deleteAction(id: number): Promise<void>;

  // Checkpoints
  getCheckpoints(keyResultId?: number, currentUserId?: number): Promise<Checkpoint[]>;
  getCheckpoint(id: number, currentUserId?: number): Promise<Checkpoint | undefined>;
  createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint>;
  updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint>;
  generateCheckpoints(keyResultId: number): Promise<Checkpoint[]>;
  deleteCheckpoint(id: number): Promise<void>;

  // Action Comments
  getActionComments(actionId: number): Promise<(ActionComment & { user: User })[]>;
  createActionComment(comment: InsertActionComment): Promise<ActionComment>;

  // Dashboard and Analytics
  getDashboardKPIs(filters?: { quarter?: string; currentUserId?: number }): Promise<{
    totalObjectives: number;
    totalKeyResults: number;
    totalActions: number;
    completedObjectives: number;
    completedKeyResults: number;
    completedActions: number;
    averageProgress: number;
  }>;
  
  // Quarterly data
  getQuarterlyPeriods(): Promise<string[]>;
  getQuarterlyData(period: string, currentUserId?: number): Promise<{
    objectives: (Objective & { owner: User; region?: Region; subRegion?: SubRegion })[];
    keyResults: (KeyResult & { objective: Objective })[];
    actions: (Action & { keyResult: KeyResult; responsible?: User })[];
  }>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MySQLStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Use MemoryStore for session management in Replit
    const MemoryStoreClass = MemoryStore(session);
    this.sessionStore = new MemoryStoreClass({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.name));
  }

  async getManagers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "gestor")).orderBy(asc(users.name));
  }

  async getPendingUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.approved, false)).orderBy(desc(users.createdAt));
  }

  async createUser(user: InsertUser): Promise<User> {
    const insertResult = await db.insert(users).values(user);
    const insertId = insertResult.insertId;
    const newUser = await this.getUser(Number(insertId));
    if (!newUser) throw new Error('Failed to create user');
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    await db.update(users).set({
      ...user,
      updatedAt: sql`CURRENT_TIMESTAMP`
    }).where(eq(users.id, id));
    
    const updatedUser = await this.getUser(id);
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
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

    await db.update(users).set(updateData).where(eq(users.id, id));
    
    const approvedUser = await this.getUser(id);
    if (!approvedUser) throw new Error('User not found');
    return approvedUser;
  }

  async approveUserWithPermissions(id: number, approvedBy: number, permissions: {
    regionIds: number[];
    subRegionIds: number[];
    solutionIds: number[];
    serviceLineIds: number[];
    serviceIds: number[];
  }): Promise<User> {
    await db.update(users).set({
      approved: true,
      approvedAt: new Date(),
      approvedBy,
      regionIds: permissions.regionIds,
      subRegionIds: permissions.subRegionIds,
      solutionIds: permissions.solutionIds,
      serviceLineIds: permissions.serviceLineIds,
      serviceIds: permissions.serviceIds,
    }).where(eq(users.id, id));
    
    const approvedUser = await this.getUser(id);
    if (!approvedUser) throw new Error('User not found');
    return approvedUser;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Reference data methods
  async getRegions(): Promise<Region[]> {
    return db.select().from(regions).orderBy(asc(regions.name));
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    const query = db.select().from(subRegions);
    if (regionId) {
      query.where(eq(subRegions.regionId, regionId));
    }
    return query.orderBy(asc(subRegions.name));
  }

  async getSolutions(): Promise<Solution[]> {
    return db.select().from(solutions).orderBy(asc(solutions.name));
  }

  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    const query = db.select().from(serviceLines);
    if (solutionId) {
      query.where(eq(serviceLines.solutionId, solutionId));
    }
    return query.orderBy(asc(serviceLines.name));
  }

  async getServices(serviceLineId?: number): Promise<Service[]> {
    const query = db.select().from(services);
    if (serviceLineId) {
      query.where(eq(services.serviceLineId, serviceLineId));
    }
    return query.orderBy(asc(services.name));
  }

  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    return db.select().from(strategicIndicators).orderBy(asc(strategicIndicators.name));
  }

  // Objectives methods
  async getObjectives(filters: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
    ownerId?: number;
    currentUserId?: number;
  } = {}): Promise<(Objective & { 
    owner: User; 
    region?: Region; 
    subRegion?: SubRegion; 
    serviceLine?: ServiceLine 
  })[]> {
    let query = db.select({
      ...objectives,
      owner: users,
      region: regions,
      subRegion: subRegions,
      serviceLine: serviceLines,
    })
    .from(objectives)
    .leftJoin(users, eq(objectives.ownerId, users.id))
    .leftJoin(regions, eq(objectives.regionId, regions.id))
    .leftJoin(subRegions, eq(objectives.subRegionId, subRegions.id))
    .leftJoin(serviceLines, eq(objectives.serviceLineId, serviceLines.id));

    const conditions = [];
    if (filters.regionId) conditions.push(eq(objectives.regionId, filters.regionId));
    if (filters.subRegionId) conditions.push(eq(objectives.subRegionId, filters.subRegionId));
    if (filters.serviceLineId) conditions.push(eq(objectives.serviceLineId, filters.serviceLineId));
    if (filters.ownerId) conditions.push(eq(objectives.ownerId, filters.ownerId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(objectives.createdAt));
    
    return results.map(row => ({
      ...row.objectives,
      owner: row.users!,
      region: row.regions || undefined,
      subRegion: row.sub_regions || undefined,
      serviceLine: row.service_lines || undefined,
    }));
  }

  async getObjective(id: number, currentUserId?: number): Promise<Objective | undefined> {
    const result = await db.select().from(objectives).where(eq(objectives.id, id)).limit(1);
    return result[0];
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    const insertResult = await db.insert(objectives).values({
      ...objective,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const insertId = insertResult.insertId;
    const newObjective = await this.getObjective(Number(insertId));
    if (!newObjective) throw new Error('Failed to create objective');
    return newObjective;
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    await db.update(objectives).set({
      ...objective,
      updatedAt: new Date(),
    }).where(eq(objectives.id, id));
    
    const updatedObjective = await this.getObjective(id);
    if (!updatedObjective) throw new Error('Objective not found');
    return updatedObjective;
  }

  async deleteObjective(id: number): Promise<void> {
    await db.delete(objectives).where(eq(objectives.id, id));
  }

  // Key Results methods
  async getKeyResults(objectiveId?: number, currentUserId?: number): Promise<(KeyResult & { 
    objective: Objective; 
    strategicIndicator?: StrategicIndicator 
  })[]> {
    let query = db.select({
      ...keyResults,
      objective: objectives,
    })
    .from(keyResults)
    .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id));

    if (objectiveId) {
      query = query.where(eq(keyResults.objectiveId, objectiveId));
    }

    const results = await query.orderBy(desc(keyResults.createdAt));
    
    return results.map(row => ({
      ...row.key_results,
      objective: row.objectives!,
      strategicIndicator: undefined, // We'll handle strategic indicators separately
    }));
  }

  async getKeyResult(id: number, currentUserId?: number): Promise<KeyResult | undefined> {
    const result = await db.select().from(keyResults).where(eq(keyResults.id, id)).limit(1);
    return result[0];
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    const insertResult = await db.insert(keyResults).values({
      ...keyResult,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const insertId = insertResult.insertId;
    const newKeyResult = await this.getKeyResult(Number(insertId));
    if (!newKeyResult) throw new Error('Failed to create key result');
    
    // Generate checkpoints automatically
    await this.generateCheckpoints(Number(insertId));
    
    return newKeyResult;
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    const updateData: any = {
      ...keyResult,
      updatedAt: new Date(),
    };

    // Handle strategic indicator IDs array
    if (keyResult.strategicIndicatorIds) {
      updateData.strategicIndicatorIds = keyResult.strategicIndicatorIds;
    }

    await db.update(keyResults).set(updateData).where(eq(keyResults.id, id));
    
    const updatedKeyResult = await this.getKeyResult(id);
    if (!updatedKeyResult) throw new Error('Key result not found');
    return updatedKeyResult;
  }

  async deleteKeyResult(id: number): Promise<void> {
    await db.delete(keyResults).where(eq(keyResults.id, id));
  }

  // Actions methods
  async getActions(keyResultId?: number, currentUserId?: number): Promise<(Action & { 
    keyResult: KeyResult; 
    responsible?: User 
  })[]> {
    let query = db.select({
      ...actions,
      keyResult: keyResults,
      responsible: users,
    })
    .from(actions)
    .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
    .leftJoin(users, eq(actions.responsibleId, users.id));

    if (keyResultId) {
      query = query.where(eq(actions.keyResultId, keyResultId));
    }

    const results = await query.orderBy(desc(actions.createdAt));
    
    return results.map(row => ({
      ...row.actions,
      keyResult: row.key_results!,
      responsible: row.users || undefined,
    }));
  }

  async getAction(id: number, currentUserId?: number): Promise<Action | undefined> {
    const result = await db.select().from(actions).where(eq(actions.id, id)).limit(1);
    return result[0];
  }

  async createAction(action: InsertAction): Promise<Action> {
    // Get the next action number for this key result
    const existingActions = await db.select({ number: actions.number })
      .from(actions)
      .where(eq(actions.keyResultId, action.keyResultId))
      .orderBy(desc(actions.number))
      .limit(1);
    
    const nextNumber = existingActions.length > 0 ? existingActions[0].number + 1 : 1;

    const insertResult = await db.insert(actions).values({
      ...action,
      number: nextNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const insertId = insertResult.insertId;
    const newAction = await this.getAction(Number(insertId));
    if (!newAction) throw new Error('Failed to create action');
    return newAction;
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    await db.update(actions).set({
      ...action,
      updatedAt: new Date(),
    }).where(eq(actions.id, id));
    
    const updatedAction = await this.getAction(id);
    if (!updatedAction) throw new Error('Action not found');
    return updatedAction;
  }

  async deleteAction(id: number): Promise<void> {
    await db.delete(actions).where(eq(actions.id, id));
  }

  // Checkpoints methods
  async getCheckpoints(keyResultId?: number, currentUserId?: number): Promise<Checkpoint[]> {
    let query = db.select().from(checkpoints);
    
    if (keyResultId) {
      query = query.where(eq(checkpoints.keyResultId, keyResultId));
    }

    return query.orderBy(asc(checkpoints.dueDate));
  }

  async getCheckpoint(id: number, currentUserId?: number): Promise<Checkpoint | undefined> {
    const result = await db.select().from(checkpoints).where(eq(checkpoints.id, id)).limit(1);
    return result[0];
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    const insertResult = await db.insert(checkpoints).values({
      ...checkpoint,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const insertId = insertResult.insertId;
    const newCheckpoint = await this.getCheckpoint(Number(insertId));
    if (!newCheckpoint) throw new Error('Failed to create checkpoint');
    return newCheckpoint;
  }

  async updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint> {
    await db.update(checkpoints).set({
      ...checkpoint,
      updatedAt: new Date(),
    }).where(eq(checkpoints.id, id));
    
    const updatedCheckpoint = await this.getCheckpoint(id);
    if (!updatedCheckpoint) throw new Error('Checkpoint not found');
    return updatedCheckpoint;
  }

  async deleteCheckpoint(id: number): Promise<void> {
    await db.delete(checkpoints).where(eq(checkpoints.id, id));
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    // Get the key result details
    const keyResult = await this.getKeyResult(keyResultId);
    if (!keyResult) throw new Error('Key result not found');

    // Delete existing checkpoints
    await db.delete(checkpoints).where(eq(checkpoints.keyResultId, keyResultId));

    // Generate new checkpoints based on frequency
    const checkpointsToCreate = [];
    const startDate = new Date(keyResult.startDate);
    const endDate = new Date(keyResult.endDate);
    const frequency = keyResult.frequency;
    
    let currentDate = new Date(startDate);
    let checkpointNumber = 1;
    
    while (currentDate <= endDate) {
      let nextDate: Date;
      
      switch (frequency) {
        case 'weekly':
          nextDate = new Date(currentDate);
          nextDate.setDate(currentDate.getDate() + 7);
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
      
      const targetValue = Number(keyResult.targetValue) / this.getFrequencyCount(frequency, startDate, endDate) * checkpointNumber;
      
      checkpointsToCreate.push({
        keyResultId,
        title: `Checkpoint ${checkpointNumber}`,
        targetValue: targetValue.toString(),
        actualValue: "0",
        status: "pending" as const,
        dueDate: nextDate.toISOString().split('T')[0],
      });
      
      currentDate = new Date(nextDate);
      currentDate.setDate(currentDate.getDate() + 1);
      checkpointNumber++;
      
      if (nextDate >= endDate) break;
    }

    // Insert all checkpoints
    const createdCheckpoints: Checkpoint[] = [];
    for (const checkpoint of checkpointsToCreate) {
      const created = await this.createCheckpoint(checkpoint);
      createdCheckpoints.push(created);
    }

    return createdCheckpoints;
  }

  private getFrequencyCount(frequency: string, startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    switch (frequency) {
      case 'weekly':
        return Math.ceil(diffDays / 7);
      case 'monthly':
        return Math.ceil(diffDays / 30);
      case 'quarterly':
        return Math.ceil(diffDays / 90);
      default:
        return 1;
    }
  }

  // Action Comments methods
  async getActionComments(actionId: number): Promise<(ActionComment & { user: User })[]> {
    const results = await db.select({
      ...actionComments,
      user: users,
    })
    .from(actionComments)
    .leftJoin(users, eq(actionComments.userId, users.id))
    .where(eq(actionComments.actionId, actionId))
    .orderBy(desc(actionComments.createdAt));
    
    return results.map(row => ({
      ...row.action_comments,
      user: row.users!,
    }));
  }

  async createActionComment(comment: InsertActionComment): Promise<ActionComment> {
    const insertResult = await db.insert(actionComments).values({
      ...comment,
      createdAt: new Date(),
    });
    
    const insertId = insertResult.insertId;
    const result = await db.select().from(actionComments).where(eq(actionComments.id, Number(insertId))).limit(1);
    if (!result[0]) throw new Error('Failed to create action comment');
    return result[0];
  }

  // Dashboard and Analytics
  async getDashboardKPIs(filters: { quarter?: string; currentUserId?: number } = {}): Promise<{
    totalObjectives: number;
    totalKeyResults: number;
    totalActions: number;
    completedObjectives: number;
    completedKeyResults: number;
    completedActions: number;
    averageProgress: number;
  }> {
    // Get counts
    const [objCount] = await db.select({ count: sql<number>`count(*)` }).from(objectives);
    const [krCount] = await db.select({ count: sql<number>`count(*)` }).from(keyResults);
    const [actionCount] = await db.select({ count: sql<number>`count(*)` }).from(actions);
    
    const [completedObj] = await db.select({ count: sql<number>`count(*)` }).from(objectives).where(eq(objectives.status, 'completed'));
    const [completedKr] = await db.select({ count: sql<number>`count(*)` }).from(keyResults).where(eq(keyResults.status, 'completed'));
    const [completedAct] = await db.select({ count: sql<number>`count(*)` }).from(actions).where(eq(actions.status, 'completed'));
    
    const [avgProgress] = await db.select({ avg: sql<number>`avg(CAST(progress AS DECIMAL))` }).from(objectives);

    return {
      totalObjectives: objCount.count,
      totalKeyResults: krCount.count,
      totalActions: actionCount.count,
      completedObjectives: completedObj.count,
      completedKeyResults: completedKr.count,
      completedActions: completedAct.count,
      averageProgress: avgProgress.avg || 0,
    };
  }

  // Quarterly data
  async getQuarterlyPeriods(): Promise<string[]> {
    return getQuarterlyPeriods();
  }

  async getQuarterlyData(period: string, currentUserId?: number): Promise<{
    objectives: (Objective & { owner: User; region?: Region; subRegion?: SubRegion })[];
    keyResults: (KeyResult & { objective: Objective })[];
    actions: (Action & { keyResult: KeyResult; responsible?: User })[];
  }> {
    if (period === 'all') {
      // Return all data
      const allObjectives = await this.getObjectives({ currentUserId });
      const allKeyResults = await this.getKeyResults(undefined, currentUserId);
      const allActions = await this.getActions(undefined, currentUserId);
      
      return {
        objectives: allObjectives,
        keyResults: allKeyResults,
        actions: allActions,
      };
    }

    // Parse quarter period (e.g., "2025-Q1")
    const quarterData = getQuarterlyPeriod(period);
    if (!quarterData) {
      throw new Error(`Invalid quarter format: ${period}`);
    }

    const { startDate, endDate } = quarterData;

    // Get data for the specific quarter
    const quarterObjectives = await db.select({
      ...objectives,
      owner: users,
      region: regions,
      subRegion: subRegions,
    })
    .from(objectives)
    .leftJoin(users, eq(objectives.ownerId, users.id))
    .leftJoin(regions, eq(objectives.regionId, regions.id))
    .leftJoin(subRegions, eq(objectives.subRegionId, subRegions.id))
    .where(
      and(
        sql`${objectives.startDate} <= ${endDate}`,
        sql`${objectives.endDate} >= ${startDate}`
      )
    );

    const quarterKeyResults = await db.select({
      ...keyResults,
      objective: objectives,
    })
    .from(keyResults)
    .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
    .where(
      and(
        sql`${keyResults.startDate} <= ${endDate}`,
        sql`${keyResults.endDate} >= ${startDate}`
      )
    );

    const quarterActions = await db.select({
      ...actions,
      keyResult: keyResults,
      responsible: users,
    })
    .from(actions)
    .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
    .leftJoin(users, eq(actions.responsibleId, users.id))
    .where(
      keyResults.id && and(
        sql`${keyResults.startDate} <= ${endDate}`,
        sql`${keyResults.endDate} >= ${startDate}`
      )
    );

    return {
      objectives: quarterObjectives.map(row => ({
        ...row.objectives,
        owner: row.users!,
        region: row.regions || undefined,
        subRegion: row.sub_regions || undefined,
      })),
      keyResults: quarterKeyResults.map(row => ({
        ...row.key_results,
        objective: row.objectives!,
      })),
      actions: quarterActions.map(row => ({
        ...row.actions,
        keyResult: row.key_results!,
        responsible: row.users || undefined,
      })),
    };
  }
}

// Create singleton instance
export const storage = new MySQLStorage();