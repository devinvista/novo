import { 
  users, regions as regionsTable, subRegions as subRegionsTable, serviceLines, strategicIndicators, 
  objectives, keyResults, actions, checkpoints, actionComments,
  solutions as solutionsTable, services,
  type User, type InsertUser, type Objective, type InsertObjective,
  type KeyResult, type InsertKeyResult, type Action, type InsertAction,
  type Checkpoint, type InsertCheckpoint, type Region, type SubRegion,
  type ServiceLine, type StrategicIndicator,
  type Solution, type Service, type ActionComment, type InsertActionComment
} from "@shared/mysql-schema";
import { db, connection } from "./mysql-db";
import { eq, and, desc, sql, asc, inArray, isNotNull, count, sum, isNull } from "drizzle-orm";
import session from "express-session";
// @ts-ignore - memorystore types are outdated
import MemoryStore from "memorystore";
import { getQuarterlyPeriods, getQuarterlyPeriod, getCurrentQuarter, formatQuarter } from "./quarterly-periods";
import { MySQLPerformanceCache, MySQLPerformanceMonitor, MySQLConnectionOptimizer } from './mysql-performance-cache';

// Session store configuration for development
const sessionStore = new (MemoryStore(session))({
  checkPeriod: 86400000 // prune expired entries every 24h
});

// Initialize performance cache
const performanceCache = MySQLPerformanceCache.getInstance();

export interface IStorage {
  // Session store property
  sessionStore: any;

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
  getCheckpoint(id: number, currentUserId?: number): Promise<any | undefined>;
  updateCheckpoint(id: number, data: any): Promise<Checkpoint>;
  deleteCheckpoint(id: number): Promise<void>;
  generateCheckpoints(keyResultId: number): Promise<Checkpoint[]>;

  // Action comments
  getActionComments(actionId: number): Promise<any[]>;
  createActionComment(comment: InsertActionComment): Promise<ActionComment>;

  // Admin CRUD methods for configuration management
  createStrategicIndicator(data: { name: string; description?: string; unit?: string }): Promise<StrategicIndicator>;
  updateStrategicIndicator(id: number, data: { name: string; description?: string; unit?: string }): Promise<StrategicIndicator>;
  deleteStrategicIndicator(id: number): Promise<void>;
  
  createRegion(data: { name: string; code: string }): Promise<Region>;
  updateRegion(id: number, data: { name: string; code: string }): Promise<Region>;
  deleteRegion(id: number): Promise<void>;
  
  createSubRegion(data: { name: string; code: string; regionId: number }): Promise<SubRegion>;
  updateSubRegion(id: number, data: { name: string; code: string; regionId: number }): Promise<SubRegion>;
  deleteSubRegion(id: number): Promise<void>;
  
  createSolution(data: { name: string; description?: string }): Promise<Solution>;
  updateSolution(id: number, data: { name: string; description?: string }): Promise<Solution>;
  deleteSolution(id: number): Promise<void>;
  
  createServiceLine(data: { name: string; description?: string; solutionId: number }): Promise<ServiceLine>;
  updateServiceLine(id: number, data: { name: string; description?: string; solutionId: number }): Promise<ServiceLine>;
  deleteServiceLine(id: number): Promise<void>;
  
  createService(data: { name: string; description?: string; serviceLineId: number }): Promise<Service>;
  updateService(id: number, data: { name: string; description?: string; serviceLineId: number }): Promise<Service>;
  deleteService(id: number): Promise<void>;
}

export class MySQLStorageOptimized implements IStorage {
  // Session store property
  sessionStore: any = sessionStore;
  
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

    const query = db.select().from(subRegionsTable);
    if (regionId) {
      query.where(eq(subRegionsTable.regionId, regionId));
    }
    const result = await query.orderBy(asc(subRegionsTable.id));
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
      
