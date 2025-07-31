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
import { eq, and, desc, sql, asc } from "drizzle-orm";
import session from "express-session";
import { fabricQueries, connectToFabric } from "./fabric-storage";
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import MemoryStore from 'memorystore';

const MemorySessionStore = MemoryStore(session);

// SQLite fallback database
const sqlite = new Database('okr.db');
const sqliteDb = drizzle(sqlite, { 
  schema: { 
    users, regions, subRegions, serviceLines, strategicIndicators,
    objectives, keyResults, actions, checkpoints, activities,
    solutions, services
  } 
});

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

export class HybridStorage implements IStorage {
  sessionStore: session.SessionStore;
  private fabricConnected: boolean = false;

  constructor() {
    // Use memory store for sessions - simple and works with both databases
    this.sessionStore = new MemorySessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Test Microsoft Fabric connection at startup
    this.testFabricConnection();
  }

  private async testFabricConnection() {
    try {
      this.fabricConnected = await connectToFabric();
      if (this.fabricConnected) {
        console.log('✅ Microsoft Fabric SQL Server connected successfully');
      } else {
        console.log('⚠️ Using SQLite fallback - Microsoft Fabric not available');
      }
    } catch (error) {
      console.log('⚠️ Using SQLite fallback - Microsoft Fabric connection failed:', error.message);
      this.fabricConnected = false;
    }
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    if (this.fabricConnected) {
      try {
        const result = await fabricQueries.executeQuery('SELECT * FROM users WHERE id = @param0', [id]);
        return result.recordset[0];
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [user] = await sqliteDb.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.getUserByUsername(username);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [user] = await sqliteDb.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.createUser(insertUser);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [user] = await sqliteDb
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Reference data methods
  async getRegions(): Promise<Region[]> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.getRegions();
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    return await sqliteDb.select().from(regions).orderBy(asc(regions.name));
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.getSubRegions(regionId);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const query = sqliteDb.select().from(subRegions);
    if (regionId) {
      query.where(eq(subRegions.regionId, regionId));
    }
    return await query.orderBy(asc(subRegions.name));
  }

  async getSolutions(): Promise<Solution[]> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.getSolutions();
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    return await sqliteDb.select().from(solutions).orderBy(asc(solutions.name));
  }

  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.getServiceLines(solutionId);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const query = sqliteDb.select().from(serviceLines);
    if (solutionId) {
      query.where(eq(serviceLines.solutionId, solutionId));
    }
    return await query.orderBy(asc(serviceLines.name));
  }

