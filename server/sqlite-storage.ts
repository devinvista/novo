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

export class SQLiteStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Use MemoryStore for session management in Replit
    const MemoryStoreClass = MemoryStore(session);
    this.sessionStore = new MemoryStoreClass({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getManagers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, 'admin'));
  }

  async getPendingUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.approved, false));
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return result[0];
  }

  async approveUser(id: number, approvedBy: number, subRegionId?: number): Promise<User> {
    const updateData: any = {
      approved: true,
      approvedAt: new Date().toISOString(),
      approvedBy,
    };
    if (subRegionId) {
      updateData.subRegionIds = [subRegionId];
    }
    const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async approveUserWithPermissions(id: number, approvedBy: number, permissions: {
    regionIds: number[];
    subRegionIds: number[];
    solutionIds: number[];
    serviceLineIds: number[];
    serviceIds: number[];
  }): Promise<User> {
    const result = await db.update(users).set({
      approved: true,
      approvedAt: new Date().toISOString(),
      approvedBy,
      ...permissions
    }).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Reference data
  async getRegions(): Promise<Region[]> {
    return db.select().from(regions);
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    if (regionId) {
      return db.select().from(subRegions).where(eq(subRegions.regionId, regionId));
    }
    return db.select().from(subRegions);
  }

  async getSolutions(): Promise<Solution[]> {
    return db.select().from(solutions);
  }

  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    if (solutionId) {
      return db.select().from(serviceLines).where(eq(serviceLines.solutionId, solutionId));
    }
    return db.select().from(serviceLines);
  }

  async getServices(serviceLineId?: number): Promise<Service[]> {
    if (serviceLineId) {
      return db.select().from(services).where(eq(services.serviceLineId, serviceLineId));
    }
    return db.select().from(services);
  }

  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    return db.select().from(strategicIndicators);
  }

  // Objectives - simplified implementation
  async getObjectives(filters?: {
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
  })[]> {
    // Basic implementation - can be enhanced later
    const result = await db.select().from(objectives);
    const userList = await db.select().from(users);
    
    return result.map(obj => ({ 
      ...obj, 
      owner: userList.find(u => u.id === obj.ownerId)! 
    }));
  }

  async getObjective(id: number, currentUserId?: number): Promise<Objective | undefined> {
    const result = await db.select().from(objectives).where(eq(objectives.id, id));
    return result[0];
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    const result = await db.insert(objectives).values(objective).returning();
    return result[0];
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    const result = await db.update(objectives).set(objective).where(eq(objectives.id, id)).returning();
    return result[0];
  }

  async deleteObjective(id: number): Promise<void> {
    await db.delete(objectives).where(eq(objectives.id, id));
  }

  // Key Results - simplified implementation
  async getKeyResults(objectiveId?: number, currentUserId?: number): Promise<(KeyResult & { 
    objective: Objective; 
    strategicIndicator?: StrategicIndicator 
  })[]> {
    let query = db.select().from(keyResults);
    if (objectiveId) {
      const result = await query.where(eq(keyResults.objectiveId, objectiveId));
      const objectivesList = await db.select().from(objectives);
      return result.map(kr => ({ 
        ...kr, 
        objective: objectivesList.find(o => o.id === kr.objectiveId)! 
      }));
    }
    const result = await query;
    const objectivesList = await db.select().from(objectives);
    return result.map(kr => ({ 
      ...kr, 
      objective: objectivesList.find(o => o.id === kr.objectiveId)! 
    }));
  }

  async getKeyResult(id: number, currentUserId?: number): Promise<KeyResult | undefined> {
    const result = await db.select().from(keyResults).where(eq(keyResults.id, id));
    return result[0];
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    const result = await db.insert(keyResults).values(keyResult).returning();
    return result[0];
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    const result = await db.update(keyResults).set(keyResult).where(eq(keyResults.id, id)).returning();
    return result[0];
  }

  async deleteKeyResult(id: number): Promise<void> {
    await db.delete(keyResults).where(eq(keyResults.id, id));
  }

  // Actions - simplified implementation
  async getActions(keyResultId?: number, currentUserId?: number): Promise<(Action & { 
    keyResult: KeyResult; 
    responsible?: User 
  })[]> {
    let query = db.select().from(actions);
    if (keyResultId) {
      const result = await query.where(eq(actions.keyResultId, keyResultId));
      const keyResultsList = await db.select().from(keyResults);
      const usersList = await db.select().from(users);
      return result.map(action => ({ 
        ...action, 
        keyResult: keyResultsList.find(kr => kr.id === action.keyResultId)!,
        responsible: action.responsibleId ? usersList.find(u => u.id === action.responsibleId) : undefined
      }));
    }
    const result = await query;
    const keyResultsList = await db.select().from(keyResults);
    const usersList = await db.select().from(users);
    return result.map(action => ({ 
      ...action, 
      keyResult: keyResultsList.find(kr => kr.id === action.keyResultId)!,
      responsible: action.responsibleId ? usersList.find(u => u.id === action.responsibleId) : undefined
    }));
  }

  async getAction(id: number, currentUserId?: number): Promise<Action | undefined> {
    const result = await db.select().from(actions).where(eq(actions.id, id));
    return result[0];
  }

  async createAction(action: InsertAction): Promise<Action> {
    const result = await db.insert(actions).values(action).returning();
    return result[0];
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    const result = await db.update(actions).set(action).where(eq(actions.id, id)).returning();
    return result[0];
  }

  async deleteAction(id: number): Promise<void> {
    await db.delete(actions).where(eq(actions.id, id));
  }

  // Checkpoints - simplified implementation
  async getCheckpoints(keyResultId?: number, currentUserId?: number): Promise<Checkpoint[]> {
    if (keyResultId) {
      return db.select().from(checkpoints).where(eq(checkpoints.keyResultId, keyResultId));
    }
    return db.select().from(checkpoints);
  }

  async getCheckpoint(id: number, currentUserId?: number): Promise<Checkpoint | undefined> {
    const result = await db.select().from(checkpoints).where(eq(checkpoints.id, id));
    return result[0];
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    const result = await db.insert(checkpoints).values(checkpoint).returning();
    return result[0];
  }

  async updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint> {
    const result = await db.update(checkpoints).set(checkpoint).where(eq(checkpoints.id, id)).returning();
    return result[0];
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    // Basic implementation - return empty array for now
    return [];
  }

  async deleteCheckpoint(id: number): Promise<void> {
    await db.delete(checkpoints).where(eq(checkpoints.id, id));
  }

  // Action Comments - basic implementation
  async getActionComments(actionId: number): Promise<(ActionComment & { user: User })[]> {
    // Return empty array for now - can be implemented later
    return [];
  }

  async createActionComment(comment: InsertActionComment): Promise<ActionComment> {
    // Basic implementation - throw error for now
    throw new Error('Action comments not implemented yet');
  }

  // Dashboard and Analytics - basic implementation
  async getDashboardKPIs(filters?: { quarter?: string; currentUserId?: number }): Promise<{
    totalObjectives: number;
    totalKeyResults: number;
    totalActions: number;
    completedObjectives: number;
    completedKeyResults: number;
    completedActions: number;
    averageProgress: number;
  }> {
    const objectivesList = await db.select().from(objectives);
    const keyResultsList = await db.select().from(keyResults);
    const actionsList = await db.select().from(actions);

    return {
      totalObjectives: objectivesList.length,
      totalKeyResults: keyResultsList.length,
      totalActions: actionsList.length,
      completedObjectives: objectivesList.filter(o => o.status === 'completed').length,
      completedKeyResults: keyResultsList.filter(kr => kr.status === 'completed').length,
      completedActions: actionsList.filter(a => a.status === 'completed').length,
      averageProgress: objectivesList.reduce((acc, obj) => acc + (obj.progress || 0), 0) / Math.max(objectivesList.length, 1)
    };
  }
  
  // Quarterly data - basic implementation
  async getQuarterlyPeriods(): Promise<string[]> {
    return ['2024-T1', '2024-T2', '2024-T3', '2024-T4', '2025-T1', '2025-T2', '2025-T3', '2025-T4'];
  }

  async getQuarterlyData(period: string, currentUserId?: number): Promise<{
    objectives: (Objective & { owner: User; region?: Region; subRegion?: SubRegion })[];
    keyResults: (KeyResult & { objective: Objective })[];
    actions: (Action & { keyResult: KeyResult; responsible?: User })[];
  }> {
    const objectivesList = await this.getObjectives();
    const keyResultsList = await this.getKeyResults();
    const actionsList = await this.getActions();

    return {
      objectives: objectivesList,
      keyResults: keyResultsList,
      actions: actionsList
    };
  }
}

// Create and export the storage instance
export const storage = new SQLiteStorage();