      // Find earliest and latest dates from objectives
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
    } catch (error) {
      console.error('Error getting available quarters:', error);
      throw error;
    }
  }

  async getQuarterlyData(quarter?: string, currentUserId?: number, filters?: any): Promise<any> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getQuarterlyData');
      
      console.log(`🔍 getQuarterlyData called with quarter: ${quarter}, currentUserId: ${currentUserId}, filters:`, filters);
      
      // CRÍTICO: Validar userId
      if (!currentUserId) {
        console.log(`🚫 No currentUserId provided, returning empty data`);
        MySQLPerformanceMonitor.endQuery('getQuarterlyData', startTime);
        return { objectives: [], keyResults: [], actions: [] };
      }

      // Construir filtros baseados nos parâmetros preservando controle de acesso
      const objectiveFilters = {
        currentUserId,
        regionId: filters?.regionId,
        subRegionId: filters?.subRegionId,
        serviceLineId: filters?.serviceLineId
      };

      console.log(`🔍 Using filters with currentUserId preserved:`, objectiveFilters);

      // ETAPA 1: Obter TODOS os objetivos que o usuário tem acesso (sempre aplicar controle de acesso primeiro)
      const userObjectives = await this.getObjectives(objectiveFilters);
      console.log(`🔒 User has access to ${userObjectives.length} objectives total`);

      // ETAPA 2: Aplicar filtro trimestral aos objetivos do usuário SE especificado
      let quarterObjectives = userObjectives;
      if (quarter && quarter !== 'all') {
        const quarterMatch = quarter.match(/(\d{4})-T(\d)/);
        if (quarterMatch) {
          const year = parseInt(quarterMatch[1]);
          const quarterNum = parseInt(quarterMatch[2]);
          
          const quarterStartMonth = (quarterNum - 1) * 3;
          const quarterStartDate = new Date(year, quarterStartMonth, 1);
          const quarterEndDate = new Date(year, quarterStartMonth + 3, 0);
          
          console.log(`📅 Quarter ${quarter}: ${quarterStartDate.toISOString().split('T')[0]} to ${quarterEndDate.toISOString().split('T')[0]}`);
          
          // Filtrar objetivos que sobrepõem com o trimestre
          quarterObjectives = userObjectives.filter(obj => {
            const objStart = new Date(obj.startDate);
            const objEnd = new Date(obj.endDate);
            
            // Sobreposição: obj.start <= quarter.end && obj.end >= quarter.start
            return objStart <= quarterEndDate && objEnd >= quarterStartDate;
          });
          
          console.log(`🔍 After quarterly filter: ${quarterObjectives.length} objectives for user`);
        } else {
          console.warn(`⚠️ Invalid quarter format: ${quarter}`);
        }
      }

      // ETAPA 3: Obter Key Results e Actions relacionados preservando controle de acesso
      const objectiveIds = quarterObjectives.map(obj => obj.id);
      let quarterKeyResults: any[] = [];
      let quarterActions: any[] = [];

      if (objectiveIds.length > 0) {
        // Obter Key Results com controle de acesso preservado
        const userKeyResults = await this.getKeyResults(undefined, { currentUserId });
        quarterKeyResults = userKeyResults.filter(kr => objectiveIds.includes(kr.objectiveId));
        
        // Aplicar filtro adicional de linha de serviço se especificado
        if (filters?.serviceLineId) {
          quarterKeyResults = quarterKeyResults.filter(kr => kr.serviceLineId === filters.serviceLineId);
          console.log(`🎯 Applied serviceLineId filter: ${filters.serviceLineId}`);
        }

        // Obter Actions com controle de acesso preservado
        const keyResultIds = quarterKeyResults.map(kr => kr.id);
        if (keyResultIds.length > 0) {
          const userActions = await this.getActions({ currentUserId });
          quarterActions = userActions.filter(action => keyResultIds.includes(action.keyResultId));
        }
      }

      console.log(`🔍 Final results: ${quarterObjectives.length} objectives, ${quarterKeyResults.length} key results, ${quarterActions.length} actions`);

      MySQLPerformanceMonitor.endQuery('getQuarterlyData', startTime);
      
      return {
        objectives: quarterObjectives,
        keyResults: quarterKeyResults,
        actions: quarterActions
      };
    } catch (error) {
      console.error('Error getting quarterly data:', error);
      MySQLPerformanceMonitor.endQuery('getQuarterlyData', Date.now());
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
      
      // Generate quarterly stats from objectives dates
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
          const [year, quarter] = filters.quarter.split('-T');
          const quarterStart = new Date(parseInt(year), (parseInt(quarter) - 1) * 3, 1);
          const quarterEnd = new Date(parseInt(year), parseInt(quarter) * 3, 0);
          
          return (startDate <= quarterEnd && endDate >= quarterStart);
        });
        
        // Get related key results and actions for quarterly objectives
        const objectiveIds = objectivesResult.map(obj => obj.id);
        const allKeyResults = await this.getKeyResults(undefined, { currentUserId });
        const allActions = await this.getActions({ currentUserId });
        
        keyResultsResult = allKeyResults.filter(kr => objectiveIds.includes(kr.objectiveId));
        const keyResultIds = keyResultsResult.map(kr => kr.id);
        actionsResult = allActions.filter(action => keyResultIds.includes(action.keyResultId));
        
      } else {
        // Use regular filtering for all periods
        objectivesResult = await this.getObjectives(objectivesFilters);
        keyResultsResult = await this.getKeyResults(undefined, { currentUserId });
        actionsResult = await this.getActions({ currentUserId });
      }
      
      const objectivesCount = objectivesResult.length;
      const keyResultsCount = keyResultsResult.length;
      const actionsCount = actionsResult.length;
      
      // Calculate completion rates
      const completedObjectives = objectivesResult.filter(obj => obj.status === 'completed').length;
      const onTrackObjectives = objectivesResult.filter(obj => obj.status === 'active').length;
      const delayedObjectives = objectivesResult.filter(obj => obj.status === 'delayed').length;
      
      // Calculate progress based on key results achievement
      let totalProgress = 0;
      let validKRCount = 0;
      
      for (const kr of keyResultsResult) {
        const currentValue = parseFloat(kr.currentValue || '0');
        const targetValue = parseFloat(kr.targetValue || '1');
        
        if (!isNaN(currentValue) && !isNaN(targetValue) && targetValue > 0) {
          const krProgress = Math.min((currentValue / targetValue) * 100, 100);
          totalProgress += krProgress;
          validKRCount++;
        }
      }
      
      const completionRate = validKRCount > 0 ? Math.round(totalProgress / validKRCount) : 0;
      
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
    const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
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

      let whereConditions: any[] = [];

      // Apply user access filters
      if (filters?.currentUserId) {
        const user = await this.getUser(filters.currentUserId);
        if (user && user.role !== 'admin') {
          // Non-admin users only see objectives from their accessible regions
          const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
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

  async getKeyResults(objectiveId?: number, filters?: any): Promise<any[]> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getKeyResults');
      
      console.log('🔍 getKeyResults called with:', { objectiveId, filters });
      
      // Step 1: Get filtered objectives first if we have region/subRegion filters
      let allowedObjectiveIds: number[] = [];
      
      if (filters?.regionId || filters?.subRegionId) {
        const objectiveFilters: any = {};
        if (filters.regionId) objectiveFilters.regionId = filters.regionId;
        if (filters.subRegionId) objectiveFilters.subRegionId = filters.subRegionId;
        if (filters.currentUserId) objectiveFilters.currentUserId = filters.currentUserId;
        
        const filteredObjectives = await this.getObjectives(objectiveFilters);
        allowedObjectiveIds = filteredObjectives.map(obj => obj.id);
        
        console.log('🔍 Filtered objectives by region/subRegion:', allowedObjectiveIds);
        
        if (allowedObjectiveIds.length === 0) {
          console.log('🔍 No objectives match region/subRegion filters, returning empty array');
          return [];
        }
      }
      
      // Step 2: Build key results query
      let query = db.select().from(keyResults);
      let whereConditions: any[] = [];

      // Apply objective ID filter (legacy parameter)
      if (objectiveId) {
        whereConditions.push(eq(keyResults.objectiveId, objectiveId));
      }

      // Apply filters from filter object
      if (filters?.objectiveId) {
        whereConditions.push(eq(keyResults.objectiveId, filters.objectiveId));
      }

      // Apply regional filtering through allowed objectives
      if (allowedObjectiveIds.length > 0) {
        whereConditions.push(inArray(keyResults.objectiveId, allowedObjectiveIds));
      }

      // Apply service line filters
      if (filters?.serviceLineId) {
        whereConditions.push(eq(keyResults.serviceLineId, filters.serviceLineId));
        console.log('🔍 Applied serviceLineId filter:', filters.serviceLineId);
        console.log('🔍 WHERE conditions length after serviceLineId:', whereConditions.length);
      }

      // Apply user access filters (if not already handled by regional filtering)
      if (filters?.currentUserId && allowedObjectiveIds.length === 0) {
        const user = await this.getUser(filters.currentUserId);
        if (user && user.role !== 'admin') {
          // Get user's accessible objectives first
          const userObjectives = await this.getObjectives({ currentUserId: filters.currentUserId });
          const objectiveIds = userObjectives.map(obj => obj.id);
          if (objectiveIds.length > 0) {
            whereConditions.push(inArray(keyResults.objectiveId, objectiveIds));
          } else {
            console.log('🔍 No accessible objectives for user, returning empty array');
            return [];
          }
        }
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await query.orderBy(desc(keyResults.createdAt));
      });

      MySQLPerformanceMonitor.endQuery('getKeyResults', startTime);
      console.log(`🔍 Key results found: ${result.length}`);
      
      // Debug: log first few results with serviceLineId
      if (result.length > 0) {
        console.log('🔍 Sample key results serviceLineId values:', 
          result.slice(0, 3).map(kr => ({ 
            id: kr.id, 
            title: kr.title?.substring(0, 30), 
            serviceLineId: kr.serviceLineId 
          }))
        );
      }
      
      // Calculate and sync progress for each key result
      const keyResultsWithProgress = result.map(kr => {
        // Calculate progress based on current and target values
        let calculatedProgress = 0;
        if (kr.currentValue && kr.targetValue) {
          const current = parseFloat(kr.currentValue.toString());
          const target = parseFloat(kr.targetValue.toString());
          if (target > 0) {
            calculatedProgress = Math.round((current / target) * 100 * 100) / 100; // Round to 2 decimal places
          }
        }
        
        // Always use calculated progress if we have current and target values
        const finalProgress = (kr.currentValue && kr.targetValue && calculatedProgress > 0) 
          ? calculatedProgress 
          : (kr.progress !== null && kr.progress !== undefined) 
            ? parseFloat(kr.progress.toString()) 
            : 0;
          
        // Debug logging for OKOKSPASKAAKSAPSKP
        if (kr.title === 'OKOKSPASKAAKSAPSKP') {
          console.log('🔍 Progress sync for OKOKSPASKAAKSAPSKP:', {
            dbProgress: kr.progress,
            dbProgressType: typeof kr.progress,
            currentValue: kr.currentValue,
            targetValue: kr.targetValue,
            calculatedProgress,
            finalProgress,
            currentParsed: parseFloat(kr.currentValue?.toString() || '0'),
            targetParsed: parseFloat(kr.targetValue?.toString() || '0')
          });
        }
        
        return {
          ...kr,
          progress: finalProgress
        };
      });
      
      return keyResultsWithProgress;
    } catch (error) {
      console.error('Error fetching key results:', error);
      throw error;
    }
  }

  async getKeyResult(id: number, currentUserId?: number): Promise<any | undefined> {
    try {
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
    } catch (error) {
      console.error('Error in getKeyResult:', error);
      return undefined;
    }
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    const result = await db.insert(keyResults).values(keyResult);
    const insertId = result[0]?.insertId;
    const newKeyResult = await db.select().from(keyResults).where(eq(keyResults.id, Number(insertId))).limit(1);
    return newKeyResult[0];
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    console.log('🔧 Updating Key Result:', { id, keyResult });
    console.log('🔧 Service fields received:', {
      serviceLineId: keyResult.serviceLineId,
      serviceId: keyResult.serviceId,
      serviceLineIds: keyResult.serviceLineIds
    });
    
    await db.update(keyResults).set(keyResult).where(eq(keyResults.id, id));
    const updated = await db.select().from(keyResults).where(eq(keyResults.id, id)).limit(1);
    
    console.log('🔧 Updated Key Result from DB:', {
      id: updated[0].id,
      serviceLineId: updated[0].serviceLineId,
      serviceId: updated[0].serviceId,
      serviceLineIds: updated[0].serviceLineIds
    });
    
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

      let whereConditions: any[] = [];

      // Apply user access filters
      if (filters?.currentUserId) {
        const user = await this.getUser(filters.currentUserId);
        if (user && user.role !== 'admin') {
          // Get user's accessible objectives first
          const userObjectives = await this.getObjectives({ currentUserId: filters.currentUserId });
          const objectiveIds = userObjectives.map(obj => obj.id);
          if (objectiveIds.length > 0) {
            console.log(`Found ${objectiveIds.length} objectives for user ${user.id}`);
            whereConditions.push(inArray(objectives.id, objectiveIds));
          } else {
            console.log('No accessible objectives found, returning empty actions');
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
        return await query.orderBy(desc(actions.createdAt));
      });

      MySQLPerformanceMonitor.endQuery('getActions', startTime);
      
      // Map results to include key result information
      return result.map(action => ({
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
        serviceLine: action.serviceLineName ? {
          id: action.serviceLineId,
          name: action.serviceLineName
        } : undefined,
        service: action.serviceName ? {
          id: action.serviceId,
          name: action.serviceName
        } : undefined,
        responsible: action.responsibleName ? {
          id: action.responsibleId,
          name: action.responsibleName,
          username: action.responsibleUsername
        } : undefined
      }));
    } catch (error) {
      console.error('Error fetching actions:', error);
      throw error;
    }
  }

  async getAction(id: number, currentUserId?: number): Promise<any | undefined> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getAction');
      
      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select({
          action: actions,
          keyResult: keyResults,
          objective: objectives,
        })
        .from(actions)
        .leftJoin(keyResults, eq(actions.keyResultId, keyResults.id))
        .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id))
        .where(eq(actions.id, id))
        .limit(1);
      });

      MySQLPerformanceMonitor.endQuery('getAction', startTime);
      
      if (result.length === 0) return undefined;

      const row = result[0];
      
      // Apply user access control if currentUserId is provided
      if (currentUserId && currentUserId !== undefined) {
        const user = await this.getUser(currentUserId);
        if (user && user.role !== 'admin') {
          // Check if user has access to the objective containing this action
          const userObjectives = await this.getObjectives({ currentUserId });
          const hasAccess = userObjectives.some(obj => obj.id === row.objective?.id);
          if (!hasAccess) {
            return undefined; // User doesn't have access to this action
          }
        }
      }

      return {
        ...row.action,
        keyResult: row.keyResult,
        objective: row.objective,
      };
    } catch (error) {
      console.error('Error fetching action:', error);
      return undefined;
    }
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
    try {
      console.log('getCheckpoints called with:', { keyResultId, currentUserId });

      let query = db.select({
        checkpoints: checkpoints,
        keyResults: keyResults,
        objectives: objectives,
      })
      .from(checkpoints)
      .leftJoin(keyResults, eq(checkpoints.keyResultId, keyResults.id))
      .leftJoin(objectives, eq(keyResults.objectiveId, objectives.id));

      // Apply filters
      const conditions = [];
      if (keyResultId) {
        console.log('Filtering by keyResultId:', keyResultId);
        conditions.push(eq(checkpoints.keyResultId, keyResultId));
      }

      // Apply user access control - use same logic as key results
      if (currentUserId && currentUserId !== undefined) {
        const user = await this.getUser(currentUserId);
        console.log('User for access control:', user?.username, user?.role);
        if (user && user.role !== 'admin') {
          console.log('Non-admin user, checking accessible objectives');
          // Get user's accessible objectives first (same logic as getKeyResults)
          const userObjectives = await this.getObjectives({ currentUserId });
          const objectiveIds = userObjectives.map(obj => obj.id);
          if (objectiveIds.length > 0) {
            conditions.push(inArray(objectives.id, objectiveIds));
          } else {
            console.log('No accessible objectives found, returning empty result');
            return [];
          }
        } else {
          console.log('Admin user, no ownership filtering');
        }
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      console.log('Executing checkpoints query with conditions length:', conditions.length);

      const results = await query.orderBy(asc(checkpoints.dueDate));

      console.log('Found', results.length, 'checkpoint results');

      return results.map(row => ({
        ...row.checkpoints,
        keyResult: row.keyResults,
        objective: row.objectives,
      }));
    } catch (error) {
      console.error('Error in getCheckpoints:', error);
      return [];
    }
  }

  async updateCheckpoint(id: number, data: any): Promise<Checkpoint> {
    await db.update(checkpoints).set(data).where(eq(checkpoints.id, id));
    const updated = await db.select().from(checkpoints).where(eq(checkpoints.id, id)).limit(1);
    return updated[0];
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    if (!keyResultId || isNaN(keyResultId)) {
      throw new Error(`Invalid keyResultId: ${keyResultId}`);
    }
    
    try {
      // Get the key result details
      const keyResult = await this.getKeyResult(keyResultId);
      if (!keyResult) throw new Error('Key result not found');
      
      console.log('Generating checkpoints for key result:', keyResult.id, keyResult.title);
      console.log('Key result dates:', keyResult.startDate, 'to', keyResult.endDate, 'frequency:', keyResult.frequency);

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
        
        // Debug logging para identificar o problema
        console.log(`🔍 Checkpoint ${i + 1} calculation:`);
        console.log(`  - Total target: ${totalTarget}`);
        console.log(`  - Total periods: ${totalPeriods}`);
        console.log(`  - Is last checkpoint: ${isLastCheckpoint}`);
        console.log(`  - Calculated target value: ${targetValue}`);
        console.log(`  - Target value toString: "${targetValue.toString()}"`);
        console.log(`  - Target value toFixed(2): "${targetValue.toFixed(2)}"`);
        
        // Format dates in Brazilian style (DD/MM)
        const formatBrazilianDate = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          return `${day}/${month}`;
        };
        
        // Calculate period start date (previous checkpoint end date + 1 day, or start date for first checkpoint)
        let periodStart: Date;
        if (i === 0) {
          periodStart = new Date(startDate);
        } else {
          const previousPeriod = periods[i - 1];
          periodStart = new Date(previousPeriod.dueDate);
          periodStart.setDate(periodStart.getDate() + 1);
        }
        
        const currentDateFormatted = formatBrazilianDate(period.dueDate);
        const previousDateFormatted = formatBrazilianDate(periodStart);
        
        // Create title and period in the requested format: "12/05 1/10 (12/04 a 12/05)"
        const title = `${currentDateFormatted} ${period.number}/${totalPeriods}`;
        const periodText = `(${previousDateFormatted} a ${currentDateFormatted})`;
        
        // Converter para 2 casas decimais para evitar problemas de precisão 
        const formattedTargetValue = targetValue.toFixed(2);
        
        console.log(`📋 Creating checkpoint with title: "${title}"`);
        console.log(`📋 Final targetValue: "${formattedTargetValue}"`);
        
        checkpointsToCreate.push({
          keyResultId,
          title: title,
          period: periodText,
          targetValue: formattedTargetValue,
          actualValue: "0",
          status: "pending" as const,
          dueDate: new Date(period.dueDate),
        });
      }

      // Insert all checkpoints
      const createdCheckpoints: Checkpoint[] = [];
      for (const checkpoint of checkpointsToCreate) {
        const result = await db.insert(checkpoints).values({
          keyResultId: checkpoint.keyResultId,
          title: checkpoint.title,
          period: checkpoint.period,
          targetValue: checkpoint.targetValue,
          actualValue: checkpoint.actualValue,
          status: checkpoint.status,
          dueDate: checkpoint.dueDate,
        });
        
        const insertId = result[0]?.insertId;
        if (insertId) {
          const newCheckpoint = await db.select().from(checkpoints).where(eq(checkpoints.id, Number(insertId))).limit(1);
          if (newCheckpoint[0]) {
            createdCheckpoints.push(newCheckpoint[0]);
          }
        }
      }

      return createdCheckpoints;
    } catch (error) {
      console.error('Error in generateCheckpoints for keyResultId', keyResultId, ':', error);
      throw new Error(`Failed to generate checkpoints: ${(error as Error).message}`);
    }
  }

  async getCheckpoint(id: number, currentUserId?: number): Promise<any | undefined> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('getCheckpoint');
      
      const checkpointRows = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select().from(checkpoints).where(eq(checkpoints.id, id)).limit(1);
      });
      
      MySQLPerformanceMonitor.endQuery('getCheckpoint', startTime);
      
      if (checkpointRows.length === 0) {
        return undefined;
      }
      
      return checkpointRows[0];
    } catch (error) {
      console.error(`Error fetching checkpoint ${id}:`, error);
      throw error;
    }
  }

  async deleteCheckpoint(id: number): Promise<void> {
    try {
      const startTime = MySQLPerformanceMonitor.startQuery('deleteCheckpoint');
      
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.delete(checkpoints).where(eq(checkpoints.id, id));
      });
      
      MySQLPerformanceMonitor.endQuery('deleteCheckpoint', startTime);
    } catch (error) {
      console.error(`Error deleting checkpoint ${id}:`, error);
      throw error;
    }
  }

  async getActionComments(actionId: number): Promise<(ActionComment & { user: User })[]> {
    const startTime = MySQLPerformanceMonitor.startQuery('getActionComments');
    try {
      console.log(`🔍 Getting comments for action ${actionId}`);
      
      const results = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.select()
          .from(actionComments)
          .leftJoin(users, eq(actionComments.userId, users.id))
          .where(eq(actionComments.actionId, actionId))
          .orderBy(desc(actionComments.createdAt));
      });
      
      console.log(`🔍 Found ${results.length} comments for action ${actionId}:`, results);
      
      MySQLPerformanceMonitor.endQuery(startTime, 'getActionComments');
      
      const mappedResults = results.map(row => ({
        id: row.action_comments.id,
        actionId: row.action_comments.actionId,
        userId: row.action_comments.userId,
        comment: row.action_comments.comment,
        createdAt: row.action_comments.createdAt,
        user: row.users!,
      }));
      
      console.log(`🔍 Mapped results:`, mappedResults);
      return mappedResults;
    } catch (error) {
      console.error(`❌ Error getting comments for action ${actionId}:`, error);
      MySQLPerformanceMonitor.endQuery(startTime, 'getActionComments');
      throw error;
    }
  }

  async createActionComment(comment: InsertActionComment): Promise<ActionComment> {
    console.log(`💬 Creating comment for action ${comment.actionId}:`, comment);
    
    const commentWithTimestamp = {
      ...comment,
      createdAt: new Date(),
    };
    
    const result = await db.insert(actionComments).values(commentWithTimestamp);
    const insertId = result[0]?.insertId;
    
    console.log(`💬 Comment created with ID: ${insertId}`);
    
    const newComment = await db.select().from(actionComments).where(eq(actionComments.id, Number(insertId))).limit(1);
    
    console.log(`💬 Retrieved new comment:`, newComment[0]);
    
    return newComment[0];
  }

  // Admin CRUD methods implementations
  async createStrategicIndicator(data: { name: string; description?: string; unit?: string }): Promise<StrategicIndicator> {
    const startTime = MySQLPerformanceMonitor.startQuery('createStrategicIndicator');
    try {
      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.insert(strategicIndicators).values(data);
      });
      
      const insertId = result[0]?.insertId;
      const newIndicator = await db.select().from(strategicIndicators)
        .where(eq(strategicIndicators.id, Number(insertId))).limit(1);
      
      MySQLPerformanceMonitor.endQuery('createStrategicIndicator', startTime);
      return newIndicator[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('createStrategicIndicator', startTime);
      console.error('Error creating strategic indicator:', error);
      throw error;
    }
  }

  async updateStrategicIndicator(id: number, data: { name: string; description?: string; unit?: string }): Promise<StrategicIndicator> {
    const startTime = MySQLPerformanceMonitor.startQuery('updateStrategicIndicator');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.update(strategicIndicators).set(data).where(eq(strategicIndicators.id, id));
      });
      
      const updatedIndicator = await db.select().from(strategicIndicators)
        .where(eq(strategicIndicators.id, id)).limit(1);
      
      MySQLPerformanceMonitor.endQuery('updateStrategicIndicator', startTime);
      return updatedIndicator[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('updateStrategicIndicator', startTime);
      console.error('Error updating strategic indicator:', error);
      throw error;
    }
  }

  async deleteStrategicIndicator(id: number): Promise<void> {
    const startTime = MySQLPerformanceMonitor.startQuery('deleteStrategicIndicator');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.delete(strategicIndicators).where(eq(strategicIndicators.id, id));
      });
      
      MySQLPerformanceMonitor.endQuery('deleteStrategicIndicator', startTime);
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('deleteStrategicIndicator', startTime);
      console.error('Error deleting strategic indicator:', error);
      throw error;
    }
  }

  async createRegion(data: { name: string; code: string }): Promise<Region> {
    const startTime = MySQLPerformanceMonitor.startQuery('createRegion');
    try {
      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.insert(regionsTable).values(data);
      });
      
      const insertId = result[0]?.insertId;
      const newRegion = await db.select().from(regionsTable)
        .where(eq(regionsTable.id, Number(insertId))).limit(1);
      
      MySQLPerformanceMonitor.endQuery('createRegion', startTime);
      return newRegion[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('createRegion', startTime);
      console.error('Error creating region:', error);
      throw error;
    }
  }

  async updateRegion(id: number, data: { name: string; code: string }): Promise<Region> {
    const startTime = MySQLPerformanceMonitor.startQuery('updateRegion');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.update(regionsTable).set(data).where(eq(regionsTable.id, id));
      });
      
      const updatedRegion = await db.select().from(regionsTable)
        .where(eq(regionsTable.id, id)).limit(1);
      
      MySQLPerformanceMonitor.endQuery('updateRegion', startTime);
      return updatedRegion[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('updateRegion', startTime);
      console.error('Error updating region:', error);
      throw error;
    }
  }

  async deleteRegion(id: number): Promise<void> {
    const startTime = MySQLPerformanceMonitor.startQuery('deleteRegion');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.delete(regionsTable).where(eq(regionsTable.id, id));
      });
      
      MySQLPerformanceMonitor.endQuery('deleteRegion', startTime);
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('deleteRegion', startTime);
      console.error('Error deleting region:', error);
      throw error;
    }
  }

  async createSubRegion(data: { name: string; code: string; regionId: number }): Promise<SubRegion> {
    const startTime = MySQLPerformanceMonitor.startQuery('createSubRegion');
    try {
      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.insert(subRegions).values(data);
      });
      
      const insertId = result[0]?.insertId;
      const newSubRegion = await db.select().from(subRegions)
        .where(eq(subRegions.id, Number(insertId))).limit(1);
      
      MySQLPerformanceMonitor.endQuery('createSubRegion', startTime);
      return newSubRegion[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('createSubRegion', startTime);
      console.error('Error creating sub-region:', error);
      throw error;
    }
  }

  async updateSubRegion(id: number, data: { name: string; code: string; regionId: number }): Promise<SubRegion> {
    const startTime = MySQLPerformanceMonitor.startQuery('updateSubRegion');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.update(subRegions).set(data).where(eq(subRegions.id, id));
      });
      
      const updatedSubRegion = await db.select().from(subRegions)
        .where(eq(subRegions.id, id)).limit(1);
      
      MySQLPerformanceMonitor.endQuery('updateSubRegion', startTime);
      return updatedSubRegion[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('updateSubRegion', startTime);
      console.error('Error updating sub-region:', error);
      throw error;
    }
  }

  async deleteSubRegion(id: number): Promise<void> {
    const startTime = MySQLPerformanceMonitor.startQuery('deleteSubRegion');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.delete(subRegions).where(eq(subRegions.id, id));
      });
      
      MySQLPerformanceMonitor.endQuery('deleteSubRegion', startTime);
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('deleteSubRegion', startTime);
      console.error('Error deleting sub-region:', error);
      throw error;
    }
  }

  async createSolution(data: { name: string; description?: string }): Promise<Solution> {
    const startTime = MySQLPerformanceMonitor.startQuery('createSolution');
    try {
      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.insert(solutionsTable).values(data);
      });
      
      const insertId = result[0]?.insertId;
      const newSolution = await db.select().from(solutionsTable)
        .where(eq(solutionsTable.id, Number(insertId))).limit(1);
      
      MySQLPerformanceMonitor.endQuery('createSolution', startTime);
      return newSolution[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('createSolution', startTime);
      console.error('Error creating solution:', error);
      throw error;
    }
  }

  async updateSolution(id: number, data: { name: string; description?: string }): Promise<Solution> {
    const startTime = MySQLPerformanceMonitor.startQuery('updateSolution');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.update(solutionsTable).set(data).where(eq(solutionsTable.id, id));
      });
      
      const updatedSolution = await db.select().from(solutionsTable)
        .where(eq(solutionsTable.id, id)).limit(1);
      
      MySQLPerformanceMonitor.endQuery('updateSolution', startTime);
      return updatedSolution[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('updateSolution', startTime);
      console.error('Error updating solution:', error);
      throw error;
    }
  }

  async deleteSolution(id: number): Promise<void> {
    const startTime = MySQLPerformanceMonitor.startQuery('deleteSolution');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.delete(solutionsTable).where(eq(solutionsTable.id, id));
      });
      
      MySQLPerformanceMonitor.endQuery('deleteSolution', startTime);
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('deleteSolution', startTime);
      console.error('Error deleting solution:', error);
      throw error;
    }
  }

  async createServiceLine(data: { name: string; description?: string; solutionId: number }): Promise<ServiceLine> {
    const startTime = MySQLPerformanceMonitor.startQuery('createServiceLine');
    try {
      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.insert(serviceLines).values(data);
      });
      
      const insertId = result[0]?.insertId;
      const newServiceLine = await db.select().from(serviceLines)
        .where(eq(serviceLines.id, Number(insertId))).limit(1);
      
      MySQLPerformanceMonitor.endQuery('createServiceLine', startTime);
      return newServiceLine[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('createServiceLine', startTime);
      console.error('Error creating service line:', error);
      throw error;
    }
  }

  async updateServiceLine(id: number, data: { name: string; description?: string; solutionId: number }): Promise<ServiceLine> {
    const startTime = MySQLPerformanceMonitor.startQuery('updateServiceLine');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.update(serviceLines).set(data).where(eq(serviceLines.id, id));
      });
      
      const updatedServiceLine = await db.select().from(serviceLines)
        .where(eq(serviceLines.id, id)).limit(1);
      
      MySQLPerformanceMonitor.endQuery('updateServiceLine', startTime);
      return updatedServiceLine[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('updateServiceLine', startTime);
      console.error('Error updating service line:', error);
      throw error;
    }
  }

  async deleteServiceLine(id: number): Promise<void> {
    const startTime = MySQLPerformanceMonitor.startQuery('deleteServiceLine');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.delete(serviceLines).where(eq(serviceLines.id, id));
      });
      
      MySQLPerformanceMonitor.endQuery('deleteServiceLine', startTime);
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('deleteServiceLine', startTime);
      console.error('Error deleting service line:', error);
      throw error;
    }
  }

  async createService(data: { name: string; description?: string; serviceLineId: number }): Promise<Service> {
    const startTime = MySQLPerformanceMonitor.startQuery('createService');
    try {
      const result = await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.insert(services).values(data);
      });
      
      const insertId = result[0]?.insertId;
      const newService = await db.select().from(services)
        .where(eq(services.id, Number(insertId))).limit(1);
      
      MySQLPerformanceMonitor.endQuery('createService', startTime);
      return newService[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('createService', startTime);
      console.error('Error creating service:', error);
      throw error;
    }
  }

  async updateService(id: number, data: { name: string; description?: string; serviceLineId: number }): Promise<Service> {
    const startTime = MySQLPerformanceMonitor.startQuery('updateService');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.update(services).set(data).where(eq(services.id, id));
      });
      
      const updatedService = await db.select().from(services)
        .where(eq(services.id, id)).limit(1);
      
      MySQLPerformanceMonitor.endQuery('updateService', startTime);
      return updatedService[0];
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('updateService', startTime);
      console.error('Error updating service:', error);
      throw error;
    }
  }

  async deleteService(id: number): Promise<void> {
    const startTime = MySQLPerformanceMonitor.startQuery('deleteService');
    try {
      await MySQLConnectionOptimizer.executeWithLimit(async () => {
        return await db.delete(services).where(eq(services.id, id));
      });
      
      MySQLPerformanceMonitor.endQuery('deleteService', startTime);
    } catch (error) {
      MySQLPerformanceMonitor.endQuery('deleteService', startTime);
      console.error('Error deleting service:', error);
      throw error;
    }
  }
}

// Export optimized storage instance
export const storage = new MySQLStorageOptimized();
export const MySQLStorage = MySQLStorageOptimized;