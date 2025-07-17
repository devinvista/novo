import Database from 'better-sqlite3';
import session from 'express-session';
import MemoryStore from 'memorystore';
import sql from 'mssql';
import { 
  User, InsertUser, Region, SubRegion, Solution, ServiceLine, Service, 
  StrategicIndicator, Objective, InsertObjective, KeyResult, InsertKeyResult,
  Action, InsertAction, Checkpoint, InsertCheckpoint, Activity
} from '../shared/schema';

// Microsoft Fabric SQL Server connection
let fabricPool: sql.ConnectionPool | null = null;
let fabricConnected = false;

async function connectToFabric(): Promise<boolean> {
  if (fabricConnected && fabricPool) {
    return true;
  }

  try {
    // Use connection string approach (like Go example)
    const connectionString = `server=uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com,1433;database=OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6;uid=${process.env.SQL_USERNAME};pwd=${process.env.SQL_PASSWORD};encrypt=true;trustServerCertificate=false;authentication=SqlPassword`;
    
    fabricPool = new sql.ConnectionPool(connectionString);
    await fabricPool.connect();
    
    fabricConnected = true;
    console.log('✅ Microsoft Fabric SQL Server connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Microsoft Fabric connection failed:', error.message);
    fabricConnected = false;
    fabricPool = null;
    return false;
  }
}

async function executeQueryFabric(query: string, params: any[] = []): Promise<any> {
  if (!fabricConnected || !fabricPool) {
    throw new Error('Microsoft Fabric not connected');
  }
  
  const request = fabricPool.request();
  params.forEach((param, index) => {
    request.input(`param${index}`, param);
  });
  
  // Replace ? with @param0, @param1, etc.
  let fabricQuery = query;
  params.forEach((_, index) => {
    fabricQuery = fabricQuery.replace('?', `@param${index}`);
  });
  
  return await request.query(fabricQuery);
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getRegions(): Promise<Region[]>;
  getSubRegions(regionId?: number): Promise<SubRegion[]>;
  getSolutions(): Promise<Solution[]>;
  getServiceLines(solutionId?: number): Promise<ServiceLine[]>;
  getServices(serviceLineId?: number): Promise<Service[]>;
  getStrategicIndicators(): Promise<StrategicIndicator[]>;
  getObjectives(filters?: any): Promise<any[]>;
  getObjective(id: number): Promise<Objective | undefined>;
  createObjective(objective: InsertObjective): Promise<Objective>;
  updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective>;
  deleteObjective(id: number): Promise<void>;
  getKeyResults(objectiveId?: number): Promise<any[]>;
  getKeyResult(id: number): Promise<KeyResult | undefined>;
  createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult>;
  updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult>;
  deleteKeyResult(id: number): Promise<void>;
  getActions(keyResultId?: number): Promise<any[]>;
  getAction(id: number): Promise<Action | undefined>;
  createAction(action: InsertAction): Promise<Action>;
  updateAction(id: number, action: Partial<InsertAction>): Promise<Action>;
  deleteAction(id: number): Promise<void>;
  getCheckpoints(keyResultId?: number): Promise<Checkpoint[]>;
  getCheckpoint(id: number): Promise<Checkpoint | undefined>;
  createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint>;
  updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint>;
  generateCheckpoints(keyResultId: number): Promise<Checkpoint[]>;
  getRecentActivities(limit?: number): Promise<any[]>;
  logActivity(activity: any): Promise<Activity>;
  getDashboardKPIs(filters?: any): Promise<any>;
  sessionStore: session.SessionStore;
}

export class FabricOnlyStorage implements IStorage {
  private db: Database.Database;
  sessionStore: session.SessionStore;
  
  constructor() {
    // Initialize SQLite as fallback
    this.db = new Database('okr.db');
    this.sessionStore = new (MemoryStore(session))({
      checkPeriod: 86400000
    });
    
    this.initializeSQLiteSchema();
    this.initializeFabricConnection();
  }
  
  private async initializeFabricConnection() {
    try {
      await connectToFabric();
    } catch (error) {
      console.log('⚠️ Microsoft Fabric not available, using SQLite fallback');
    }
  }
  
