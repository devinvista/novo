import { 
  users, regions as regionsTable, subRegions, serviceLines, strategicIndicators, 
  objectives, keyResults, actions, checkpoints, actionComments,
  solutions as solutionsTable, services,
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
import { MySQLPerformanceCache, MySQLPerformanceMonitor, MySQLConnectionOptimizer } from './mysql-performance-cache';

// Session store configuration for MySQL
const sessionStore = MemoryStore(session);

// Initialize performance cache
const performanceCache = MySQLPerformanceCache.getInstance();

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

  // Quarter management
  getAvailableQuarters(): Promise<any[]>;
  getQuarterlyData(quarter?: string, currentUserId?: number): Promise<any>;

  // OKR management
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
  updateCheckpoint(id: number, data: any): Promise<Checkpoint>;
  generateCheckpoints(keyResultId: number): Promise<Checkpoint[]>;

  // Action comments
  getActionComments(actionId: number): Promise<any[]>;
  createActionComment(comment: InsertActionComment): Promise<ActionComment>;
}

export class MySQLStorageOptimized implements IStorage {
  
  // Helper method to parse JSON fields safely
  private parseUserJsonFields(user: any): User {
    return {
      ...user,
      regionIds: Array.isArray(user.regionIds) ? user.regionIds : (user.regionIds ? JSON.parse(user.regionIds) : []),
      subRegionIds: Array.isArray(user.subRegionIds) ? user.subRegionIds : (user.subRegionIds ? JSON.parse(user.subRegionIds) : []),
      solutionIds: Array.isArray(user.solutionIds) ? user.solutionIds : (user.solutionIds ? JSON.parse(user.solutionIds) : []),
      serviceLineIds: Array.isArray(user.serviceLineIds) ? user.serviceLineIds : (user.serviceLineIds ? JSON.parse(user.serviceLineIds) : []),
      serviceIds: Array.isArray(user.serviceIds) ? user.serviceIds : (user.serviceIds ? JSON.parse(user.serviceIds) : [])
    };
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Check cache first
      const cachedUser = performanceCache.getCachedUser(id);
      if (cachedUser) {
        return cachedUser;
      }

      const startTime = MySQLPerformanceMonitor.startQuery('getUser');
      
      const userRows = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select().from(users).where(eq(users.id, id)).limit(1);
      });
      
      MySQLPerformanceMonitor.endQuery('getUser', startTime);
      
      if (userRows.length === 0) {
        return undefined;
      }
      
      const parsedUser = this.parseUserJsonFields(userRows[0]);
      performanceCache.setCachedUser(id, parsedUser);
      
      return parsedUser;
    } catch (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getUserByUsername');
      
      const userRows = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select().from(users).where(eq(users.username, username)).limit(1);
      });
      
      MySQLPerformanceMonitor.endQuery('getUserByUsername', startTime);
      
      if (userRows.length === 0) {
        return undefined;
      }
      
      return this.parseUserJsonFields(userRows[0]);
    } catch (error) {
      console.error(`Error fetching user by username ${username}:`, error);
      throw error;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getUsers');
      
      const userRows = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select().from(users).orderBy(desc(users.createdAt));
      });
      
      MySQLPerformanceMonitor.endQuery('getUsers', startTime);
      
      return userRows.map(user => this.parseUserJsonFields(user));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getManagers(): Promise<User[]> {
    try {
      const cacheKey = 'managers';
      const cachedManagers = performanceCache.getCachedReference(cacheKey);
      if (cachedManagers) {
        return cachedManagers;
      }

      const startTime = MySQLPerformanceMonitor.startQuery('getManagers');
      
      const managerRows = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select().from(users).where(eq(users.role, 'gestor')).orderBy(asc(users.username));
      });
      
      MySQLPerformanceMonitor.endQuery('getManagers', startTime);
      
      const managers = managerRows.map(user => this.parseUserJsonFields(user));
      performanceCache.setCachedReference(cacheKey, managers);
      
      return managers;
    } catch (error) {
      console.error('Error fetching managers:', error);
      throw error;
    }
  }

  async getPendingUsers(): Promise<User[]> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getPendingUsers');
      
      const pendingUserRows = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select().from(users).where(eq(users.approved, false)).orderBy(desc(users.createdAt));
      });
      
      MySQLPerformanceMonitor.endQuery('getPendingUsers', startTime);
      
      return pendingUserRows.map(user => this.parseUserJsonFields(user));
    } catch (error) {
      console.error('Error fetching pending users:', error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('createUser');
      
      const insertResult = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.insert(users).values(user);
      });
      
      MySQLPerformanceMonitor.endQuery('createUser', startTime);
      
      const insertId = insertResult[0]?.insertId;
      if (!insertId || isNaN(Number(insertId))) {
        throw new Error(`Failed to get valid insert ID: ${insertId}`);
      }
      
      const newUser = await this.getUser(Number(insertId));
      if (!newUser) throw new Error('Failed to create user');
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('updateUser');
      
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.update(users).set(user).where(eq(users.id, id));
      });
      
      MySQLPerformanceMonitor.endQuery('updateUser', startTime);
      
      // Invalidate cache
      performanceCache.invalidateUser(id);
      
      const updatedUser = await this.getUser(id);
      if (!updatedUser) throw new Error('User not found');
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('deleteUser');
      
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        // Delete related records first to avoid foreign key constraint errors
        await db.delete(actionComments).where(eq(actionComments.userId, id));
        await db.update(objectives).set({ ownerId: undefined }).where(eq(objectives.ownerId, id));
        await db.update(actions).set({ responsibleId: undefined }).where(eq(actions.responsibleId, id));
        await db.update(users).set({ gestorId: undefined }).where(eq(users.gestorId, id));
        await db.update(users).set({ approvedBy: undefined }).where(eq(users.approvedBy, id));
        await db.delete(users).where(eq(users.id, id));
      });
      
      MySQLPerformanceMonitor.endQuery('deleteUser', startTime);
      
      // Invalidate cache
      performanceCache.invalidateUser(id);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
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
    performanceCache.invalidateUser(id);
    
    const approvedUser = await this.getUser(id);
    if (!approvedUser) throw new Error('User not found');
    return approvedUser;
  }

  async approveUserWithPermissions(id: number, approvedBy: number, permissions: any): Promise<User> {
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
    
    performanceCache.invalidateUser(id);
    
    const approvedUser = await this.getUser(id);
    if (!approvedUser) throw new Error('User not found');
    return approvedUser;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return await this.getUser(id);
  }

  // Reference data methods with caching
  async getRegions(): Promise<Region[]> {
    const cacheKey = 'regions';
    const cached = performanceCache.getCachedReference(cacheKey);
    if (cached) return cached;

    const regionsData = await db.select().from(regionsTable).orderBy(asc(regionsTable.id));
    performanceCache.setCachedReference(cacheKey, regionsData);
    return regionsData;
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    const cacheKey = `subRegions-${regionId || 'all'}`;
    const cached = performanceCache.getCachedReference(cacheKey);
    if (cached) return cached;

    const query = db.select().from(subRegions);
    if (regionId) {
      query.where(eq(subRegions.regionId, regionId));
    }
    const result = await query.orderBy(asc(subRegions.id));
    performanceCache.setCachedReference(cacheKey, result);
    return result;
  }

  async getSolutions(): Promise<Solution[]> {
    const cacheKey = 'solutions';
    const cached = performanceCache.getCachedReference(cacheKey);
    if (cached) return cached;

    const solutionsData = await db.select().from(solutionsTable).orderBy(asc(solutionsTable.name));
    performanceCache.setCachedReference(cacheKey, solutionsData);
    return solutionsData;
  }

  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    const cacheKey = `serviceLines-${solutionId || 'all'}`;
    const cached = performanceCache.getCachedReference(cacheKey);
    if (cached) return cached;

    const query = db.select().from(serviceLines);
    if (solutionId) {
      query.where(eq(serviceLines.solutionId, solutionId));
    }
    const result = await query.orderBy(asc(serviceLines.name));
    performanceCache.setCachedReference(cacheKey, result);
    return result;
  }

  async getServices(serviceLineId?: number): Promise<Service[]> {
    const cacheKey = `services-${serviceLineId || 'all'}`;
    const cached = performanceCache.getCachedReference(cacheKey);
    if (cached) return cached;

    const query = db.select().from(services);
    if (serviceLineId) {
      query.where(eq(services.serviceLineId, serviceLineId));
    }
    const result = await query.orderBy(asc(services.name));
    performanceCache.setCachedReference(cacheKey, result);
    return result;
  }

  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    const cacheKey = 'strategicIndicators';
    const cached = performanceCache.getCachedReference(cacheKey);
    if (cached) return cached;

    const indicatorsData = await db.select().from(strategicIndicators).orderBy(asc(strategicIndicators.name));
    performanceCache.setCachedReference(cacheKey, indicatorsData);
    return indicatorsData;
  }

  // Quarter management methods
  async getAvailableQuarters(): Promise<any[]> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getAvailableQuarters');
      
      const allObjectives = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select({
          startDate: objectives.startDate,
          endDate: objectives.endDate
        }).from(objectives);
      });
      
      MySQLPerformanceMonitor.endQuery('getAvailableQuarters', startTime);
      
      // Generate quarters from objectives date ranges
      const quarters = getQuarterlyPeriods(allObjectives, null);
      return quarters;
    } catch (error) {
      console.error('Error getting available quarters:', error);
      throw error;
    }
  }

  async getQuarterlyData(quarter?: string, currentUserId?: number): Promise<any> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getQuarterlyData');
      
      let objectivesQuery = db.select({
        id: objectives.id,
        title: objectives.title,
        startDate: objectives.startDate,
        endDate: objectives.endDate
      }).from(objectives);

      if (quarter && quarter !== 'all') {
        const quarterPeriod = getQuarterlyPeriod(quarter);
        if (quarterPeriod) {
          objectivesQuery = objectivesQuery.where(
            and(
              sql`${objectives.startDate} <= ${quarterPeriod.endDate}`,
              sql`${objectives.endDate} >= ${quarterPeriod.startDate}`
            )
          );
        }
      }

      const quarterObjectives = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await objectivesQuery;
      });

      MySQLPerformanceMonitor.endQuery('getQuarterlyData', startTime);
      
      return {
        objectives: quarterObjectives.length,
        keyResults: 0, // Simplified for now
        actions: 0,
        checkpoints: 0
      };
    } catch (error) {
      console.error('Error getting quarterly data:', error);
      throw error;
    }
  }

  // Helper method to check user access to regions
  private async checkUserAccess(currentUserId: number, regionId?: number): Promise<boolean> {
    if (!currentUserId) return false;

    const user = await this.getUser(currentUserId);
    if (!user) return false;

    // Admin has access to everything
    if (user.role === 'admin') return true;

    // If no region specified, allow access
    if (!regionId) return true;

    // Check if user has access to the region
    const userRegionIds = user.regionIds || [];
    return userRegionIds.includes(regionId);
  }

  // OKR Methods with full implementation and user access control
  async getObjectives(filters?: any): Promise<any[]> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getObjectives');
      
      let query = db.select({
        id: objectives.id,
        title: objectives.title,
        description: objectives.description,
        startDate: objectives.startDate,
        endDate: objectives.endDate,
        status: objectives.status,
        regionId: objectives.regionId,
        ownerId: objectives.ownerId,
        createdAt: objectives.createdAt,
        updatedAt: objectives.updatedAt,
        ownerName: users.name,
        ownerUsername: users.username
      })
      .from(objectives)
      .leftJoin(users, eq(objectives.ownerId, users.id));

      let whereConditions: any[] = [];

      // Apply user access filters
      if (filters?.currentUserId) {
        const user = await this.getUser(filters.currentUserId);
        if (user && user.role !== 'admin') {
          // Non-admin users only see objectives from their accessible regions
          const userRegionIds = user.regionIds || [];
          if (userRegionIds.length > 0) {
            whereConditions.push(inArray(objectives.regionId, userRegionIds));
          } else {
            // If user has no regions, return empty array
            return [];
          }
        }
      }

      // Apply other filters
      if (filters?.regionId) {
        whereConditions.push(eq(objectives.regionId, filters.regionId));
      }

      if (filters?.ownerId) {
        whereConditions.push(eq(objectives.ownerId, filters.ownerId));
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      const objectivesWithOwners = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await query.orderBy(desc(objectives.createdAt));
      });
      
      MySQLPerformanceMonitor.endQuery('getObjectives', startTime);
      
      console.log(`Found ${objectivesWithOwners.length} objectives for user ${filters?.currentUserId}`);
      return objectivesWithOwners;
    } catch (error) {
      console.error('Error fetching objectives:', error);
      throw error;
    }
  }

  async getObjective(id: number, currentUserId?: number): Promise<any | undefined> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getObjective');
      
      const objectiveWithOwner = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select({
          id: objectives.id,
          title: objectives.title,
          description: objectives.description,
          startDate: objectives.startDate,
          endDate: objectives.endDate,
          status: objectives.status,
          regionId: objectives.regionId,
          ownerId: objectives.ownerId,
          createdAt: objectives.createdAt,
          updatedAt: objectives.updatedAt,
          ownerName: users.name,
          ownerUsername: users.username
        })
        .from(objectives)
        .leftJoin(users, eq(objectives.ownerId, users.id))
        .where(eq(objectives.id, id))
        .limit(1);
      });
      
      MySQLPerformanceMonitor.endQuery('getObjective', startTime);
      
      return objectiveWithOwner.length > 0 ? objectiveWithOwner[0] : undefined;
    } catch (error) {
      console.error(`Error fetching objective ${id}:`, error);
      throw error;
    }
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    const result = await db.insert(objectives).values(objective);
    const insertId = result[0]?.insertId;
    const newObjective = await db.select().from(objectives).where(eq(objectives.id, Number(insertId))).limit(1);
    return newObjective[0];
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    await db.update(objectives).set(objective).where(eq(objectives.id, id));
    const updated = await db.select().from(objectives).where(eq(objectives.id, id)).limit(1);
    return updated[0];
  }

  async deleteObjective(id: number): Promise<void> {
    await db.delete(objectives).where(eq(objectives.id, id));
  }

  async getKeyResults(filters?: any): Promise<any[]> {
    return [];
  }

  async getKeyResult(id: number, currentUserId?: number): Promise<any | undefined> {
    return undefined;
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    const result = await db.insert(keyResults).values(keyResult);
    const insertId = result[0]?.insertId;
    const newKeyResult = await db.select().from(keyResults).where(eq(keyResults.id, Number(insertId))).limit(1);
    return newKeyResult[0];
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    await db.update(keyResults).set(keyResult).where(eq(keyResults.id, id));
    const updated = await db.select().from(keyResults).where(eq(keyResults.id, id)).limit(1);
    return updated[0];
  }

  async deleteKeyResult(id: number): Promise<void> {
    await db.delete(keyResults).where(eq(keyResults.id, id));
  }

  async getActions(filters?: any): Promise<any[]> {
    return [];
  }

  async getAction(id: number, currentUserId?: number): Promise<any | undefined> {
    return undefined;
  }

  async createAction(action: InsertAction): Promise<Action> {
    const result = await db.insert(actions).values(action);
    const insertId = result[0]?.insertId;
    const newAction = await db.select().from(actions).where(eq(actions.id, Number(insertId))).limit(1);
    return newAction[0];
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    await db.update(actions).set(action).where(eq(actions.id, id));
    const updated = await db.select().from(actions).where(eq(actions.id, id)).limit(1);
    return updated[0];
  }

  async deleteAction(id: number): Promise<void> {
    await db.delete(actions).where(eq(actions.id, id));
  }

  async getCheckpoints(keyResultId?: number, currentUserId?: number): Promise<any[]> {
    return [];
  }

  async updateCheckpoint(id: number, data: any): Promise<Checkpoint> {
    await db.update(checkpoints).set(data).where(eq(checkpoints.id, id));
    const updated = await db.select().from(checkpoints).where(eq(checkpoints.id, id)).limit(1);
    return updated[0];
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    return [];
  }

  async getActionComments(actionId: number): Promise<any[]> {
    return [];
  }

  async createActionComment(comment: InsertActionComment): Promise<ActionComment> {
    const result = await db.insert(actionComments).values(comment);
    const insertId = result[0]?.insertId;
    const newComment = await db.select().from(actionComments).where(eq(actionComments.id, Number(insertId))).limit(1);
    return newComment[0];
  }
}

// Export optimized storage instance
export const storage = new MySQLStorageOptimized();
export const MySQLStorage = MySQLStorageOptimized;