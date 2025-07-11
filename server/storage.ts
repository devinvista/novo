import { 
  users, regions, subRegions, serviceLines, strategicIndicators, 
  objectives, keyResults, actions, checkpoints, activities,
  solutions, services,
  type User, type InsertUser, type Objective, type InsertObjective,
  type KeyResult, type InsertKeyResult, type Action, type InsertAction,
  type Checkpoint, type InsertCheckpoint, type Region, type SubRegion,
  type ServiceLine, type StrategicIndicator, type Activity,
  type Solution, type Service
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  }): Promise<(Objective & { 
    owner: User; 
    region?: Region; 
    subRegion?: SubRegion; 
    serviceLine?: ServiceLine 
  })[]>;
  getObjective(id: number): Promise<Objective | undefined>;
  createObjective(objective: InsertObjective): Promise<Objective>;
  updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective>;
  deleteObjective(id: number): Promise<void>;

  // Key Results
  getKeyResults(objectiveId?: number): Promise<(KeyResult & { 
    objective: Objective; 
    strategicIndicator?: StrategicIndicator 
  })[]>;
  getKeyResult(id: number): Promise<KeyResult | undefined>;
  createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult>;
  updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult>;
  deleteKeyResult(id: number): Promise<void>;

  // Actions
  getActions(keyResultId?: number): Promise<(Action & { 
    keyResult: KeyResult; 
    strategicIndicator?: StrategicIndicator;
    responsible?: User 
  })[]>;
  getAction(id: number): Promise<Action | undefined>;
  createAction(action: InsertAction): Promise<Action>;
  updateAction(id: number, action: Partial<InsertAction>): Promise<Action>;
  deleteAction(id: number): Promise<void>;

  // Checkpoints
  getCheckpoints(keyResultId?: number): Promise<Checkpoint[]>;
  getCheckpoint(id: number): Promise<Checkpoint | undefined>;
  createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint>;
  updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint>;
  generateCheckpoints(keyResultId: number): Promise<Checkpoint[]>;

  // Activities
  getRecentActivities(limit?: number): Promise<(Activity & { user: User })[]>;
  logActivity(activity: {
    userId: number;
    entityType: string;
    entityId: number;
    action: string;
    description: string;
    oldValues?: any;
    newValues?: any;
  }): Promise<Activity>;

  // Analytics
  getDashboardKPIs(filters?: {
    regionId?: number;
    subRegionId?: number;
  }): Promise<{
    totalObjectives: number;
    totalKeyResults: number;
    averageProgress: number;
    totalActions: number;
    completedActions: number;
    overallProgress: number;
  }>;

  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getRegions(): Promise<Region[]> {
    return await db.select().from(regions).orderBy(asc(regions.name));
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    const query = db.select().from(subRegions);
    if (regionId) {
      query.where(eq(subRegions.regionId, regionId));
    }
    return await query.orderBy(asc(subRegions.name));
  }

  async getSolutions(): Promise<Solution[]> {
    return await db.select().from(solutions).orderBy(asc(solutions.name));
  }

  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    const query = db.select().from(serviceLines);
    if (solutionId) {
      query.where(eq(serviceLines.solutionId, solutionId));
    }
    return await query.orderBy(asc(serviceLines.name));
  }

  async getServices(serviceLineId?: number): Promise<Service[]> {
    const query = db.select().from(services);
    if (serviceLineId) {
      query.where(eq(services.serviceLineId, serviceLineId));
    }
    return await query.orderBy(asc(services.name));
  }

  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    return await db.select().from(strategicIndicators)
      .where(eq(strategicIndicators.active, true))
      .orderBy(asc(strategicIndicators.name));
  }

  async getObjectives(filters?: {
    regionId?: number;
    subRegionId?: number;
    ownerId?: number;
  }): Promise<(Objective & { 
    owner: User; 
    region?: Region; 
    subRegion?: SubRegion; 
  })[]> {
    let query = db
      .select({
        id: objectives.id,
        title: objectives.title,
        description: objectives.description,
        ownerId: objectives.ownerId,
        regionId: objectives.regionId,
        subRegionId: objectives.subRegionId,
        startDate: objectives.startDate,
        endDate: objectives.endDate,
        status: objectives.status,
        progress: objectives.progress,
        createdAt: objectives.createdAt,
        updatedAt: objectives.updatedAt,
        owner: {
          id: users.id,
          username: users.username,
          name: users.name,
          email: users.email,
          role: users.role,
          password: users.password,
          createdAt: users.createdAt,
        },
        region: {
          id: regions.id,
          name: regions.name,
          code: regions.code,
        },
        subRegion: {
          id: subRegions.id,
          name: subRegions.name,
          code: subRegions.code,
          regionId: subRegions.regionId,
        },

      })
      .from(objectives)
      .innerJoin(users, eq(objectives.ownerId, users.id))
      .leftJoin(regions, eq(objectives.regionId, regions.id))
      .leftJoin(subRegions, eq(objectives.subRegionId, subRegions.id));

    if (filters) {
      const conditions = [];
      if (filters.regionId) conditions.push(eq(objectives.regionId, filters.regionId));
      if (filters.subRegionId) conditions.push(eq(objectives.subRegionId, filters.subRegionId));
      if (filters.ownerId) conditions.push(eq(objectives.ownerId, filters.ownerId));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }

    const results = await query.orderBy(desc(objectives.createdAt));

    return results.map(result => ({
      ...result,
      owner: result.owner as User,
      region: result.region as Region | undefined,
      subRegion: result.subRegion as SubRegion | undefined,
    }));
  }

  async getObjective(id: number): Promise<Objective | undefined> {
    const [objective] = await db.select().from(objectives).where(eq(objectives.id, id));
    return objective || undefined;
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    const [created] = await db
      .insert(objectives)
      .values({
        ...objective,
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    const [updated] = await db
      .update(objectives)
      .set({
        ...objective,
        updatedAt: new Date(),
      })
      .where(eq(objectives.id, id))
      .returning();
    return updated;
  }

  async deleteObjective(id: number): Promise<void> {
    await db.delete(objectives).where(eq(objectives.id, id));
  }

  async getKeyResults(objectiveId?: number): Promise<(KeyResult & { objective: Objective; strategicIndicator?: StrategicIndicator })[]> {
    // Get key results with objectives
    let baseQuery = db
      .select({
        id: keyResults.id,
        objectiveId: keyResults.objectiveId,
        title: keyResults.title,
        description: keyResults.description,
        strategicIndicatorIds: keyResults.strategicIndicatorIds,
        targetValue: keyResults.targetValue,
        currentValue: keyResults.currentValue,
        initialValue: keyResults.initialValue,
        unit: keyResults.unit,
        frequency: keyResults.frequency,
        startDate: keyResults.startDate,
        endDate: keyResults.endDate,
        progress: keyResults.progress,
        status: keyResults.status,
        createdAt: keyResults.createdAt,
        updatedAt: keyResults.updatedAt,
        objective: objectives,
      })
      .from(keyResults)
      .innerJoin(objectives, eq(keyResults.objectiveId, objectives.id));

    if (objectiveId) {
      baseQuery = baseQuery.where(eq(keyResults.objectiveId, objectiveId));
    }

    const keyResultsData = await baseQuery.orderBy(keyResults.createdAt);

    // Get all strategic indicators
    const indicators = await db.select().from(strategicIndicators);

    // Map results with strategic indicators
    return keyResultsData.map(row => {
      let strategicIndicator = undefined;

      if (row.strategicIndicatorIds && row.strategicIndicatorIds.length > 0) {
        strategicIndicator = indicators.find(indicator => 
          row.strategicIndicatorIds!.includes(indicator.id)
        );
      }

      return {
        ...row,
        strategicIndicator,
      };
    });
  }

  async getKeyResult(id: number): Promise<KeyResult | undefined> {
    const [keyResult] = await db.select().from(keyResults).where(eq(keyResults.id, id));
    return keyResult || undefined;
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    // Handle the conversion from strategicIndicatorId to strategicIndicatorIds array
    const { strategicIndicatorId, ...keyResultData } = keyResult as any;

    const dataToInsert = {
      ...keyResultData,
      strategicIndicatorIds: keyResultData.strategicIndicatorIds || (strategicIndicatorId ? [strategicIndicatorId] : []),
      updatedAt: new Date(),
    };

    const [created] = await db
      .insert(keyResults)
      .values(dataToInsert)
      .returning();

    // Checkpoints will be generated separately if needed

    return created;
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    const [updated] = await db
      .update(keyResults)
      .set({
        ...keyResult,
        updatedAt: new Date(),
      })
      .where(eq(keyResults.id, id))
      .returning();
    return updated;
  }

  async deleteKeyResult(id: number): Promise<void> {
    await db.delete(keyResults).where(eq(keyResults.id, id));
  }

  async getActions(keyResultId?: number): Promise<(Action & { 
    keyResult: KeyResult; 
    strategicIndicator?: StrategicIndicator;
    responsible?: User 
  })[]> {
    let query = db
      .select({
        id: actions.id,
        keyResultId: actions.keyResultId,
        title: actions.title,
        description: actions.description,
        number: actions.number,
        strategicIndicatorId: actions.strategicIndicatorId,
        responsibleId: actions.responsibleId,
        dueDate: actions.dueDate,
        status: actions.status,
        priority: actions.priority,
        createdAt: actions.createdAt,
        updatedAt: actions.updatedAt,
        keyResult: keyResults,
        strategicIndicator: strategicIndicators,
        responsible: users,
      })
      .from(actions)
      .innerJoin(keyResults, eq(actions.keyResultId, keyResults.id))
      .leftJoin(strategicIndicators, eq(actions.strategicIndicatorId, strategicIndicators.id))
      .leftJoin(users, eq(actions.responsibleId, users.id));

    if (keyResultId) {
      query = query.where(eq(actions.keyResultId, keyResultId));
    }

    const results = await query.orderBy(asc(actions.number));

    return results.map(result => ({
      ...result,
      keyResult: result.keyResult as KeyResult,
      strategicIndicator: result.strategicIndicator as StrategicIndicator | undefined,
      responsible: result.responsible as User | undefined,
    }));
  }

  async getAction(id: number): Promise<Action | undefined> {
    const [action] = await db.select().from(actions).where(eq(actions.id, id));
    return action || undefined;
  }

  async createAction(action: InsertAction): Promise<Action> {
    // Get next number for this key result
    const [maxNumber] = await db
      .select({ max: sql<number>`MAX(${actions.number})` })
      .from(actions)
      .where(eq(actions.keyResultId, action.keyResultId));

    const nextNumber = (maxNumber.max || 0) + 1;

    const [created] = await db
      .insert(actions)
      .values({
        ...action,
        number: nextNumber,
      })
      .returning();
    return created;
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    const [updated] = await db
      .update(actions)
      .set({
        ...action,
        updatedAt: new Date(),
      })
      .where(eq(actions.id, id))
      .returning();
    return updated;
  }

  async deleteAction(id: number): Promise<void> {
    await db.delete(actions).where(eq(actions.id, id));
  }

  async getCheckpoints(keyResultId?: number): Promise<Checkpoint[]> {
    let query = db.select().from(checkpoints);

    if (keyResultId) {
      query = query.where(eq(checkpoints.keyResultId, keyResultId));
    }

    const result = await query.orderBy(asc(checkpoints.period));
    console.log(`Retrieved ${result.length} checkpoints for keyResultId: ${keyResultId}`);
    return result;
  }

  async getCheckpoint(id: number): Promise<Checkpoint | undefined> {
    const [checkpoint] = await db.select().from(checkpoints).where(eq(checkpoints.id, id));
    return checkpoint || undefined;
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    const [created] = await db
      .insert(checkpoints)
      .values({
        ...checkpoint,
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint> {
    const [updated] = await db
      .update(checkpoints)
      .set({
        ...checkpoint,
        updatedAt: new Date(),
      })
      .where(eq(checkpoints.id, id))
      .returning();
    return updated;
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    try {
      const keyResult = await this.getKeyResult(keyResultId);
      if (!keyResult) throw new Error("Key result not found");



      // Delete existing checkpoints first
      await db.delete(checkpoints).where(eq(checkpoints.keyResultId, keyResultId));

      const targetValue = parseFloat(keyResult.targetValue);
      const initialValue = parseFloat(keyResult.initialValue);
      
      // Get the raw date strings from the database since Drizzle mapping is having issues
      const rawResult = await pool.query(
        'SELECT start_date, end_date FROM key_results WHERE id = $1',
        [keyResultId]
      );
      
      if (!rawResult || !rawResult.rows || rawResult.rows.length === 0) {
        console.warn("Key result not found in database", keyResultId);
        return [];
      }
      
      const row = rawResult.rows[0];
      const start_date = row.start_date;
      const end_date = row.end_date;
      console.log("Raw dates from DB:", start_date, end_date);
      
      // Convert PostgreSQL date objects to JavaScript dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

    console.log("Parsed dates:", startDate, endDate);
    console.log("Start date valid:", !isNaN(startDate.getTime()), "End date valid:", !isNaN(endDate.getTime()));

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn("Invalid start or end date for key result", keyResultId);
      return [];
    }

    if (startDate >= endDate) {
      console.warn("Start date is not before end date for key result", keyResultId);
      return [];
    }

    let periods: string[] = [];

    // Generate periods based on frequency
    switch (keyResult.frequency) {
      case 'weekly':
        periods = this.getWeeksBetween(startDate, endDate);
        break;
      case 'monthly':
        periods = this.getMonthsBetween(startDate, endDate);
        break;
      case 'quarterly':
        periods = this.getQuartersBetween(startDate, endDate);
        break;
      case 'daily':
        // For daily frequency, create weekly checkpoints to avoid too many records
        periods = this.getWeeksBetween(startDate, endDate);
        break;
      default:
        periods = this.getMonthsBetween(startDate, endDate);
    }



    if (periods.length === 0) {
      console.warn("No periods generated for key result", keyResultId);
      return [];
    }

    // Calculate proportional targets (cumulative progress)
    const totalIncrease = targetValue - initialValue;
    const checkpointsData = periods.map((period, index) => {
      const progressRatio = (index + 1) / periods.length;
      const cumulativeTarget = initialValue + (totalIncrease * progressRatio);
      
      return {
        keyResultId,
        period,
        targetValue: cumulativeTarget.toFixed(2),
        actualValue: initialValue.toFixed(2),
        status: "pendente" as const,
      };
    });

    // Insert all checkpoints at once for better performance
    const createdCheckpoints = await db
      .insert(checkpoints)
      .values(checkpointsData)
      .returning();


      return createdCheckpoints;
    } catch (error) {
      console.error("Error in generateCheckpoints:", error);
      throw error;
    }
  }

  private getMonthsBetween(start: Date, end: Date): string[] {
    const months = [];
    const current = new Date(start);

    while (current <= end) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  private getQuartersBetween(start: Date, end: Date): string[] {
    const quarters = [];
    const current = new Date(start);

    while (current <= end) {
      const quarter = Math.floor(current.getMonth() / 3) + 1;
      const quarterStr = `${current.getFullYear()}-Q${quarter}`;
      if (!quarters.includes(quarterStr)) {
        quarters.push(quarterStr);
      }
      current.setMonth(current.getMonth() + 3);
    }

    return quarters;
  }

  private getWeeksBetween(start: Date, end: Date): string[] {
    const weeks = [];
    const current = new Date(start);

    while (current <= end) {
      const weekNumber = this.getWeekNumber(current);
      weeks.push(`${current.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`);
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  private getWeekNumber(date: Date): number {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstDay.getDay() + 1) / 7);
  }

  async getRecentActivities(limit = 10): Promise<(Activity & { user: User })[]> {
    const results = await db
      .select({
        id: activities.id,
        userId: activities.userId,
        entityType: activities.entityType,
        entityId: activities.entityId,
        action: activities.action,
        description: activities.description,
        oldValues: activities.oldValues,
        newValues: activities.newValues,
        createdAt: activities.createdAt,
        user: users,
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return results.map(result => ({
      ...result,
      user: result.user as User,
    }));
  }

  async logActivity(activity: {
    userId: number;
    entityType: string;
    entityId: number;
    action: string;
    description: string;
    oldValues?: any;
    newValues?: any;
  }): Promise<Activity> {
    const [created] = await db
      .insert(activities)
      .values({
        userId: activity.userId,
        entityType: activity.entityType,
        entityId: activity.entityId,
        action: activity.action,
        description: activity.description,
        oldValues: activity.oldValues,
        newValues: activity.newValues,
      })
      .returning();
    return created;
  }

  async getDashboardKPIs(filters?: {
    regionId?: number;
    subRegionId?: number;
    period?: string;
  }): Promise<{
    totalObjectives: number;
    totalKeyResults: number;
    averageProgress: number;
    totalActions: number;
    completedActions: number;
    overallProgress: number;
  }> {
    // Build filter conditions
    const objectiveConditions = [];
    if (filters?.regionId) objectiveConditions.push(eq(objectives.regionId, filters.regionId));
    if (filters?.subRegionId) objectiveConditions.push(eq(objectives.subRegionId, filters.subRegionId));

    // Get objectives count and average progress
    let objectivesQuery = db
      .select({
        count: sql<number>`COUNT(*)`,
        avgProgress: sql<number>`AVG(${objectives.progress})`,
      })
      .from(objectives)
      .where(eq(objectives.status, 'active'));

    if (objectiveConditions.length > 0) {
      objectivesQuery = objectivesQuery.where(and(...objectiveConditions));
    }

    const [objectiveStats] = await objectivesQuery;

    // Get key results count
    let keyResultsQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(keyResults)
      .innerJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .where(eq(keyResults.status, 'active'));

    if (objectiveConditions.length > 0) {
      keyResultsQuery = keyResultsQuery.where(and(...objectiveConditions));
    }

    const [keyResultStats] = await keyResultsQuery;

    // Get actions count
    let actionsQuery = db
      .select({ 
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN ${actions.status} = 'completed' THEN 1 ELSE 0 END)`,
      })
      .from(actions)
      .innerJoin(keyResults, eq(actions.keyResultId, keyResults.id))
      .innerJoin(objectives, eq(keyResults.objectiveId, objectives.id));

    if (objectiveConditions.length > 0) {
      actionsQuery = actionsQuery.where(and(...objectiveConditions));
    }

    const [actionStats] = await actionsQuery;

    return {
      totalObjectives: Number(objectiveStats.count) || 0,
      totalKeyResults: Number(keyResultStats.count) || 0,
      averageProgress: Number(objectiveStats.avgProgress) || 0,
      totalActions: Number(actionStats.total) || 0,
      completedActions: Number(actionStats.completed) || 0,
      overallProgress: Number(objectiveStats.avgProgress) || 0,
    };
  }
}

export const storage = new DatabaseStorage();