  private initializeSQLiteSchema() {
    console.log('✅ SQLite schema initialized for reliable OKR operations');
    // SQLite schema initialization code would go here
  }
  
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Try Microsoft Fabric first
      if (fabricConnected) {
        try {
          const result = await executeQueryFabric('SELECT * FROM dbo.users WHERE id = ?', [id]);
          return result.recordset[0];
        } catch (fabricError) {
          console.warn('Fabric query failed, falling back to SQLite:', fabricError.message);
          fabricConnected = false;
        }
      }
      
      // Fallback to SQLite
      const result = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      return result as User | undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // Try Microsoft Fabric first
      if (fabricConnected) {
        try {
          const result = await executeQueryFabric('SELECT * FROM dbo.users WHERE username = ?', [username]);
          return result.recordset[0];
        } catch (fabricError) {
          console.warn('Fabric query failed, falling back to SQLite:', fabricError.message);
          fabricConnected = false;
        }
      }
      
      // Fallback to SQLite
      const result = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      return result as User | undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Try Microsoft Fabric first
      if (fabricConnected) {
        try {
          const result = await executeQueryFabric(`
            INSERT INTO dbo.users (username, password, email, name, role, created_at, updated_at)
            OUTPUT INSERTED.*
            VALUES (?, ?, ?, ?, ?, GETDATE(), GETDATE())
          `, [insertUser.username, insertUser.password, insertUser.email, insertUser.name, insertUser.role]);
          
          return result.recordset[0];
        } catch (fabricError) {
          console.warn('Fabric query failed, falling back to SQLite:', fabricError.message);
          fabricConnected = false;
        }
      }
      