  async getServices(serviceLineId?: number): Promise<Service[]> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.getServices(serviceLineId);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const query = sqliteDb.select().from(services);
    if (serviceLineId) {
      query.where(eq(services.serviceLineId, serviceLineId));
    }
    return await query.orderBy(asc(services.name));
  }

  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.getStrategicIndicators();
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    return await sqliteDb.select().from(strategicIndicators).where(eq(strategicIndicators.active, true)).orderBy(asc(strategicIndicators.name));
  }

  // Objectives methods
  async getObjectives(filters?: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
    ownerId?: number;
  }): Promise<(Objective & { 
    owner: User; 
    region?: Region; 
    subRegion?: SubRegion; 
    serviceLine?: ServiceLine 
  })[]> {
    if (this.fabricConnected) {
      try {
        const result = await fabricQueries.getObjectives(filters);
        return result.map((obj: any) => ({
          ...obj,
          owner: {
            id: obj.owner_id,
            name: obj.owner_name,
            username: obj.owner_username,
            email: obj.owner_email || '',
            password: '',
            role: obj.owner_role || 'operacional',
            regionId: obj.region_id,
            subRegionId: obj.sub_region_id,
            active: true,
            createdAt: obj.created_at
          },
          region: obj.region_name ? {
            id: obj.region_id,
            name: obj.region_name,
            code: obj.region_code || ''
          } : undefined,
          subRegion: obj.sub_region_name ? {
            id: obj.sub_region_id,
            name: obj.sub_region_name,
            code: obj.sub_region_code || '',
            regionId: obj.region_id
          } : undefined
        }));
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    // SQLite fallback with joins
    const query = sqliteDb
      .select({
        objective: objectives,
        owner: users,
        region: regions,
        subRegion: subRegions
      })
      .from(objectives)
      .leftJoin(users, eq(objectives.ownerId, users.id))
      .leftJoin(regions, eq(objectives.regionId, regions.id))
      .leftJoin(subRegions, eq(objectives.subRegionId, subRegions.id));

    if (filters?.regionId) {
      query.where(eq(objectives.regionId, filters.regionId));
    }
    if (filters?.subRegionId) {
      query.where(eq(objectives.subRegionId, filters.subRegionId));
    }
    if (filters?.ownerId) {
      query.where(eq(objectives.ownerId, filters.ownerId));
    }

    const results = await query.orderBy(desc(objectives.createdAt));
    
    return results.map(result => ({
      ...result.objective,
      owner: result.owner!,
      region: result.region || undefined,
      subRegion: result.subRegion || undefined
    }));
  }

  async getObjective(id: number): Promise<Objective | undefined> {
    if (this.fabricConnected) {
      try {
        const result = await fabricQueries.executeQuery('SELECT * FROM objectives WHERE id = @param0', [id]);
        return result.recordset[0];
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [objective] = await sqliteDb.select().from(objectives).where(eq(objectives.id, id));
    return objective || undefined;
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.createObjective(objective);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [result] = await sqliteDb
      .insert(objectives)
      .values(objective)
      .returning();
    return result;
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    if (this.fabricConnected) {
      try {
        const updateQuery = `
          UPDATE objectives 
          SET ${Object.keys(objective).map((key, i) => `${key} = @param${i+1}`).join(', ')}, updated_at = GETDATE()
          WHERE id = @param0
        `;
        await fabricQueries.executeQuery(updateQuery, [id, ...Object.values(objective)]);
        const result = await fabricQueries.executeQuery('SELECT * FROM objectives WHERE id = @param0', [id]);
        return result.recordset[0];
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [result] = await sqliteDb
      .update(objectives)
      .set({ ...objective, updatedAt: new Date().toISOString() })
      .where(eq(objectives.id, id))
      .returning();
    return result;
  }

  async deleteObjective(id: number): Promise<void> {
    if (this.fabricConnected) {
      try {
        await fabricQueries.executeQuery('DELETE FROM objectives WHERE id = @param0', [id]);
        return;
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    await sqliteDb.delete(objectives).where(eq(objectives.id, id));
  }

  // Key Results methods
  async getKeyResults(objectiveId?: number): Promise<(KeyResult & { 
    objective: Objective; 
    strategicIndicator?: StrategicIndicator 
  })[]> {
    if (this.fabricConnected) {
      try {
        const results = await fabricQueries.getKeyResults(objectiveId);
        return results.map((kr: any) => ({
          ...kr,
          objective: {
            id: kr.objective_id,
            title: kr.objective_title,
            description: '',
            ownerId: 0,
            startDate: new Date(),
            endDate: new Date(),
            status: 'active',
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }));
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const query = sqliteDb
      .select({
        keyResult: keyResults,
        objective: objectives
      })
      .from(keyResults)
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id));

    if (objectiveId) {
      query.where(eq(keyResults.objectiveId, objectiveId));
    }

    const results = await query.orderBy(desc(keyResults.createdAt));
    
    return results.map(result => ({
      ...result.keyResult,
      objective: result.objective!
    }));
  }

  async getKeyResult(id: number): Promise<KeyResult | undefined> {
    if (this.fabricConnected) {
      try {
        const result = await fabricQueries.executeQuery('SELECT * FROM key_results WHERE id = @param0', [id]);
        return result.recordset[0];
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [keyResult] = await sqliteDb.select().from(keyResults).where(eq(keyResults.id, id));
    return keyResult || undefined;
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.createKeyResult(keyResult);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    // Get next number for SQLite
    const [maxNumber] = await sqliteDb
      .select({ maxNumber: sql<number>`COALESCE(MAX(${keyResults.number}), 0)` })
      .from(keyResults)
      .where(eq(keyResults.objectiveId, keyResult.objectiveId));

    const nextNumber = (maxNumber?.maxNumber || 0) + 1;

    const [result] = await sqliteDb
      .insert(keyResults)
      .values({ ...keyResult, number: nextNumber })
      .returning();
    return result;
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    if (this.fabricConnected) {
      try {
        const updateQuery = `
          UPDATE key_results 
          SET ${Object.keys(keyResult).map((key, i) => `${key} = @param${i+1}`).join(', ')}, updated_at = GETDATE()
          WHERE id = @param0
        `;
        await fabricQueries.executeQuery(updateQuery, [id, ...Object.values(keyResult)]);
        const result = await fabricQueries.executeQuery('SELECT * FROM key_results WHERE id = @param0', [id]);
        return result.recordset[0];
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [result] = await sqliteDb
      .update(keyResults)
      .set({ ...keyResult, updatedAt: new Date().toISOString() })
      .where(eq(keyResults.id, id))
      .returning();
    return result;
  }

  async deleteKeyResult(id: number): Promise<void> {
    if (this.fabricConnected) {
      try {
        await fabricQueries.executeQuery('DELETE FROM key_results WHERE id = @param0', [id]);
        return;
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    await sqliteDb.delete(keyResults).where(eq(keyResults.id, id));
  }

  // Actions methods
  async getActions(keyResultId?: number): Promise<(Action & { 
    keyResult: KeyResult; 
    strategicIndicator?: StrategicIndicator;
    responsible?: User 
  })[]> {
    if (this.fabricConnected) {
      try {
        const results = await fabricQueries.getActions(keyResultId);
        return results.map((action: any) => ({
          ...action,
          keyResult: {
            id: action.key_result_id,
            title: action.key_result_title,
            objectiveId: 0,
            description: '',
            number: 0,
            strategicIndicatorIds: '',
            initialValue: 0,
            targetValue: 0,
            currentValue: 0,
            frequency: 'monthly',
            startDate: new Date(),
            endDate: new Date(),
            progress: 0,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          responsible: action.responsible_name ? {
            id: action.responsible_id,
            name: action.responsible_name,
            username: '',
            email: '',
            password: '',
            role: 'operacional',
            active: true,
            createdAt: new Date()
          } : undefined
        }));
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const query = sqliteDb
      .select({
        action: actions,
        keyResult: keyResults,
        responsible: users,
        strategicIndicator: strategicIndicators
      })
      .from(actions)
      .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
      .leftJoin(users, eq(actions.responsibleId, users.id))
      .leftJoin(strategicIndicators, eq(actions.strategicIndicatorId, strategicIndicators.id));

    if (keyResultId) {
      query.where(eq(actions.keyResultId, keyResultId));
    }

    const results = await query.orderBy(desc(actions.createdAt));
    
    return results.map(result => ({
      ...result.action,
      keyResult: result.keyResult!,
      strategicIndicator: result.strategicIndicator || undefined,
      responsible: result.responsible || undefined
    }));
  }

  async getAction(id: number): Promise<Action | undefined> {
    if (this.fabricConnected) {
      try {
        const result = await fabricQueries.executeQuery('SELECT * FROM actions WHERE id = @param0', [id]);
        return result.recordset[0];
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [action] = await sqliteDb.select().from(actions).where(eq(actions.id, id));
    return action || undefined;
  }

  async createAction(action: InsertAction): Promise<Action> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.createAction(action);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    // Get next number for SQLite
    const [maxNumber] = await sqliteDb
      .select({ maxNumber: sql<number>`COALESCE(MAX(${actions.number}), 0)` })
      .from(actions)
      .where(eq(actions.keyResultId, action.keyResultId));

    const nextNumber = (maxNumber?.maxNumber || 0) + 1;

    const [result] = await sqliteDb
      .insert(actions)
      .values({ ...action, number: nextNumber })
      .returning();
    return result;
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    if (this.fabricConnected) {
      try {
        const updateQuery = `
          UPDATE actions 
          SET ${Object.keys(action).map((key, i) => `${key} = @param${i+1}`).join(', ')}, updated_at = GETDATE()
          WHERE id = @param0
        `;
        await fabricQueries.executeQuery(updateQuery, [id, ...Object.values(action)]);
        const result = await fabricQueries.executeQuery('SELECT * FROM actions WHERE id = @param0', [id]);
        return result.recordset[0];
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [result] = await sqliteDb
      .update(actions)
      .set({ ...action, updatedAt: new Date().toISOString() })
      .where(eq(actions.id, id))
      .returning();
    return result;
  }

  async deleteAction(id: number): Promise<void> {
    if (this.fabricConnected) {
      try {
        await fabricQueries.executeQuery('DELETE FROM actions WHERE id = @param0', [id]);
        return;
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    await sqliteDb.delete(actions).where(eq(actions.id, id));
  }

  // Checkpoints methods
  async getCheckpoints(keyResultId?: number): Promise<Checkpoint[]> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.getCheckpoints(keyResultId);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const query = sqliteDb.select().from(checkpoints);
    if (keyResultId) {
      query.where(eq(checkpoints.keyResultId, keyResultId));
    }
    return await query.orderBy(asc(checkpoints.period));
  }

  async getCheckpoint(id: number): Promise<Checkpoint | undefined> {
    if (this.fabricConnected) {
      try {
        const result = await fabricQueries.executeQuery('SELECT * FROM checkpoints WHERE id = @param0', [id]);
        return result.recordset[0];
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [checkpoint] = await sqliteDb.select().from(checkpoints).where(eq(checkpoints.id, id));
    return checkpoint || undefined;
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    if (this.fabricConnected) {
      try {
        const query = `
          INSERT INTO checkpoints (key_result_id, period, target_value, actual_value, progress, status, notes)
          VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6);
          SELECT SCOPE_IDENTITY() as id;
        `;
        const result = await fabricQueries.executeQuery(query, [
          checkpoint.keyResultId,
          checkpoint.period,
          checkpoint.targetValue,
          checkpoint.actualValue,
          checkpoint.progress,
          checkpoint.status,
          checkpoint.notes
        ]);
        return { id: result.recordset[0].id, ...checkpoint };
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [result] = await sqliteDb
      .insert(checkpoints)
      .values(checkpoint)
      .returning();
    return result;
  }

  async updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint> {
    if (this.fabricConnected) {
      try {
        const updateQuery = `
          UPDATE checkpoints 
          SET ${Object.keys(checkpoint).map((key, i) => `${key} = @param${i+1}`).join(', ')}, updated_at = GETDATE()
          WHERE id = @param0
        `;
        await fabricQueries.executeQuery(updateQuery, [id, ...Object.values(checkpoint)]);
        const result = await fabricQueries.executeQuery('SELECT * FROM checkpoints WHERE id = @param0', [id]);
        return result.recordset[0];
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [result] = await sqliteDb
      .update(checkpoints)
      .set({ ...checkpoint, updatedAt: new Date().toISOString() })
      .where(eq(checkpoints.id, id))
      .returning();
    return result;
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    // Implementation for checkpoint generation
    // This logic is complex and would be the same for both Fabric and SQLite
    const keyResult = await this.getKeyResult(keyResultId);
    if (!keyResult) {
      throw new Error('Key Result not found');
    }

    // Clear existing checkpoints
    if (this.fabricConnected) {
      try {
        await fabricQueries.executeQuery('DELETE FROM checkpoints WHERE key_result_id = @param0', [keyResultId]);
      } catch (error) {
        this.fabricConnected = false;
      }
    }
    
    if (!this.fabricConnected) {
      await sqliteDb.delete(checkpoints).where(eq(checkpoints.keyResultId, keyResultId));
    }

    // Generate new checkpoints based on frequency
    const checkpointData = this.generateCheckpointPeriods(keyResult);
    const newCheckpoints: Checkpoint[] = [];

    for (const data of checkpointData) {
      const checkpoint = await this.createCheckpoint(data);
      newCheckpoints.push(checkpoint);
    }

    return newCheckpoints;
  }

  private generateCheckpointPeriods(keyResult: KeyResult): InsertCheckpoint[] {
    const checkpoints: InsertCheckpoint[] = [];
    const startDate = new Date(keyResult.startDate);
    const endDate = new Date(keyResult.endDate);
    const totalValue = keyResult.targetValue - keyResult.initialValue;

    if (keyResult.frequency === 'weekly') {
      const weeksBetween = this.getWeeksBetween(startDate, endDate);
      const valuePerPeriod = totalValue / weeksBetween.length;

      weeksBetween.forEach((week, index) => {
        const cumulativeValue = keyResult.initialValue + (valuePerPeriod * (index + 1));
        checkpoints.push({
          keyResultId: keyResult.id!,
          period: week,
          targetValue: cumulativeValue,
          actualValue: null,
          progress: 0,
          status: 'pendente',
          notes: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    } else if (keyResult.frequency === 'biweekly') {
      const biweeksBetween = this.getBiweeksBetween(startDate, endDate);
      const valuePerPeriod = totalValue / biweeksBetween.length;

      biweeksBetween.forEach((biweek, index) => {
        const cumulativeValue = keyResult.initialValue + (valuePerPeriod * (index + 1));
        checkpoints.push({
          keyResultId: keyResult.id!,
          period: biweek,
          targetValue: cumulativeValue,
          actualValue: null,
          progress: 0,
          status: 'pendente',
          notes: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    } else if (keyResult.frequency === 'monthly') {
      const monthsBetween = this.getMonthsBetween(startDate, endDate);
      const valuePerPeriod = totalValue / monthsBetween.length;

      monthsBetween.forEach((month, index) => {
        const cumulativeValue = keyResult.initialValue + (valuePerPeriod * (index + 1));
        checkpoints.push({
          keyResultId: keyResult.id!,
          period: month,
          targetValue: cumulativeValue,
          actualValue: null,
          progress: 0,
          status: 'pendente',
          notes: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    } else if (keyResult.frequency === 'quarterly') {
      const quartersBetween = this.getQuartersBetween(startDate, endDate);
      const valuePerPeriod = totalValue / quartersBetween.length;

      quartersBetween.forEach((quarter, index) => {
        const cumulativeValue = keyResult.initialValue + (valuePerPeriod * (index + 1));
        checkpoints.push({
          keyResultId: keyResult.id!,
          period: quarter,
          targetValue: cumulativeValue,
          actualValue: null,
          progress: 0,
          status: 'pendente',
          notes: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    }

    return checkpoints;
  }

  private getMonthsBetween(start: Date, end: Date): string[] {
    const months: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }

  private getQuartersBetween(start: Date, end: Date): string[] {
    const quarters: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const year = current.getFullYear();
      const quarter = Math.floor(current.getMonth() / 3) + 1;
      const quarterStr = `${year}-Q${quarter}`;
      
      if (!quarters.includes(quarterStr)) {
        quarters.push(quarterStr);
      }
      
      current.setMonth(current.getMonth() + 3);
    }
    
    return quarters;
  }

  private getWeeksBetween(start: Date, end: Date): string[] {
    const weeks: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const year = current.getFullYear();
      const weekNum = this.getWeekNumber(current);
      weeks.push(`${year}-W${String(weekNum).padStart(2, '0')}`);
      current.setDate(current.getDate() + 7);
    }
    
    return weeks;
  }

  private getBiweeksBetween(start: Date, end: Date): string[] {
    const biweeks: string[] = [];
    const current = new Date(start);
    let counter = 1;
    
    while (current <= end) {
      const year = current.getFullYear();
      biweeks.push(`${year}-B${String(counter).padStart(2, '0')}`);
      current.setDate(current.getDate() + 14);
      counter++;
    }
    
    return biweeks;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Activities methods
  async getRecentActivities(limit = 10): Promise<(Activity & { user: User })[]> {
    if (this.fabricConnected) {
      try {
        const query = `
          SELECT TOP ${limit} a.*, u.name as user_name, u.username, u.email 
          FROM activities a 
          LEFT JOIN users u ON a.user_id = u.id 
          ORDER BY a.created_at DESC
        `;
        const result = await fabricQueries.executeQuery(query);
        return result.recordset.map((activity: any) => ({
          ...activity,
          user: {
            id: activity.user_id,
            name: activity.user_name,
            username: activity.username,
            email: activity.email,
            password: '',
            role: 'operacional',
            active: true,
            createdAt: activity.created_at
          }
        }));
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const results = await sqliteDb
      .select({
        activity: activities,
        user: users
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return results.map(result => ({
      ...result.activity,
      user: result.user!
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
    const activityData = {
      ...activity,
      oldValues: activity.oldValues ? JSON.stringify(activity.oldValues) : null,
      newValues: activity.newValues ? JSON.stringify(activity.newValues) : null,
      createdAt: new Date().toISOString()
    };

    if (this.fabricConnected) {
      try {
        const query = `
          INSERT INTO activities (user_id, entity_type, entity_id, action, description, old_values, new_values)
          VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6);
          SELECT SCOPE_IDENTITY() as id;
        `;
        const result = await fabricQueries.executeQuery(query, [
          activityData.userId,
          activityData.entityType,
          activityData.entityId,
          activityData.action,
          activityData.description,
          activityData.oldValues,
          activityData.newValues
        ]);
        return { id: result.recordset[0].id, ...activityData };
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    const [result] = await sqliteDb
      .insert(activities)
      .values(activityData)
      .returning();
    return result;
  }

  // Analytics methods
  async getDashboardKPIs(filters?: {
    regionId?: number;
    subRegionId?: number;
  }): Promise<{
    totalObjectives: number;
    totalKeyResults: number;
    averageProgress: number;
    totalActions: number;
    completedActions: number;
    overallProgress: number;
  }> {
    if (this.fabricConnected) {
      try {
        return await fabricQueries.getDashboardKPIs(filters);
      } catch (error) {
        console.error('Fabric query failed, falling back to SQLite:', error.message);
        this.fabricConnected = false;
      }
    }
    
    // SQLite fallback
    const objectivesQuery = sqliteDb.select({ count: sql<number>`count(*)` }).from(objectives);
    if (filters?.regionId) {
      objectivesQuery.where(eq(objectives.regionId, filters.regionId));
    }

    const keyResultsQuery = sqliteDb
      .select({ count: sql<number>`count(*)` })
      .from(keyResults)
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id));
    if (filters?.regionId) {
      keyResultsQuery.where(eq(objectives.regionId, filters.regionId));
    }

    const progressQuery = sqliteDb
      .select({ avg: sql<number>`avg(${objectives.progress})` })
      .from(objectives);
    if (filters?.regionId) {
      progressQuery.where(eq(objectives.regionId, filters.regionId));
    }

    const actionsQuery = sqliteDb
      .select({ count: sql<number>`count(*)` })
      .from(actions)
      .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id));
    if (filters?.regionId) {
      actionsQuery.where(eq(objectives.regionId, filters.regionId));
    }

    const completedActionsQuery = sqliteDb
      .select({ count: sql<number>`count(*)` })
      .from(actions)
      .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
      .where(eq(actions.status, 'completed'));
    if (filters?.regionId) {
      completedActionsQuery.where(eq(objectives.regionId, filters.regionId));
    }

    const [
      totalObjectivesResult,
      totalKeyResultsResult,
      averageProgressResult,
      totalActionsResult,
      completedActionsResult
    ] = await Promise.all([
      objectivesQuery,
      keyResultsQuery,
      progressQuery,
      actionsQuery,
      completedActionsQuery
    ]);

    const totalObjectives = totalObjectivesResult[0]?.count || 0;
    const totalKeyResults = totalKeyResultsResult[0]?.count || 0;
    const averageProgress = averageProgressResult[0]?.avg || 0;
    const totalActions = totalActionsResult[0]?.count || 0;
    const completedActions = completedActionsResult[0]?.count || 0;

    return {
      totalObjectives,
      totalKeyResults,
      averageProgress: parseFloat(averageProgress.toFixed(2)),
      totalActions,
      completedActions,
      overallProgress: parseFloat(averageProgress.toFixed(2))
    };
  }
}

export const storage = new HybridStorage();