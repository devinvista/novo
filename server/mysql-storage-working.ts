import { 
  users, regions, subRegions, serviceLines, strategicIndicators, 
  objectives, keyResults, actions, checkpoints, actionComments,
  solutions, services,
  type User, type InsertUser, type Objective, type InsertObjective,
  type KeyResult, type InsertKeyResult, type Action, type InsertAction,
  type Checkpoint, type InsertCheckpoint, type Region, type SubRegion,
  type ServiceLine, type StrategicIndicator,
  type Solution, type Service, type ActionComment, type InsertActionComment
} from "@shared/mysql-schema-final";
import { db, connection } from "./mysql-db";
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
  getDashboardKPIs(filters?: { 
    quarter?: string; 
    currentUserId?: number;
    userRegionIds?: number[];
    userSubRegionIds?: number[];
  }): Promise<{
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
  getQuarterlyData(period: string, filters?: {
    currentUserId?: number;
    userRegionIds?: number[];
    userSubRegionIds?: number[];
  }): Promise<{
    objectives: (Objective & { owner: User; region?: Region; subRegion?: SubRegion })[];
    keyResults: (KeyResult & { objective: Objective })[];
    actions: (Action & { keyResult: KeyResult; responsible?: User })[];
  }>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MySQLStorage implements IStorage {
  sessionStore: session.SessionStore;
  connected: boolean = true;

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
    return result[0] ? this.parseUserJsonFields(result[0]) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] ? this.parseUserJsonFields(result[0]) : undefined;
  }

  async getUsers(currentUserId?: number): Promise<User[]> {
    let query = db.select().from(users);
    
    // Apply hierarchical access control based on current user
    if (currentUserId) {
      const currentUser = await this.getUser(currentUserId);
      if (currentUser) {
        if (currentUser.role === 'admin') {
          // Admins can see all users
          // No additional filtering needed
        } else if (currentUser.role === 'gestor') {
          // Gestores can only see themselves and their operational users
          query = query.where(
            sql`(${users.id} = ${currentUserId} OR ${users.gestorId} = ${currentUserId})`
          );
        } else {
          // Operacionais can only see themselves
          query = query.where(eq(users.id, currentUserId));
        }
      }
    }
    
    const usersResult = await query.orderBy(asc(users.name));
    return usersResult.map(user => this.parseUserJsonFields(user));
  }

  // Helper method to parse JSON fields in user objects
  private parseUserJsonFields(user: any): User {
    return {
      ...user,
      regionIds: Array.isArray(user.regionIds) ? user.regionIds : this.safeJsonParse(user.regionIds, []),
      subRegionIds: Array.isArray(user.subRegionIds) ? user.subRegionIds : this.safeJsonParse(user.subRegionIds, []),
      solutionIds: Array.isArray(user.solutionIds) ? user.solutionIds : this.safeJsonParse(user.solutionIds, []),
      serviceLineIds: Array.isArray(user.serviceLineIds) ? user.serviceLineIds : this.safeJsonParse(user.serviceLineIds, []),
      serviceIds: Array.isArray(user.serviceIds) ? user.serviceIds : this.safeJsonParse(user.serviceIds, [])
    };
  }

  // Helper method to safely parse JSON strings
  private safeJsonParse(jsonString: any, defaultValue: any[] = []): any[] {
    if (Array.isArray(jsonString)) return jsonString;
    if (typeof jsonString !== 'string') return defaultValue;
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async getManagers(): Promise<User[]> {
    const managers = await db.select().from(users).where(eq(users.role, "gestor")).orderBy(asc(users.name));
    return managers.map(user => this.parseUserJsonFields(user));
  }

  async getPendingUsers(currentUserId?: number): Promise<User[]> {
    let query = db.select().from(users).where(eq(users.approved, false));
    
    // Apply hierarchical access control for pending users
    if (currentUserId) {
      const currentUser = await this.getUser(currentUserId);
      if (currentUser && currentUser.role === 'gestor') {
        // Gestores can only see pending users linked to them
        query = query.where(
          and(
            eq(users.approved, false),
            eq(users.gestorId, currentUserId)
          )
        );
      }
      // Admins can see all pending users (no additional filtering)
      // Operacionais cannot see pending users
    }
    
    const pendingUsers = await query.orderBy(desc(users.createdAt));
    return pendingUsers.map(user => this.parseUserJsonFields(user));
  }

  async createUser(user: InsertUser): Promise<User> {
    const insertResult = await db.insert(users).values(user);
    
    // For MySQL2 with Drizzle, insertId is in the first array element
    const insertId = insertResult[0]?.insertId;
    
    if (!insertId || isNaN(Number(insertId))) {
      throw new Error(`Failed to get valid insert ID: ${insertId}`);
    }
    
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
    try {
      return await this.getUser(id);
    } catch (error) {
      console.error(`Error getting user by ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      // Delete related records first to avoid foreign key constraint errors
      
      // Delete action comments related to this user (now with correct column name)
      await db.delete(actionComments).where(eq(actionComments.userId, id));
      
      // Update objectives where this user is the owner (set to null)
      await db.update(objectives).set({ ownerId: null }).where(eq(objectives.ownerId, id));
      
      // Update actions where this user is responsible (set to null)
      await db.update(actions).set({ responsibleId: null }).where(eq(actions.responsibleId, id));
      
      // Update users where this user is the gestor (set gestorId to null)
      await db.update(users).set({ gestorId: null }).where(eq(users.gestorId, id));
      
      // Update users where this user approved others (set approvedBy to null)
      await db.update(users).set({ approvedBy: null }).where(eq(users.approvedBy, id));
      
      // Finally delete the user
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // Reference data methods
  async getRegions(): Promise<Region[]> {
    return db.select().from(regions).orderBy(asc(regions.id));
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    const query = db.select().from(subRegions);
    if (regionId) {
      query.where(eq(subRegions.regionId, regionId));
    }
    return query.orderBy(asc(subRegions.id));
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

  // Objectives methods with hierarchical access control
  async getObjectives(filters: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
    ownerId?: number;
    currentUserId?: number;
    userRegionIds?: number[];
    userSubRegionIds?: number[];
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

    // Apply hierarchical access control
    if (filters.currentUserId) {
      const user = await this.getUserById(filters.currentUserId);
      if (user && user.role !== 'admin') {
        const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
        const userSubRegionIds = Array.isArray(user.subRegionIds) ? user.subRegionIds : [];
        
        // Hierarchical filtering: if user has specific sub-regions, filter by those
        // Otherwise, if user has regions, show all sub-regions within those regions
        if (userSubRegionIds.length > 0) {
          conditions.push(inArray(objectives.subRegionId, userSubRegionIds));
        } else if (userRegionIds.length > 0) {
          conditions.push(inArray(objectives.regionId, userRegionIds));
        }
      }
    }

    // Apply filters from KPI dashboard (multi-regional)
    if (filters.userRegionIds && filters.userRegionIds.length > 0) {
      conditions.push(inArray(objectives.regionId, filters.userRegionIds));
    }
    if (filters.userSubRegionIds && filters.userSubRegionIds.length > 0) {
      conditions.push(inArray(objectives.subRegionId, filters.userSubRegionIds));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(objectives.createdAt));
    
    return results.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      ownerId: row.ownerId,
      regionId: row.regionId,
      subRegionId: row.subRegionId, 
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      progress: row.progress,
      period: row.period,
      serviceLineId: row.serviceLineId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      owner: {
        id: row.owner?.id || 0,
        username: row.owner?.username || '',
        name: row.owner?.name || '',
        email: row.owner?.email || '',
        role: row.owner?.role || 'operacional',
        gestorId: row.owner?.gestorId || null,
        regionIds: row.owner?.regionIds || [],
        subRegionIds: row.owner?.subRegionIds || [],
        solutionIds: row.owner?.solutionIds || [],
        serviceLineIds: row.owner?.serviceLineIds || [],
        serviceIds: row.owner?.serviceIds || [],
        password: row.owner?.password || '',
        active: row.owner?.active || false,
        createdAt: row.owner?.createdAt || '',
        updatedAt: row.owner?.updatedAt || '',
        approved: row.owner?.approved || false,
        approvedAt: row.owner?.approvedAt || null,
        approvedBy: row.owner?.approvedBy || null,
      },
      region: row.region ? {
        id: row.region.id,
        name: row.region.name,
        code: row.region.code,
      } : undefined,
      subRegion: row.subRegion ? {
        id: row.subRegion.id,
        name: row.subRegion.name,
        code: row.subRegion.code,
        regionId: row.subRegion.regionId,
      } : undefined,
      serviceLine: row.serviceLine ? {
        id: row.serviceLine.id,
        name: row.serviceLine.name,
        solutionId: row.serviceLine.solutionId,
        description: row.serviceLine.description,
      } : undefined,
    }));
  }

  async getObjective(id: number, currentUserId?: number): Promise<Objective | undefined> {
    const result = await db.select().from(objectives).where(eq(objectives.id, id)).limit(1);
    return result[0];
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    try {
      // Use raw SQL for the insert to ensure we get the ID properly
      const query = `
        INSERT INTO objectives (title, description, owner_id, region_id, sub_region_id, start_date, end_date, status, progress)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await connection.execute(query, [
        objective.title,
        objective.description,
        objective.ownerId,
        objective.regionId || null,
        objective.subRegionId || null,
        objective.startDate,
        objective.endDate,
        objective.status || 'active',
        objective.progress || 0
      ]);
      
      const insertId = (result as any).insertId;
      console.log('Raw SQL insert result:', result);
      console.log('Insert ID:', insertId);
      
      if (!insertId || insertId === 0) {
        throw new Error('Failed to get insert ID from database');
      }
      
      // Return the objective data directly without calling getObjective to avoid the NaN issue
      const createdObjective = {
        id: Number(insertId),
        title: objective.title,
        description: objective.description,
        ownerId: objective.ownerId,
        regionId: objective.regionId,
        subRegionId: objective.subRegionId,
        startDate: objective.startDate,
        endDate: objective.endDate,
        status: objective.status || 'active',
        progress: objective.progress || 0,
        period: null,
        serviceLineId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return createdObjective as Objective;
    } catch (error) {
      console.error('Error creating objective:', error);
      throw new Error('Failed to create objective: ' + (error as Error).message);
    }
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

  // Key Results methods with hierarchical access control
  async getKeyResults(objectiveId?: number, currentUserId?: number): Promise<(KeyResult & { 
    objective: Objective; 
    strategicIndicator?: StrategicIndicator 
  })[]> {
    let query = db.select()
    .from(keyResults)
    .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id));

    const conditions = [];
    
    if (objectiveId) {
      conditions.push(eq(keyResults.objectiveId, objectiveId));
    }

    // Apply hierarchical access control
    if (currentUserId) {
      const user = await this.getUserById(currentUserId);
      if (user && user.role !== 'admin') {
        const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
        const userSubRegionIds = Array.isArray(user.subRegionIds) ? user.subRegionIds : [];
        
        // Filter by user's accessible regions/sub-regions through objectives
        if (userSubRegionIds.length > 0) {
          conditions.push(inArray(objectives.subRegionId, userSubRegionIds));
        } else if (userRegionIds.length > 0) {
          conditions.push(inArray(objectives.regionId, userRegionIds));
        }
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(keyResults.createdAt));
    
    return results.map(row => ({
      id: row.key_results.id,
      objectiveId: row.key_results.objectiveId,
      title: row.key_results.title,
      description: row.key_results.description,
      strategicIndicatorIds: row.key_results.strategicIndicatorIds,
      serviceLineIds: row.key_results.serviceLineIds,
      serviceId: row.key_results.serviceId,
      initialValue: row.key_results.initialValue,
      targetValue: row.key_results.targetValue,
      currentValue: row.key_results.currentValue,
      unit: row.key_results.unit,
      frequency: row.key_results.frequency,
      startDate: row.key_results.startDate,
      endDate: row.key_results.endDate,
      status: row.key_results.status,
      progress: row.key_results.progress,
      number: row.key_results.number,
      createdAt: row.key_results.createdAt,
      updatedAt: row.key_results.updatedAt,
      objective: row.objectives!,
      strategicIndicator: undefined, // We'll handle strategic indicators separately
    }));
  }

  async getKeyResult(id: number, currentUserId?: number): Promise<KeyResult | undefined> {
    if (!id || isNaN(id)) {
      console.error('Invalid ID provided to getKeyResult:', id);
      return undefined;
    }
    
    try {
      const result = await db.select().from(keyResults).where(eq(keyResults.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error in getKeyResult for ID', id, ':', error);
      return undefined;
    }
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    try {
      const insertResult = await db.insert(keyResults).values({
        ...keyResult,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log('Insert result for key result:', insertResult);
      const insertId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult.insertId;
      console.log('Insert ID:', insertId, 'Type:', typeof insertId);
      
      if (!insertId || insertId === 0 || isNaN(Number(insertId))) {
        throw new Error(`Invalid insert ID: ${insertId}. Expected a valid number.`);
      }
      
      const keyResultId = Number(insertId);
      const newKeyResult = await this.getKeyResult(keyResultId);
      if (!newKeyResult) throw new Error('Failed to retrieve created key result');
      
      // Generate checkpoints automatically
      await this.generateCheckpoints(keyResultId);
      
      return newKeyResult;
    } catch (error) {
      console.error('Error in createKeyResult:', error);
      throw new Error(`Failed to create key result: ${(error as Error).message}`);
    }
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

  // Actions methods with hierarchical access control
  async getActions(keyResultId?: number, currentUserId?: number): Promise<(Action & { 
    keyResult: KeyResult; 
    responsible?: User 
  })[]> {
    let query = db.select()
    .from(actions)
    .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
    .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
    .leftJoin(users, eq(actions.responsibleId, users.id));

    const conditions = [];
    
    if (keyResultId) {
      conditions.push(eq(actions.keyResultId, keyResultId));
    }

    // Apply hierarchical access control through objectives
    if (currentUserId) {
      const user = await this.getUserById(currentUserId);
      if (user && user.role !== 'admin') {
        const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
        const userSubRegionIds = Array.isArray(user.subRegionIds) ? user.subRegionIds : [];
        
        // Filter by user's accessible regions/sub-regions through objectives
        if (userSubRegionIds.length > 0) {
          conditions.push(inArray(objectives.subRegionId, userSubRegionIds));
        } else if (userRegionIds.length > 0) {
          conditions.push(inArray(objectives.regionId, userRegionIds));
        }
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(actions.createdAt));
    
    return results.map(row => ({
      id: row.actions.id,
      keyResultId: row.actions.keyResultId,
      title: row.actions.title,
      description: row.actions.description,
      number: row.actions.number,
      responsibleId: row.actions.responsibleId,
      dueDate: row.actions.dueDate,
      status: row.actions.status,
      priority: row.actions.priority,
      createdAt: row.actions.createdAt,
      updatedAt: row.actions.updatedAt,
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
    
    const insertId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult.insertId;
    if (!insertId || insertId === 0 || isNaN(Number(insertId))) {
      throw new Error(`Invalid action insert ID: ${insertId}`);
    }
    
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

  // Checkpoints methods with hierarchical access control
  async getCheckpoints(keyResultId?: number, currentUserId?: number): Promise<Checkpoint[]> {
    let query = db.select().from(checkpoints);
    
    const conditions = [];
    
    if (keyResultId) {
      conditions.push(eq(checkpoints.keyResultId, keyResultId));
    }

    // Apply hierarchical access control through key results and objectives
    if (currentUserId) {
      const user = await this.getUserById(currentUserId);
      if (user && user.role !== 'admin') {
        const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
        const userSubRegionIds = Array.isArray(user.subRegionIds) ? user.subRegionIds : [];
        
        // Join with key results and objectives to apply regional filtering
        query = query
          .leftJoin(keyResults, eq(checkpoints.keyResultId, keyResults.id))
          .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id));
        
        // Filter by user's accessible regions/sub-regions
        if (userSubRegionIds.length > 0) {
          conditions.push(inArray(objectives.subRegionId, userSubRegionIds));
        } else if (userRegionIds.length > 0) {
          conditions.push(inArray(objectives.regionId, userRegionIds));
        }
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(asc(checkpoints.dueDate));
    
    // If we joined with other tables, map to only checkpoint data
    if (currentUserId) {
      const user = await this.getUserById(currentUserId);
      if (user && user.role !== 'admin') {
        return results.map((row: any) => ({
          id: row.checkpoints?.id || row.id,
          keyResultId: row.checkpoints?.keyResultId || row.keyResultId,
          title: row.checkpoints?.title || row.title,
          description: row.checkpoints?.description || row.description,
          targetValue: row.checkpoints?.targetValue || row.targetValue,
          actualValue: row.checkpoints?.actualValue || row.actualValue,
          dueDate: row.checkpoints?.dueDate || row.dueDate,
          status: row.checkpoints?.status || row.status,
          notes: row.checkpoints?.notes || row.notes,
          createdAt: row.checkpoints?.createdAt || row.createdAt,
          updatedAt: row.checkpoints?.updatedAt || row.updatedAt,
        }));
      }
    }
    
    return results;
  }

  async getCheckpoint(id: number, currentUserId?: number): Promise<Checkpoint | undefined> {
    const result = await db.select().from(checkpoints).where(eq(checkpoints.id, id)).limit(1);
    return result[0];
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    // Ensure all date fields are proper Date objects
    const checkpointData = {
      ...checkpoint,
      dueDate: checkpoint.dueDate instanceof Date ? checkpoint.dueDate : new Date(checkpoint.dueDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const insertResult = await db.insert(checkpoints).values(checkpointData);
    
    const insertId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult.insertId;
    if (!insertId || insertId === 0 || isNaN(Number(insertId))) {
      throw new Error(`Invalid checkpoint insert ID: ${insertId}`);
    }
    
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
    
    // Cascading update: Update the key result's current value based on checkpoint progress
    if (checkpoint.actualValue !== undefined && updatedCheckpoint.keyResultId) {
      await this.updateKeyResultProgressFromCheckpoints(updatedCheckpoint.keyResultId);
    }
    
    return updatedCheckpoint;
  }

  async deleteCheckpoint(id: number): Promise<void> {
    await db.delete(checkpoints).where(eq(checkpoints.id, id));
  }

  private async updateKeyResultProgressFromCheckpoints(keyResultId: number): Promise<void> {
    try {
      // Get all checkpoints for this key result
      const checkpointsList = await db.select()
        .from(checkpoints)
        .where(eq(checkpoints.keyResultId, keyResultId))
        .orderBy(asc(checkpoints.dueDate));

      if (checkpointsList.length === 0) return;

      // Calculate the current value based on the latest completed checkpoint
      // or the highest actual value achieved so far
      let currentValue = 0;
      let latestProgressDate = null;

      for (const checkpoint of checkpointsList) {
        const actualValue = Number(checkpoint.actualValue) || 0;
        if (actualValue > currentValue) {
          currentValue = actualValue;
          latestProgressDate = checkpoint.updatedAt;
        }
      }

      // Update the key result's current value
      await db.update(keyResults).set({
        currentValue: currentValue.toString(),
        updatedAt: new Date(),
      }).where(eq(keyResults.id, keyResultId));

      console.log(`Updated key result ${keyResultId} currentValue to ${currentValue} based on checkpoint progress`);
    } catch (error) {
      console.error('Error updating key result progress from checkpoints:', error);
      // Don't throw error to avoid breaking checkpoint update
    }
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    if (!keyResultId || isNaN(keyResultId)) {
      throw new Error(`Invalid keyResultId: ${keyResultId}`);
    }
    
    try {
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
      const totalTarget = Number(keyResult.targetValue);
      
      // First, calculate all checkpoint periods to determine total count
      const periods = [];
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
        
        periods.push({
          number: checkpointNumber,
          dueDate: nextDate,
        });
        
        currentDate = new Date(nextDate);
        currentDate.setDate(currentDate.getDate() + 1);
        checkpointNumber++;
        
        if (nextDate >= endDate) break;
      }

      // Now create checkpoints with cumulative targets (last checkpoint = total target)
      const totalPeriods = periods.length;
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const isLastCheckpoint = i === periods.length - 1;
        
        // Target is cumulative: each checkpoint builds up to the total
        const targetValue = isLastCheckpoint ? totalTarget : (totalTarget / totalPeriods) * (i + 1);
        
        checkpointsToCreate.push({
          keyResultId,
          title: `Checkpoint ${period.number}`,
          targetValue: targetValue.toString(),
          actualValue: "0",
          status: "pending" as const,
          dueDate: new Date(period.dueDate),
        });
      }

      // Insert all checkpoints
      const createdCheckpoints: Checkpoint[] = [];
      for (const checkpoint of checkpointsToCreate) {
        const created = await this.createCheckpoint(checkpoint);
        createdCheckpoints.push(created);
      }

      return createdCheckpoints;
    } catch (error) {
      console.error('Error in generateCheckpoints for keyResultId', keyResultId, ':', error);
      throw new Error(`Failed to generate checkpoints: ${(error as Error).message}`);
    }
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
      user: row.users!,
    }));
  }

  async createActionComment(comment: InsertActionComment): Promise<ActionComment> {
    const insertResult = await db.insert(actionComments).values({
      ...comment,
      createdAt: new Date(),
    });
    
    const insertId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult.insertId;
    if (!insertId || insertId === 0 || isNaN(Number(insertId))) {
      throw new Error(`Invalid action comment insert ID: ${insertId}`);
    }
    
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

  async getAvailableQuarters(): Promise<string[]> {
    return getQuarterlyPeriods();
  }

  async getQuarterlyStats(period: string = 'all'): Promise<any> {
    const data = await this.getQuarterlyData(period);
    return {
      totalObjectives: data.objectives.length,
      totalKeyResults: data.keyResults.length,
      totalActions: data.actions.length,
      completedObjectives: data.objectives.filter(o => o.status === 'completed').length,
      completedKeyResults: data.keyResults.filter(kr => kr.status === 'completed').length,
      completedActions: data.actions.filter(a => a.status === 'completed').length,
    };
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