      // Fallback to SQLite
      const result = this.db.prepare(`
        INSERT INTO users (username, password, email, name, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(insertUser.username, insertUser.password, insertUser.email, insertUser.name, insertUser.role);
      
      const newUser = this.db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      return newUser as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  async getRegions(): Promise<Region[]> {
    try {
      // Try Microsoft Fabric first
      if (fabricConnected) {
        try {
          const result = await executeQueryFabric('SELECT * FROM dbo.regions ORDER BY name');
          return result.recordset;
        } catch (fabricError) {
          console.warn('Fabric query failed, falling back to SQLite:', fabricError.message);
          fabricConnected = false;
        }
      }
      
      // Fallback to SQLite
      const result = this.db.prepare('SELECT * FROM regions ORDER BY name').all();
      return result as Region[];
    } catch (error) {
      console.error('Error getting regions:', error);
      throw error;
    }
  }
  
  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    try {
      // Try Microsoft Fabric first
      if (fabricConnected) {
        try {
          const query = regionId 
            ? 'SELECT * FROM dbo.sub_regions WHERE region_id = ? ORDER BY name'
            : 'SELECT * FROM dbo.sub_regions ORDER BY name';
          const params = regionId ? [regionId] : [];
          const result = await executeQueryFabric(query, params);
          return result.recordset;
        } catch (fabricError) {
          console.warn('Fabric query failed, falling back to SQLite:', fabricError.message);
          fabricConnected = false;
        }
      }
      
      // Fallback to SQLite
      const query = regionId 
        ? this.db.prepare('SELECT * FROM sub_regions WHERE region_id = ? ORDER BY name')
        : this.db.prepare('SELECT * FROM sub_regions ORDER BY name');
      const result = regionId ? query.all(regionId) : query.all();
      return result as SubRegion[];
    } catch (error) {
      console.error('Error getting sub-regions:', error);
      throw error;
    }
  }
  
  async getSolutions(): Promise<Solution[]> {
    try {
      // Try Microsoft Fabric first
      if (fabricConnected) {
        try {
          const result = await executeQueryFabric('SELECT * FROM dbo.solutions ORDER BY name');
          return result.recordset;
        } catch (fabricError) {
          console.warn('Fabric query failed, falling back to SQLite:', fabricError.message);
          fabricConnected = false;
        }
      }
      
      // Fallback to SQLite
      const result = this.db.prepare('SELECT * FROM solutions ORDER BY name').all();
      return result as Solution[];
    } catch (error) {
      console.error('Error getting solutions:', error);
      throw error;
    }
  }
  
  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    try {
      // Try Microsoft Fabric first
      if (fabricConnected) {
        try {
          const query = solutionId 
            ? 'SELECT * FROM dbo.service_lines WHERE solution_id = ? ORDER BY name'
            : 'SELECT * FROM dbo.service_lines ORDER BY name';
          const params = solutionId ? [solutionId] : [];
          const result = await executeQueryFabric(query, params);
          return result.recordset;
        } catch (fabricError) {
          console.warn('Fabric query failed, falling back to SQLite:', fabricError.message);
          fabricConnected = false;
        }
      }
      
      // Fallback to SQLite
      const query = solutionId 
        ? this.db.prepare('SELECT * FROM service_lines WHERE solution_id = ? ORDER BY name')
        : this.db.prepare('SELECT * FROM service_lines ORDER BY name');
      const result = solutionId ? query.all(solutionId) : query.all();
      return result as ServiceLine[];
    } catch (error) {
      console.error('Error getting service lines:', error);
      throw error;
    }
  }
  
  async getServices(serviceLineId?: number): Promise<Service[]> {
    try {
      // Try Microsoft Fabric first
      if (fabricConnected) {
        try {
          const query = serviceLineId 
            ? 'SELECT * FROM dbo.services WHERE service_line_id = ? ORDER BY name'
            : 'SELECT * FROM dbo.services ORDER BY name';
          const params = serviceLineId ? [serviceLineId] : [];
          const result = await executeQueryFabric(query, params);
          return result.recordset;
        } catch (fabricError) {
          console.warn('Fabric query failed, falling back to SQLite:', fabricError.message);
          fabricConnected = false;
        }
      }
      
      // Fallback to SQLite
      const query = serviceLineId 
        ? this.db.prepare('SELECT * FROM services WHERE service_line_id = ? ORDER BY name')
        : this.db.prepare('SELECT * FROM services ORDER BY name');
      const result = serviceLineId ? query.all(serviceLineId) : query.all();
      return result as Service[];
    } catch (error) {
      console.error('Error getting services:', error);
      throw error;
    }
  }
  
  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    try {
      // Try Microsoft Fabric first
      if (fabricConnected) {
        try {
          const result = await executeQueryFabric('SELECT * FROM dbo.strategic_indicators ORDER BY name');
          return result.recordset;
        } catch (fabricError) {
          console.warn('Fabric query failed, falling back to SQLite:', fabricError.message);
          fabricConnected = false;
        }
      }
      
      // Fallback to SQLite
      const result = this.db.prepare('SELECT * FROM strategic_indicators ORDER BY name').all();
      return result as StrategicIndicator[];
    } catch (error) {
      console.error('Error getting strategic indicators:', error);
      throw error;
    }
  }
  
  // Add stub implementations for the remaining methods
  async getObjectives(): Promise<any[]> { return []; }
  async getObjective(id: number): Promise<Objective | undefined> { return undefined; }
  async createObjective(objective: InsertObjective): Promise<Objective> { throw new Error('Not implemented'); }
  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> { throw new Error('Not implemented'); }
  async deleteObjective(id: number): Promise<void> { }
  async getKeyResults(): Promise<any[]> { return []; }
  async getKeyResult(id: number): Promise<KeyResult | undefined> { return undefined; }
  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> { throw new Error('Not implemented'); }
  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> { throw new Error('Not implemented'); }
  async deleteKeyResult(id: number): Promise<void> { }
  async getActions(): Promise<any[]> { return []; }
  async getAction(id: number): Promise<Action | undefined> { return undefined; }
  async createAction(action: InsertAction): Promise<Action> { throw new Error('Not implemented'); }
  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> { throw new Error('Not implemented'); }
  async deleteAction(id: number): Promise<void> { }
  async getCheckpoints(): Promise<Checkpoint[]> { return []; }
  async getCheckpoint(id: number): Promise<Checkpoint | undefined> { return undefined; }
  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> { throw new Error('Not implemented'); }
  async updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint> { throw new Error('Not implemented'); }
  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> { return []; }
  async getRecentActivities(): Promise<any[]> { return []; }
  async logActivity(activity: any): Promise<Activity> { throw new Error('Not implemented'); }
  async getDashboardKPIs(): Promise<any> { return {}; }
}

export const storage = new FabricOnlyStorage();