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
import session from "express-session";
import { fabricQueries, connectToFabric, executeQuery } from "./fabric-storage";
import MemoryStore from 'memorystore';

const MemorySessionStore = MemoryStore(session);

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

export class FabricOnlyStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Use memory store for sessions
    this.sessionStore = new MemorySessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Test connection at startup
    this.testConnection();
  }

  private async testConnection() {
    try {
      await connectToFabric();
      console.log('✅ Microsoft Fabric SQL Server ready for OKR operations');
    } catch (error) {
      console.error('❌ Microsoft Fabric connection failed:', error.message);
      console.log('🔄 Will attempt to reconnect on first query...');
      // Don't throw error during initialization, allow runtime reconnection attempts
    }
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await executeQuery('SELECT * FROM users WHERE id = @param0', [id]);
      return result.recordset[0];
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      return await fabricQueries.getUserByUsername(username);
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      return await fabricQueries.createUser(insertUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Reference data methods
  async getRegions(): Promise<Region[]> {
    try {
      return await fabricQueries.getRegions();
    } catch (error) {
      console.error('Error getting regions:', error);
      throw error;
    }
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    try {
      return await fabricQueries.getSubRegions(regionId);
    } catch (error) {
      console.error('Error getting sub-regions:', error);
      throw error;
    }
  }

  async getSolutions(): Promise<Solution[]> {
    try {
      return await fabricQueries.getSolutions();
    } catch (error) {
      console.error('Error getting solutions:', error);
      throw error;
    }
  }

  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    try {
      return await fabricQueries.getServiceLines(solutionId);
    } catch (error) {
      console.error('Error getting service lines:', error);
      throw error;
    }
  }

  async getServices(serviceLineId?: number): Promise<Service[]> {
    try {
      return await fabricQueries.getServices(serviceLineId);
    } catch (error) {
      console.error('Error getting services:', error);
      throw error;
    }
  }

  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    try {
      return await fabricQueries.getStrategicIndicators();
    } catch (error) {
      console.error('Error getting strategic indicators:', error);
      throw error;
    }
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
    try {
      return await fabricQueries.getObjectives(filters);
    } catch (error) {
      console.error('Error getting objectives:', error);
      throw error;
    }
  }

  async getObjective(id: number): Promise<Objective | undefined> {
    try {
      const result = await executeQuery('SELECT * FROM objectives WHERE id = @param0', [id]);
      return result.recordset[0];
    } catch (error) {
      console.error('Error getting objective:', error);
      throw error;
    }
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    try {
      return await fabricQueries.createObjective(objective);
    } catch (error) {
      console.error('Error creating objective:', error);
      throw error;
    }
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    try {
      // Build dynamic update query
      const updateFields = Object.entries(objective)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _], index) => `${key} = @param${index + 1}`)
        .join(', ');
      
      const values = Object.values(objective).filter(value => value !== undefined);
      
      const query = `
        UPDATE objectives 
        SET ${updateFields}, updated_at = GETDATE()
        WHERE id = @param0;
        SELECT * FROM objectives WHERE id = @param0;
      `;
      
      const result = await executeQuery(query, [id, ...values]);
      return result.recordset[0];
    } catch (error) {
      console.error('Error updating objective:', error);
      throw error;
    }
  }

  async deleteObjective(id: number): Promise<void> {
    try {
      await executeQuery('DELETE FROM objectives WHERE id = @param0', [id]);
    } catch (error) {
      console.error('Error deleting objective:', error);
      throw error;
    }
  }

  // Key Results methods
  async getKeyResults(objectiveId?: number): Promise<(KeyResult & { 
    objective: Objective; 
    strategicIndicator?: StrategicIndicator 
  })[]> {
    try {
      return await fabricQueries.getKeyResults(objectiveId);
    } catch (error) {
      console.error('Error getting key results:', error);
      throw error;
    }
  }

  async getKeyResult(id: number): Promise<KeyResult | undefined> {
    try {
      const result = await executeQuery('SELECT * FROM key_results WHERE id = @param0', [id]);
      return result.recordset[0];
    } catch (error) {
      console.error('Error getting key result:', error);
      throw error;
    }
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    try {
      return await fabricQueries.createKeyResult(keyResult);
    } catch (error) {
      console.error('Error creating key result:', error);
      throw error;
    }
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    try {
      // Build dynamic update query
      const updateFields = Object.entries(keyResult)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _], index) => `${key} = @param${index + 1}`)
        .join(', ');
      
      const values = Object.values(keyResult).filter(value => value !== undefined);
      
      const query = `
        UPDATE key_results 
        SET ${updateFields}, updated_at = GETDATE()
        WHERE id = @param0;
        SELECT * FROM key_results WHERE id = @param0;
      `;
      
      const result = await executeQuery(query, [id, ...values]);
      return result.recordset[0];
    } catch (error) {
      console.error('Error updating key result:', error);
      throw error;
    }
  }

  async deleteKeyResult(id: number): Promise<void> {
    try {
      await executeQuery('DELETE FROM key_results WHERE id = @param0', [id]);
    } catch (error) {
      console.error('Error deleting key result:', error);
      throw error;
    }
  }

  // Actions methods
  async getActions(keyResultId?: number): Promise<(Action & { 
    keyResult: KeyResult; 
    strategicIndicator?: StrategicIndicator;
    responsible?: User 
  })[]> {
    try {
      return await fabricQueries.getActions(keyResultId);
    } catch (error) {
      console.error('Error getting actions:', error);
      throw error;
    }
  }

  async getAction(id: number): Promise<Action | undefined> {
    try {
      const result = await executeQuery('SELECT * FROM actions WHERE id = @param0', [id]);
      return result.recordset[0];
    } catch (error) {
      console.error('Error getting action:', error);
      throw error;
    }
  }

  async createAction(action: InsertAction): Promise<Action> {
    try {
      return await fabricQueries.createAction(action);
    } catch (error) {
      console.error('Error creating action:', error);
      throw error;
    }
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    try {
      // Build dynamic update query
      const updateFields = Object.entries(action)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _], index) => `${key} = @param${index + 1}`)
        .join(', ');
      
      const values = Object.values(action).filter(value => value !== undefined);
      
      const query = `
        UPDATE actions 
        SET ${updateFields}, updated_at = GETDATE()
        WHERE id = @param0;
        SELECT * FROM actions WHERE id = @param0;
      `;
      
      const result = await executeQuery(query, [id, ...values]);
      return result.recordset[0];
    } catch (error) {
      console.error('Error updating action:', error);
      throw error;
    }
  }

  async deleteAction(id: number): Promise<void> {
    try {
      await executeQuery('DELETE FROM actions WHERE id = @param0', [id]);
    } catch (error) {
      console.error('Error deleting action:', error);
      throw error;
    }
  }

  // Checkpoints methods
  async getCheckpoints(keyResultId?: number): Promise<Checkpoint[]> {
    try {
      return await fabricQueries.getCheckpoints(keyResultId);
    } catch (error) {
      console.error('Error getting checkpoints:', error);
      throw error;
    }
  }

  async getCheckpoint(id: number): Promise<Checkpoint | undefined> {
    try {
      const result = await executeQuery('SELECT * FROM checkpoints WHERE id = @param0', [id]);
      return result.recordset[0];
    } catch (error) {
      console.error('Error getting checkpoint:', error);
      throw error;
    }
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    try {
      const query = `
        INSERT INTO checkpoints (key_result_id, period, target_value, actual_value, progress, status, notes, completed_at)
        VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7);
        SELECT * FROM checkpoints WHERE id = SCOPE_IDENTITY();
      `;
      
      const values = [
        checkpoint.keyResultId,
        checkpoint.period,
        checkpoint.targetValue,
        checkpoint.actualValue || null,
        checkpoint.progress || 0,
        checkpoint.status || 'pendente',
        checkpoint.notes || null,
        checkpoint.completedAt || null
      ];
      
      const result = await executeQuery(query, values);
      return result.recordset[0];
    } catch (error) {
      console.error('Error creating checkpoint:', error);
      throw error;
    }
  }

  async updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint> {
    try {
      // Build dynamic update query
      const updateFields = Object.entries(checkpoint)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _], index) => `${key} = @param${index + 1}`)
        .join(', ');
      
      const values = Object.values(checkpoint).filter(value => value !== undefined);
      
      const query = `
        UPDATE checkpoints 
        SET ${updateFields}, updated_at = GETDATE()
        WHERE id = @param0;
        SELECT * FROM checkpoints WHERE id = @param0;
      `;
      
      const result = await executeQuery(query, [id, ...values]);
      return result.recordset[0];
    } catch (error) {
      console.error('Error updating checkpoint:', error);
      throw error;
    }
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    try {
      // Get key result details
      const keyResult = await this.getKeyResult(keyResultId);
      if (!keyResult) {
        throw new Error('Key result not found');
      }

      // Delete existing checkpoints
      await executeQuery('DELETE FROM checkpoints WHERE key_result_id = @param0', [keyResultId]);

      // Generate new checkpoints based on frequency
      const checkpoints = this.generateCheckpointPeriods(keyResult);
      const createdCheckpoints: Checkpoint[] = [];

      for (const checkpoint of checkpoints) {
        const created = await this.createCheckpoint(checkpoint);
        createdCheckpoints.push(created);
      }

      return createdCheckpoints;
    } catch (error) {
      console.error('Error generating checkpoints:', error);
      throw error;
    }
  }

  private generateCheckpointPeriods(keyResult: KeyResult): InsertCheckpoint[] {
    const checkpoints: InsertCheckpoint[] = [];
    const startDate = new Date(keyResult.startDate);
    const endDate = new Date(keyResult.endDate);
    const targetValue = keyResult.targetValue;
    const initialValue = keyResult.initialValue;

    let periods: string[] = [];

    switch (keyResult.frequency) {
      case 'monthly':
        periods = this.getMonthsBetween(startDate, endDate);
        break;
      case 'quarterly':
        periods = this.getQuartersBetween(startDate, endDate);
        break;
      case 'weekly':
        periods = this.getWeeksBetween(startDate, endDate);
        break;
    }

    periods.forEach((period, index) => {
      const progress = (index + 1) / periods.length;
      const periodTargetValue = initialValue + (targetValue - initialValue) * progress;

      checkpoints.push({
        keyResultId: keyResult.id,
        period,
        targetValue: Math.round(periodTargetValue * 100) / 100,
        actualValue: null,
        progress: 0,
        status: 'pendente',
        notes: null,
        completedAt: null
      });
    });

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
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startQuarter = Math.floor(start.getMonth() / 3) + 1;
    const endQuarter = Math.floor(end.getMonth() / 3) + 1;

    for (let year = startYear; year <= endYear; year++) {
      const firstQ = year === startYear ? startQuarter : 1;
      const lastQ = year === endYear ? endQuarter : 4;
      
      for (let quarter = firstQ; quarter <= lastQ; quarter++) {
        quarters.push(`${year}-Q${quarter}`);
      }
    }

    return quarters;
  }

  private getWeeksBetween(start: Date, end: Date): string[] {
    const weeks: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const year = current.getFullYear();
      const week = this.getWeekNumber(current);
      weeks.push(`${year}-W${String(week).padStart(2, '0')}`);
      current.setDate(current.getDate() + 7);
    }
    
    return weeks;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Activities methods
  async getRecentActivities(limit = 10): Promise<(Activity & { user: User })[]> {
    try {
      const query = `
        SELECT TOP (@param0) 
          a.*, 
          u.id as user_id, u.username, u.name as user_name, u.email, u.role
        FROM activities a
        INNER JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
      `;
      
      const result = await executeQuery(query, [limit]);
      
      return result.recordset.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        description: row.description,
        oldValues: row.old_values ? JSON.parse(row.old_values) : null,
        newValues: row.new_values ? JSON.parse(row.new_values) : null,
        createdAt: row.created_at,
        user: {
          id: row.user_id,
          username: row.username,
          name: row.user_name,
          email: row.email,
          role: row.role,
          regionId: row.region_id,
          subRegionId: row.sub_region_id,
          active: row.active,
          password: '', // Don't expose password
          createdAt: row.created_at
        }
      }));
    } catch (error) {
      console.error('Error getting recent activities:', error);
      throw error;
    }
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
    try {
      const query = `
        INSERT INTO activities (user_id, entity_type, entity_id, action, description, old_values, new_values)
        VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6);
        SELECT * FROM activities WHERE id = SCOPE_IDENTITY();
      `;
      
      const values = [
        activity.userId,
        activity.entityType,
        activity.entityId,
        activity.action,
        activity.description,
        activity.oldValues ? JSON.stringify(activity.oldValues) : null,
        activity.newValues ? JSON.stringify(activity.newValues) : null
      ];
      
      const result = await executeQuery(query, values);
      return result.recordset[0];
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
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
    try {
      return await fabricQueries.getDashboardKPIs(filters);
    } catch (error) {
      console.error('Error getting dashboard KPIs:', error);
      throw error;
    }
  }
}

export const storage = new FabricOnlyStorage();