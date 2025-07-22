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
  getManagers(): Promise<User[]>; // Get only managers (gestores)
  getPendingUsers(): Promise<User[]>; // Get users pending approval
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

  // Objectives (com controle de acesso regional)
  getObjectives(filters?: {
    regionId?: number;
    subRegionId?: number;
    serviceLineId?: number;
    ownerId?: number;
    currentUserId?: number; // Para controle de acesso
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

  // Key Results (com controle de acesso regional)
  getKeyResults(objectiveId?: number, currentUserId?: number): Promise<(KeyResult & { 
    objective: Objective; 
    strategicIndicator?: StrategicIndicator 
  })[]>;
  getKeyResult(id: number, currentUserId?: number): Promise<KeyResult | undefined>;
  createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult>;
  updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult>;
  deleteKeyResult(id: number): Promise<void>;

  // Actions (com controle de acesso regional)
  getActions(keyResultId?: number, currentUserId?: number): Promise<(Action & { 
    keyResult: KeyResult; 
    strategicIndicator?: StrategicIndicator;
    responsible?: User 
  })[]>;
  getAction(id: number, currentUserId?: number): Promise<Action | undefined>;
  createAction(action: InsertAction): Promise<Action>;
  updateAction(id: number, action: Partial<InsertAction>): Promise<Action>;
  deleteAction(id: number): Promise<void>;

  // Checkpoints (com controle de acesso regional)
  getCheckpoints(keyResultId?: number, currentUserId?: number): Promise<Checkpoint[]>;
  getCheckpoint(id: number, currentUserId?: number): Promise<Checkpoint | undefined>;
  createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint>;
  updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint>;
  generateCheckpoints(keyResultId: number): Promise<Checkpoint[]>;

  // Action Comments (progress tracking)
  getActionComments(actionId: number): Promise<(ActionComment & { user: User })[]>;
  createActionComment(comment: InsertActionComment): Promise<ActionComment>;

  // Método auxiliar para verificar acesso a múltiplas regiões
  checkUserAccess(currentUserId: number, targetRegionId?: number, targetSubRegionId?: number): Promise<boolean>;

  // Analytics and utilities

  // Analytics
  getDashboardKPIs(filters?: {
    regionId?: number;
    subRegionId?: number;
    userRegionIds?: number[];
    userSubRegionIds?: number[];
    period?: string;
    quarter?: string; // e.g., "2025-Q1"
  }): Promise<{
    totalObjectives: number;
    totalKeyResults: number;
    averageProgress: number;
    totalActions: number;
    completedActions: number;
    overallProgress: number;
  }>;

  // Quarterly period methods
  getQuarterlyData(quarter: string, filters?: {
    regionId?: number;
    subRegionId?: number;
    userRegionIds?: number[];
    userSubRegionIds?: number[];
  }): Promise<{
    objectives: Objective[];
    keyResults: KeyResult[];
    actions: Action[];
    checkpoints: Checkpoint[];
  }>;
  
  getAvailableQuarters(): Promise<string[]>;
  getQuarterlyStats(): Promise<{
    [quarter: string]: {
      objectives: number;
      keyResults: number;
      actions: number;
      checkpoints: number;
    };
  }>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // Using MemoryStore since we're using SQLite (simulating MySQL)
    const MemoryStoreConstructor = MemoryStore(session);
    this.sessionStore = new MemoryStoreConstructor({
      checkPeriod: 86400000 // prune expired entries every 24h
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

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }

  async getManagers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'gestor')).orderBy(users.name);
  }

  async getPendingUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.approved, false)).orderBy(users.createdAt);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async approveUser(id: number, approvedBy: number, subRegionId?: number): Promise<User> {
    // Get the approver (gestor) data to inherit permissions
    const approver = await this.getUser(approvedBy);
    if (!approver) {
      throw new Error("Gestor não encontrado");
    }

    // Get target user to inherit from their linked gestor
    const targetUser = await this.getUser(id);
    if (!targetUser) {
      throw new Error("Usuário não encontrado");
    }

    // Get the linked gestor for inheritance
    const linkedGestor = targetUser.gestorId ? await this.getUser(targetUser.gestorId) : approver;
    if (!linkedGestor) {
      throw new Error("Gestor vinculado não encontrado");
    }

    const updateData: any = {
      approved: true, 
      approvedAt: sql`CURRENT_TIMESTAMP`,
      approvedBy: approvedBy,
      regionIds: linkedGestor.regionIds || [], // User inherits linked gestor's regions
      subRegionIds: linkedGestor.subRegionIds || [], // User inherits linked gestor's sub-regions
      solutionIds: linkedGestor.solutionIds || [], // User inherits linked gestor's solutions
      serviceLineIds: linkedGestor.serviceLineIds || [], // User inherits linked gestor's service lines
      serviceIds: linkedGestor.serviceIds || [], // User inherits linked gestor's services
    };

    // If sub-region is provided, add it to the user's sub-regions
    if (subRegionId !== undefined) {
      const subRegions = [...(updateData.subRegionIds || [])];
      if (!subRegions.includes(subRegionId)) {
        subRegions.push(subRegionId);
      }
      updateData.subRegionIds = subRegions;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async approveUserWithPermissions(id: number, approvedBy: number, permissions: {
    regionIds: number[];
    subRegionIds: number[];
    solutionIds: number[];
    serviceLineIds: number[];
    serviceIds: number[];
  }): Promise<User> {
    const updateData: any = {
      approved: true, 
      approvedAt: sql`CURRENT_TIMESTAMP`,
      approvedBy: approvedBy,
      regionIds: permissions.regionIds || [],
      subRegionIds: permissions.subRegionIds || [],
      solutionIds: permissions.solutionIds || [],
      serviceLineIds: permissions.serviceLineIds || [],
      serviceIds: permissions.serviceIds || [],
    };

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }



  async getUserById(id: number): Promise<User | undefined> {
    return await this.getUser(id);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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
      .orderBy(asc(strategicIndicators.name));
  }

  // Método auxiliar para verificar acesso do usuário
  async checkUserAccess(currentUserId: number, targetRegionId?: number, targetSubRegionId?: number): Promise<boolean> {
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return false;
    
    // Admins têm acesso a tudo
    if (currentUser.role === 'admin') return true;
    
    // Se não há restrições de região/subregião, permite acesso
    if (!targetRegionId && !targetSubRegionId) return true;
    
    // Usuário tem arrays de regiões e subregiões
    const userRegionIds = currentUser.regionIds || [];
    const userSubRegionIds = currentUser.subRegionIds || [];
    
    // Se usuário não tem regiões configuradas, permitir acesso (para compatibilidade)
    if (userRegionIds.length === 0 && userSubRegionIds.length === 0) return true;
    
    // Verifica acesso por região - usuário deve ter acesso à região especificada
    if (targetRegionId && !userRegionIds.includes(targetRegionId)) return false;
    
    // Verifica acesso por subregião - usuário deve ter acesso à subregião especificada
    if (targetSubRegionId && !userSubRegionIds.includes(targetSubRegionId)) return false;
    
    return true;
  }

  async getObjectives(filters?: {
    regionId?: number;
    subRegionId?: number;
    ownerId?: number;
    currentUserId?: number;
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
      
      // Aplicar controle de acesso baseado no usuário atual
      if (filters.currentUserId) {
        const currentUser = await this.getUser(filters.currentUserId);
        if (currentUser && currentUser.role !== 'admin') {
          // Usuários não-admin só veem objetivos da sua região/subregião
          const userRegionIds = currentUser.regionIds || [];
          const userSubRegionIds = currentUser.subRegionIds || [];
          
          if (userRegionIds.length > 0) {
            // Se usuário tem regiões específicas, aplicar filtro
            conditions.push(inArray(objectives.regionId, userRegionIds));
          }
          if (userSubRegionIds.length > 0) {
            // Se usuário tem sub-regiões específicas, aplicar filtro
            conditions.push(inArray(objectives.subRegionId, userSubRegionIds));
          }
        }
      }
      
      // Aplicar outros filtros
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

  async getObjective(id: number, currentUserId?: number): Promise<Objective | undefined> {
    const [objective] = await db.select().from(objectives).where(eq(objectives.id, id));
    if (!objective) return undefined;
    
    // Verificar acesso se currentUserId foi fornecido
    if (currentUserId) {
      const hasAccess = await this.checkUserAccess(currentUserId, objective.regionId || undefined, objective.subRegionId || undefined);
      if (!hasAccess) return undefined;
    }
    
    return objective;
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    const [created] = await db
      .insert(objectives)
      .values({
        ...objective,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .returning();
    return created;
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    const [updated] = await db
      .update(objectives)
      .set({
        ...objective,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(objectives.id, id))
      .returning();
    return updated;
  }

  async deleteObjective(id: number): Promise<void> {
    await db.delete(objectives).where(eq(objectives.id, id));
  }

  async getKeyResults(objectiveId?: number, currentUserId?: number): Promise<(KeyResult & { objective: Objective; strategicIndicator?: StrategicIndicator })[]> {
    // Get key results with objectives
    let baseQuery = db
      .select({
        id: keyResults.id,
        objectiveId: keyResults.objectiveId,
        title: keyResults.title,
        description: keyResults.description,
        strategicIndicatorIds: keyResults.strategicIndicatorIds,
        serviceLineIds: keyResults.serviceLineIds,
        serviceId: keyResults.serviceId,
        targetValue: keyResults.targetValue,
        currentValue: keyResults.currentValue,
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

    // Filtrar baseado no controle de acesso regional
    let filteredResults = keyResultsData;
    if (currentUserId) {
      const currentUser = await this.getUser(currentUserId);
      if (currentUser && currentUser.role !== 'admin') {
        const userRegionIds = currentUser.regionIds || [];
        const userSubRegionIds = currentUser.subRegionIds || [];
        
        filteredResults = keyResultsData.filter(row => {
          const objective = row.objective;
          
          // Se usuário tem regiões específicas, verificar acesso
          if (userRegionIds.length > 0 && objective.regionId) {
            if (!userRegionIds.includes(objective.regionId)) {
              return false;
            }
          }
          
          // Se usuário tem sub-regiões específicas, verificar acesso
          if (userSubRegionIds.length > 0 && objective.subRegionId) {
            if (!userSubRegionIds.includes(objective.subRegionId)) {
              return false;
            }
          }
          
          return true;
        });
      }
    }

    // Map results with strategic indicators
    return filteredResults.map(row => {
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

  async getKeyResult(id: number, currentUserId?: number): Promise<KeyResult | undefined> {
    const [keyResult] = await db.select().from(keyResults).where(eq(keyResults.id, id));
    if (!keyResult) return undefined;
    
    // Verificar acesso se currentUserId foi fornecido
    if (currentUserId) {
      const objective = await this.getObjective(keyResult.objectiveId, currentUserId);
      if (!objective) return undefined; // Sem acesso ao objetivo associado
    }
    
    return keyResult;
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    // Handle the conversion from strategicIndicatorId to strategicIndicatorIds array
    const { strategicIndicatorId, ...keyResultData } = keyResult as any;

    const dataToInsert = {
      ...keyResultData,
      strategicIndicatorIds: keyResultData.strategicIndicatorIds || (strategicIndicatorId ? [strategicIndicatorId] : []),
      updatedAt: sql`CURRENT_TIMESTAMP`,
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
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(keyResults.id, id))
      .returning();
    return updated;
  }

  async deleteKeyResult(id: number): Promise<void> {
    await db.delete(keyResults).where(eq(keyResults.id, id));
  }

  async getActions(keyResultId?: number, currentUserId?: number): Promise<(Action & { 
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

    // Aplicar controle de acesso regional baseado no key result associado
    let filteredResults = results;
    if (currentUserId) {
      const currentUser = await this.getUser(currentUserId);
      if (currentUser && currentUser.role !== 'admin') {
        // Buscar objetivos dos key results para verificar acesso
        const keyResultIds = [...new Set(results.map(r => r.keyResultId))];
        const objectives = await Promise.all(
          keyResultIds.map(id => 
            db.select().from(keyResults)
              .innerJoin(objectives, eq(keyResults.objectiveId, objectives.id))
              .where(eq(keyResults.id, id))
              .then(res => res[0]?.objectives)
          )
        );
        
        const userRegionIds = currentUser.regionIds || [];
        const userSubRegionIds = currentUser.subRegionIds || [];
        
        filteredResults = results.filter(result => {
          const objective = objectives.find(obj => obj && 
            keyResultIds.indexOf(result.keyResultId) === objectives.indexOf(obj)
          );
          if (!objective) return false;
          
          // Verificar acesso regional usando arrays multi-regionais
          if (userRegionIds.length > 0 && objective.regionId) {
            if (!userRegionIds.includes(objective.regionId)) {
              return false;
            }
          }
          
          if (userSubRegionIds.length > 0 && objective.subRegionId) {
            if (!userSubRegionIds.includes(objective.subRegionId)) {
              return false;
            }
          }
          
          return true;
        });
      }
    }

    return filteredResults.map(result => ({
      ...result,
      keyResult: result.keyResult as KeyResult,
      strategicIndicator: result.strategicIndicator as StrategicIndicator | undefined,
      responsible: result.responsible as User | undefined,
    }));
  }

  async getAction(id: number, currentUserId?: number): Promise<Action | undefined> {
    const [action] = await db.select().from(actions).where(eq(actions.id, id));
    if (!action) return undefined;
    
    // Verificar acesso se currentUserId foi fornecido
    if (currentUserId) {
      const keyResult = await this.getKeyResult(action.keyResultId, currentUserId);
      if (!keyResult) return undefined; // Sem acesso ao key result associado
    }
    
    return action;
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
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(actions.id, id))
      .returning();
    return updated;
  }

  async deleteAction(id: number): Promise<void> {
    await db.delete(actions).where(eq(actions.id, id));
  }

  async getCheckpoints(keyResultId?: number, currentUserId?: number): Promise<Checkpoint[]> {
    let query = db.select().from(checkpoints);

    if (keyResultId) {
      query = query.where(eq(checkpoints.keyResultId, keyResultId));
    }

    let results = await query.orderBy(asc(checkpoints.period));
    
    // Aplicar controle de acesso regional
    if (currentUserId) {
      const currentUser = await this.getUser(currentUserId);
      if (currentUser && currentUser.role !== 'admin') {
        // Verificar acesso aos key results associados
        const accessibleResults = [];
        for (const checkpoint of results) {
          const keyResult = await this.getKeyResult(checkpoint.keyResultId, currentUserId);
          if (keyResult) {
            accessibleResults.push(checkpoint);
          }
        }
        results = accessibleResults;
      }
    }

    console.log(`Retrieved ${results.length} checkpoints for keyResultId: ${keyResultId}`);
    return results;
  }

  async getCheckpoint(id: number, currentUserId?: number): Promise<Checkpoint | undefined> {
    const [checkpoint] = await db.select().from(checkpoints).where(eq(checkpoints.id, id));
    if (!checkpoint) return undefined;
    
    // Verificar acesso se currentUserId foi fornecido
    if (currentUserId) {
      const keyResult = await this.getKeyResult(checkpoint.keyResultId, currentUserId);
      if (!keyResult) return undefined; // Sem acesso ao key result associado
    }
    
    return checkpoint;
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    const [created] = await db
      .insert(checkpoints)
      .values({
        ...checkpoint,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .returning();
    return created;
  }

  async updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint> {
    const [updated] = await db
      .update(checkpoints)
      .set({
        ...checkpoint,
        updatedAt: sql`CURRENT_TIMESTAMP`,
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
      const initialValue = parseFloat(keyResult.currentValue || "0");
      
      // Parse dates from the key result object
      const startDate = new Date(keyResult.startDate);
      const endDate = new Date(keyResult.endDate);

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
        status: "pending" as const,
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
    const quarters: string[] = [];
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

  // Activity tracking disabled in SQLite version for simplicity

  async getDashboardKPIs(filters?: {
    regionId?: number;
    subRegionId?: number;
    userRegionIds?: number[];
    userSubRegionIds?: number[];
    period?: string;
    quarter?: string;
  }): Promise<{
    totalObjectives: number;
    totalKeyResults: number;
    averageProgress: number;
    totalActions: number;
    completedActions: number;
    overallProgress: number;
  }> {
    // If quarter filter is specified, use quarterly data
    if (filters?.quarter) {
      const quarterData = await this.getQuarterlyData(filters.quarter, {
        regionId: filters.regionId,
        subRegionId: filters.subRegionId,
        userRegionIds: filters.userRegionIds,
        userSubRegionIds: filters.userSubRegionIds
      });
      
      const totalActions = quarterData.actions.length;
      const completedActions = quarterData.actions.filter(a => a.status === 'completed').length;
      const totalObjectives = quarterData.objectives.length;
      const averageProgress = totalObjectives > 0 
        ? quarterData.objectives.reduce((sum, obj) => sum + (obj.progress || 0), 0) / totalObjectives 
        : 0;

      return {
        totalObjectives,
        totalKeyResults: quarterData.keyResults.length,
        averageProgress,
        totalActions,
        completedActions,
        overallProgress: averageProgress,
      };
    }

    // Build filter conditions for non-quarterly queries
    const objectiveConditions = [];
    
    // Single region/subregion filters (specific filter)
    if (filters?.regionId) objectiveConditions.push(eq(objectives.regionId, filters.regionId));
    if (filters?.subRegionId) objectiveConditions.push(eq(objectives.subRegionId, filters.subRegionId));
    
    // Multi-regional filters (user access restrictions)
    if (filters?.userRegionIds && filters.userRegionIds.length > 0) {
      objectiveConditions.push(inArray(objectives.regionId, filters.userRegionIds));
    }
    if (filters?.userSubRegionIds && filters.userSubRegionIds.length > 0) {
      objectiveConditions.push(inArray(objectives.subRegionId, filters.userSubRegionIds));
    }

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

  // Action Comments methods
  async getActionComments(actionId: number): Promise<(ActionComment & { user: User })[]> {
    try {
      const comments = await db
        .select()
        .from(actionComments)
        .innerJoin(users, eq(actionComments.userId, users.id))
        .where(eq(actionComments.actionId, actionId))
        .orderBy(desc(actionComments.createdAt));

      return comments.map(row => ({
        ...row.action_comments,
        user: row.users
      }));
    } catch (error) {
      console.error('Error fetching action comments:', error);
      throw error;
    }
  }

  async createActionComment(comment: InsertActionComment): Promise<ActionComment> {
    try {
      const [newComment] = await db.insert(actionComments).values(comment).returning();
      return newComment;
    } catch (error) {
      console.error('Error creating action comment:', error);
      throw error;
    }
  }

  // Quarterly period methods
  async getQuarterlyData(quarter: string, filters?: {
    regionId?: number;
    subRegionId?: number;
    userRegionIds?: number[];
    userSubRegionIds?: number[];
  }): Promise<{
    objectives: Objective[];
    keyResults: KeyResult[];
    actions: Action[];
    checkpoints: Checkpoint[];
  }> {
    try {
      // Get all objectives first
      let quarterObjectives = await db.select().from(objectives);
      
      // Handle "all" periods case - return all data without date filtering
      if (quarter === "all") {
        // Apply only regional filters, no date filtering
        if (filters?.regionId) {
          quarterObjectives = quarterObjectives.filter(obj => obj.regionId === filters.regionId);
        }
        if (filters?.subRegionId) {
          quarterObjectives = quarterObjectives.filter(obj => obj.subRegionId === filters.subRegionId);
        }
        if (filters?.userRegionIds && filters.userRegionIds.length > 0) {
          quarterObjectives = quarterObjectives.filter(obj => 
            obj.regionId && filters.userRegionIds!.includes(obj.regionId)
          );
        }
        if (filters?.userSubRegionIds && filters.userSubRegionIds.length > 0) {
          quarterObjectives = quarterObjectives.filter(obj => 
            obj.subRegionId && filters.userSubRegionIds!.includes(obj.subRegionId)
          );
        }
      } else {
        // Parse quarter string (e.g., "2025-Q1")
        const [yearStr, quarterStr] = quarter.split('-Q');
        const year = parseInt(yearStr);
        const quarterNumber = parseInt(quarterStr);
        
        if (!year || !quarterNumber || quarterNumber < 1 || quarterNumber > 4) {
          throw new Error("Invalid quarter format. Use YYYY-QX (e.g., 2025-Q1)");
        }

        // Calculate quarter date range
        const quarterStartMonth = (quarterNumber - 1) * 3;
        const quarterStart = new Date(year, quarterStartMonth, 1);
        const quarterEnd = new Date(year, quarterStartMonth + 3, 0);
        
        const quarterStartStr = quarterStart.toISOString().split('T')[0];
        const quarterEndStr = quarterEnd.toISOString().split('T')[0];

        // Apply regional filters first
        if (filters?.regionId) {
          quarterObjectives = quarterObjectives.filter(obj => obj.regionId === filters.regionId);
        }
        if (filters?.subRegionId) {
          quarterObjectives = quarterObjectives.filter(obj => obj.subRegionId === filters.subRegionId);
        }
        if (filters?.userRegionIds && filters.userRegionIds.length > 0) {
          quarterObjectives = quarterObjectives.filter(obj => 
            obj.regionId && filters.userRegionIds!.includes(obj.regionId)
          );
        }
        if (filters?.userSubRegionIds && filters.userSubRegionIds.length > 0) {
          quarterObjectives = quarterObjectives.filter(obj => 
            obj.subRegionId && filters.userSubRegionIds!.includes(obj.subRegionId)
          );
        }

        // Filter by date range (objectives that overlap with the quarter)
        quarterObjectives = quarterObjectives.filter(obj => {
          if (!obj.startDate || !obj.endDate) return false;
          const objStart = obj.startDate;
          const objEnd = obj.endDate;
          return objStart <= quarterEndStr && objEnd >= quarterStartStr;
        });
      }

      // Get key results for these objectives
      const objectiveIds = quarterObjectives.map(obj => obj.id);
      let quarterKeyResults: KeyResult[] = [];
      if (objectiveIds.length > 0) {
        quarterKeyResults = await db
          .select()
          .from(keyResults)
          .where(inArray(keyResults.objectiveId, objectiveIds));
      }

      // Get actions for these key results
      const keyResultIds = quarterKeyResults.map(kr => kr.id);
      let quarterActions: Action[] = [];
      if (keyResultIds.length > 0) {
        quarterActions = await db
          .select()
          .from(actions)
          .where(inArray(actions.keyResultId, keyResultIds));
      }

      // Get checkpoints for these key results
      let quarterCheckpoints: Checkpoint[] = [];
      if (keyResultIds.length > 0) {
        quarterCheckpoints = await db
          .select()
          .from(checkpoints)
          .where(inArray(checkpoints.keyResultId, keyResultIds));
          
        // For specific quarters, filter checkpoints by period
        if (quarter !== "all") {
          quarterCheckpoints = quarterCheckpoints.filter(cp => 
            cp.period && cp.period.startsWith(quarter.split('-Q')[0])
          );
        }
      }

      return {
        objectives: quarterObjectives,
        keyResults: quarterKeyResults,
        actions: quarterActions,
        checkpoints: quarterCheckpoints
      };
    } catch (error) {
      console.error('Error getting quarterly data:', error);
      return {
        objectives: [],
        keyResults: [],
        actions: [],
        checkpoints: []
      };
    }
  }

  async getAvailableQuarters(): Promise<string[]> {
    try {
      // Get date ranges from objectives, key results, and actions
      const objectiveDates = await db
        .select({
          startDate: objectives.startDate,
          endDate: objectives.endDate
        })
        .from(objectives);

      const keyResultDates = await db
        .select({
          startDate: keyResults.startDate,
          endDate: keyResults.endDate
        })
        .from(keyResults);

      const actionDates = await db
        .select({
          dueDate: actions.dueDate
        })
        .from(actions)
        .where(sql`${actions.dueDate} IS NOT NULL`);

      // Collect all date ranges and calculate quarters
      const allQuarters = new Set<string>();

      // Process objective dates
      objectiveDates.forEach(obj => {
        if (obj.startDate && obj.endDate) {
          const periods = getQuarterlyPeriods(obj.startDate, obj.endDate);
          periods.forEach(period => allQuarters.add(period.quarter));
        }
      });

      // Process key result dates
      keyResultDates.forEach(kr => {
        if (kr.startDate && kr.endDate) {
          const periods = getQuarterlyPeriods(kr.startDate, kr.endDate);
          periods.forEach(period => allQuarters.add(period.quarter));
        }
      });

      // Process action due dates
      actionDates.forEach(action => {
        if (action.dueDate) {
          const period = getQuarterlyPeriod(action.dueDate);
          allQuarters.add(period.quarter);
        }
      });

      // Convert to sorted array
      const sortedQuarters = Array.from(allQuarters).sort((a, b) => {
        const [yearA, quarterA] = a.split('-Q').map(Number);
        const [yearB, quarterB] = b.split('-Q').map(Number);
        return yearA === yearB ? quarterA - quarterB : yearA - yearB;
      });

      return sortedQuarters;
    } catch (error) {
      console.error('Error getting available quarters:', error);
      return [];
    }
  }

  async getQuarterlyStats(): Promise<{
    [quarter: string]: {
      objectives: number;
      keyResults: number;
      actions: number;
      checkpoints: number;
    };
  }> {
    try {
      const quarters = await this.getAvailableQuarters();
      const stats: { [quarter: string]: { objectives: number; keyResults: number; actions: number; checkpoints: number } } = {};

      for (const quarter of quarters) {
        const data = await this.getQuarterlyData(quarter);
        stats[quarter] = {
          objectives: data.objectives.length,
          keyResults: data.keyResults.length,
          actions: data.actions.length,
          checkpoints: data.checkpoints.length
        };
      }

      return stats;
    } catch (error) {
      console.error('Error getting quarterly stats:', error);
      return {};
    }
  }
}

// Export the SQLite storage instance
export const storage = new DatabaseStorage();