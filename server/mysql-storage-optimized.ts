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

// Performance cache and monitoring instances
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
  getQuarterlyStats(): Promise<any[]>;
  getDashboardKPIs(currentUserId?: number): Promise<any>;

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
      if (allObjectives.length === 0) {
        // Return default quarters for current year if no objectives exist
        return [
          { id: '2025-T1', name: 'T1 2025', startDate: '2025-01-01', endDate: '2025-03-31' },
          { id: '2025-T2', name: 'T2 2025', startDate: '2025-04-01', endDate: '2025-06-30' },
          { id: '2025-T3', name: 'T3 2025', startDate: '2025-07-01', endDate: '2025-09-30' },
          { id: '2025-T4', name: 'T4 2025', startDate: '2025-10-01', endDate: '2025-12-31' }
        ];
      }
      
      const quarters = getQuarterlyPeriods(allObjectives, null);
      return quarters.length > 0 ? quarters : [
        { id: '2025-T1', name: 'T1 2025', startDate: '2025-01-01', endDate: '2025-03-31' },
        { id: '2025-T2', name: 'T2 2025', startDate: '2025-04-01', endDate: '2025-06-30' },
        { id: '2025-T3', name: 'T3 2025', startDate: '2025-07-01', endDate: '2025-09-30' },
        { id: '2025-T4', name: 'T4 2025', startDate: '2025-10-01', endDate: '2025-12-31' }
      ];
    } catch (error) {
      console.error('Error getting available quarters:', error);
      throw error;
    }
  }

  async getQuarterlyData(quarter?: string, currentUserId?: number): Promise<any> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getQuarterlyData');
      
      // Build base query for objectives with access control (complete objective data)
      let objectivesQuery = db.select({
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
      }).from(objectives)
      .leftJoin(users, eq(objectives.ownerId, users.id));

      // Apply user access control if user is provided
      if (currentUserId) {
        const user = await this.getUser(currentUserId);
        if (user && user.role !== 'admin') {
          const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
          if (userRegionIds.length > 0) {
            objectivesQuery = objectivesQuery.where(
              inArray(objectives.regionId, userRegionIds)
            );
          }
        }
      }

      // Apply quarterly filtering if quarter is specified
      if (quarter && quarter !== 'all') {
        // Parse quarter string like "2025-T1" or "2025-Q1" to get dates
        const quarterMatch = quarter.match(/(\d{4})-[TQ](\d)/);
        if (quarterMatch) {
          const year = parseInt(quarterMatch[1]);
          const quarterNum = parseInt(quarterMatch[2]);
          
          // Calculate quarter start and end dates
          const quarterStartMonth = (quarterNum - 1) * 3;
          const quarterStartDate = `${year}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`;
          const quarterEndMonth = quarterStartMonth + 2;
          const quarterEndDate = `${year}-${String(quarterEndMonth + 1).padStart(2, '0')}-${new Date(year, quarterEndMonth + 1, 0).getDate()}`;
          
          objectivesQuery = objectivesQuery.where(
            and(
              sql`${objectives.startDate} <= ${quarterEndDate}`,
              sql`${objectives.endDate} >= ${quarterStartDate}`
            )
          );
        }
      }

      const quarterObjectives = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await objectivesQuery;
      });

      // Get related key results, actions, and checkpoints for the objectives
      const objectiveIds = quarterObjectives.map(obj => obj.id);
      let quarterKeyResults: any[] = [];
      let quarterActions: any[] = [];

      if (objectiveIds.length > 0) {
        // Get full key results data for these objectives
        quarterKeyResults = await MySQLConnectionOptimizer.executeWithLimit(async () => {
          return await db.select({
            keyResults: keyResults,
            objectives: objectives,
          })
          .from(keyResults)
          .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
          .where(inArray(keyResults.objectiveId, objectiveIds));
        });

        // Get key result IDs for actions
        const krIds = quarterKeyResults.map(row => row.keyResults.id);
        
        if (krIds.length > 0) {
          // Get full actions data for these key results
          quarterActions = await MySQLConnectionOptimizer.executeWithLimit(async () => {
            return await db.select({
              actions: actions,
              keyResults: keyResults,
              users: users,
            })
            .from(actions)
            .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
            .leftJoin(users, eq(actions.responsibleId, users.id))
            .where(inArray(actions.keyResultId, krIds));
          });
        }
      }

      MySQLPerformanceMonitor.endQuery('getQuarterlyData', startTime);
      
      return {
        objectives: quarterObjectives,
        keyResults: quarterKeyResults.map(row => ({
          ...row.keyResults,
          objective: row.objectives!,
        })),
        actions: quarterActions.map(row => ({
          ...row.actions,
          keyResult: row.keyResults!,
          responsible: row.users ? this.parseUserJsonFields(row.users) : undefined,
        })),
      };
    } catch (error) {
      console.error('Error getting quarterly data:', error);
      throw error;
    }
  }

  async getQuarterlyStats(): Promise<any[]> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getQuarterlyStats');
      
      const allObjectives = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select({
          startDate: objectives.startDate,
          endDate: objectives.endDate
        }).from(objectives);
      });
      
      MySQLPerformanceMonitor.endQuery('getQuarterlyStats', startTime);
      
      // Generate quarterly stats
      const quarters = getQuarterlyPeriods(allObjectives, null);
      const stats = [];
      
      for (const quarter of quarters) {
        const quarterData = await this.getQuarterlyData(quarter.id);
        stats.push({
          period: quarter.id,
          name: quarter.name,
          ...quarterData
        });
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting quarterly stats:', error);
      throw error;
    }
  }

  async getDashboardKPIs(currentUserId?: number, filters?: any): Promise<any> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getDashboardKPIs');
      
      // Get comprehensive counts with user access control and quarterly filtering
      const objectivesFilters = { currentUserId, ...filters };
      
      let objectivesResult, keyResultsResult, actionsResult;
      
      if (filters?.quarter && filters.quarter !== 'all') {
        // Use quarterly data filtering
        const quarterlyData = await this.getQuarterlyData(filters.quarter, currentUserId);
        
        // Get the full objective objects for the quarter
        const allObjectives = await this.getObjectives({ currentUserId });
        objectivesResult = allObjectives.filter(obj => {
          const startDate = new Date(obj.startDate);
          const endDate = new Date(obj.endDate);
          // Parse quarter string like "2025-T1" or "2025-Q1" to get dates
          const quarterMatch = filters.quarter.match(/(\d{4})-[TQ](\d)/);
          if (!quarterMatch) {
            throw new Error(`Invalid quarter format: ${filters.quarter}`);
          }
          
          const year = parseInt(quarterMatch[1]);
          const quarterNum = parseInt(quarterMatch[2]);
          const quarterStart = new Date(year, (quarterNum - 1) * 3, 1);
          const quarterEnd = new Date(year, quarterNum * 3, 0);
          
          return (startDate <= quarterEnd && endDate >= quarterStart);
        });
        
        // Get related key results and actions for quarterly objectives
        const objectiveIds = objectivesResult.map(obj => obj.id);
        const allKeyResults = await this.getKeyResults({ currentUserId });
        const allActions = await this.getActions({ currentUserId });
        
        keyResultsResult = allKeyResults.filter(kr => objectiveIds.includes(kr.objectiveId));
        const keyResultIds = keyResultsResult.map(kr => kr.id);
        actionsResult = allActions.filter(action => keyResultIds.includes(action.keyResultId));
        
      } else {
        // Use regular filtering for all periods
        objectivesResult = await this.getObjectives(objectivesFilters);
        keyResultsResult = await this.getKeyResults({ currentUserId });
        actionsResult = await this.getActions({ currentUserId });
      }
      
      const objectivesCount = objectivesResult.length;
      const keyResultsCount = keyResultsResult.length;
      const actionsCount = actionsResult.length;
      
      // Calculate completion rates
      const completedObjectives = objectivesResult.filter(obj => obj.status === 'completed').length;
      const onTrackObjectives = objectivesResult.filter(obj => obj.status === 'active').length;
      const delayedObjectives = objectivesResult.filter(obj => obj.status === 'delayed').length;
      
      const completionRate = objectivesCount > 0 ? Math.round((completedObjectives / objectivesCount) * 100) : 0;
      
      const kpis = {
        objectives: objectivesCount,
        keyResults: keyResultsCount,
        actions: actionsCount,
        checkpoints: 0, // Will implement when checkpoints are needed
        completionRate,
        onTrackObjectives,
        delayedObjectives,
        activeUsers: 1
      };
      
      MySQLPerformanceMonitor.endQuery('getDashboardKPIs', startTime);
      
      return kpis;
    } catch (error) {
      console.error('Error getting dashboard KPIs:', error);
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
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getKeyResults');
      
      let query = db.select({
        id: keyResults.id,
        title: keyResults.title,
        description: keyResults.description,
        targetValue: keyResults.targetValue,
        currentValue: keyResults.currentValue,
        unit: keyResults.unit,
        startDate: keyResults.startDate,
        endDate: keyResults.endDate,
        status: keyResults.status,
        objectiveId: keyResults.objectiveId,
        strategicIndicatorIds: keyResults.strategicIndicatorIds,
        serviceLineIds: keyResults.serviceLineIds,
        createdAt: keyResults.createdAt,
        updatedAt: keyResults.updatedAt
      })
      .from(keyResults);

      let whereConditions: any[] = [];

      // Apply user access filters
      if (filters?.currentUserId) {
        const user = await this.getUser(filters.currentUserId);
        if (user && user.role !== 'admin') {
          // Get user's accessible objectives first
          const userObjectives = await this.getObjectives({ currentUserId: filters.currentUserId });
          const objectiveIds = userObjectives.map(obj => obj.id);
          if (objectiveIds.length > 0) {
            whereConditions.push(inArray(keyResults.objectiveId, objectiveIds));
          } else {
            return [];
          }
        }
      }

      // Apply other filters
      if (filters?.objectiveId) {
        whereConditions.push(eq(keyResults.objectiveId, filters.objectiveId));
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await query;
      });

      MySQLPerformanceMonitor.endQuery('getKeyResults', startTime);
      console.log(`Fetching key results for objectiveId: ${filters?.objectiveId}`);
      console.log(`Key results found: ${result.length}`);
      
      return result;
    } catch (error) {
      console.error('Error fetching key results:', error);
      throw error;
    }
  }

  async getKeyResult(id: number, currentUserId?: number): Promise<any | undefined> {
    if (!id || isNaN(id)) {
      console.error('Invalid ID provided to getKeyResult:', id);
      return undefined;
    }
    
    try {
      const result = await db.select().from(keyResults).where(eq(keyResults.id, id)).limit(1);
      
      if (result.length > 0) {
        const keyResult = result[0];
        // Parse JSON fields if needed
        if (typeof keyResult.strategicIndicatorIds === 'string') {
          try {
            keyResult.strategicIndicatorIds = JSON.parse(keyResult.strategicIndicatorIds);
          } catch (e) {
            keyResult.strategicIndicatorIds = [];
          }
        }
        if (typeof keyResult.serviceLineIds === 'string') {
          try {
            keyResult.serviceLineIds = JSON.parse(keyResult.serviceLineIds);
          } catch (e) {
            keyResult.serviceLineIds = [];
          }
        }
        
        return keyResult;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error in getKeyResult for ID', id, ':', error);
      return undefined;
    }
  }

  async generateCheckpoints(keyResultId: number): Promise<any[]> {
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
      const frequency = keyResult.frequency || 'monthly';
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
        const targetValue = isLastCheckpoint ? totalTarget : Math.round((totalTarget / totalPeriods) * (i + 1) * 100) / 100;
        
        checkpointsToCreate.push({
          keyResultId,
          period: `Checkpoint ${period.number}`,
          targetValue: targetValue.toString(),
          actualValue: "0",
          status: "pending" as const,
          dueDate: period.dueDate,
        });
      }

      // Insert all checkpoints
      const createdCheckpoints: any[] = [];
      for (const checkpoint of checkpointsToCreate) {
        const [result] = await db.insert(checkpoints).values(checkpoint);
        createdCheckpoints.push({
          id: result.insertId,
          ...checkpoint
        });
      }

      return createdCheckpoints;
    } catch (error) {
      console.error('Error in generateCheckpoints for keyResultId', keyResultId, ':', error);
      throw new Error(`Failed to generate checkpoints: ${(error as Error).message}`);
    }
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
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getActions');
      
      let query = db.select({
        id: actions.id,
        title: actions.title,
        description: actions.description,
        priority: actions.priority,
        status: actions.status,
        dueDate: actions.dueDate,
        keyResultId: actions.keyResultId,
        responsibleId: actions.responsibleId,
        createdAt: actions.createdAt,
        updatedAt: actions.updatedAt,
        responsibleName: users.name,
        responsibleUsername: users.username
      })
      .from(actions)
      .leftJoin(users, eq(actions.responsibleId, users.id));

      let whereConditions: any[] = [];

      // Apply user access filters
      if (filters?.currentUserId) {
        const user = await this.getUser(filters.currentUserId);
        if (user && user.role !== 'admin') {
          // Get user's accessible key results first
          const userKeyResults = await this.getKeyResults({ currentUserId: filters.currentUserId });
          const keyResultIds = userKeyResults.map(kr => kr.id);
          if (keyResultIds.length > 0) {
            whereConditions.push(inArray(actions.keyResultId, keyResultIds));
          } else {
            return [];
          }
        }
      }

      // Apply other filters
      if (filters?.keyResultId) {
        whereConditions.push(eq(actions.keyResultId, filters.keyResultId));
      }

      if (filters?.responsibleId) {
        whereConditions.push(eq(actions.responsibleId, filters.responsibleId));
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await query;
      });

      MySQLPerformanceMonitor.endQuery('getActions', startTime);
      
      return result;
    } catch (error) {
      console.error('Error fetching actions:', error);
      throw error;
    }
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