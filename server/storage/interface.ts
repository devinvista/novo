import type {
  User, InsertUser, Objective, InsertObjective,
  KeyResult, InsertKeyResult, Action, InsertAction,
  Checkpoint, InsertCheckpoint, Region, SubRegion,
  ServiceLine, StrategicIndicator,
  Solution, Service, ActionComment, InsertActionComment,
} from '@shared/schema';

export interface IStorage {
  sessionStore: any;

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

  getRegions(): Promise<Region[]>;
  getSubRegions(regionId?: number): Promise<SubRegion[]>;
  getSolutions(): Promise<Solution[]>;
  getServiceLines(solutionId?: number): Promise<ServiceLine[]>;
  getServices(serviceLineId?: number): Promise<Service[]>;
  getStrategicIndicators(): Promise<StrategicIndicator[]>;

  getAvailableQuarters(): Promise<any[]>;
  getQuarterlyData(quarter?: string, currentUserId?: number, filters?: any): Promise<any>;
  getQuarterlyStats(): Promise<any[]>;
  getDashboardKPIs(currentUserId?: number, filters?: any): Promise<any>;

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

  getActionComments(actionId: number): Promise<any[]>;
  createActionComment(comment: InsertActionComment): Promise<ActionComment>;

  createStrategicIndicator(data: { name: string; code: string; description?: string; unit?: string }): Promise<StrategicIndicator>;
  updateStrategicIndicator(id: number, data: { name: string; code: string; description?: string; unit?: string }): Promise<StrategicIndicator>;
  deleteStrategicIndicator(id: number): Promise<void>;

  createRegion(data: { name: string; code: string }): Promise<Region>;
  updateRegion(id: number, data: { name: string; code: string }): Promise<Region>;
  deleteRegion(id: number): Promise<void>;

  createSubRegion(data: { name: string; code: string; regionId: number }): Promise<SubRegion>;
  updateSubRegion(id: number, data: { name: string; code: string; regionId: number }): Promise<SubRegion>;
  deleteSubRegion(id: number): Promise<void>;

  createSolution(data: { name: string; code: string; description?: string }): Promise<Solution>;
  updateSolution(id: number, data: { name: string; code: string; description?: string }): Promise<Solution>;
  deleteSolution(id: number): Promise<void>;

  createServiceLine(data: { name: string; code: string; description?: string; solutionId: number }): Promise<ServiceLine>;
  updateServiceLine(id: number, data: { name: string; code: string; description?: string; solutionId: number }): Promise<ServiceLine>;
  deleteServiceLine(id: number): Promise<void>;

  createService(data: { name: string; code: string; description?: string; serviceLineId: number }): Promise<Service>;
  updateService(id: number, data: { name: string; code: string; description?: string; serviceLineId: number }): Promise<Service>;
  deleteService(id: number): Promise<void>;
}
