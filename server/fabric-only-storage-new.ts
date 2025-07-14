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
import { connectToFabric, executeQuery } from "./fabric-storage";
import MemoryStore from 'memorystore';
import Database from "better-sqlite3";

const MemorySessionStore = MemoryStore(session);

// Initialize SQLite as primary database
const db = new Database("okr.db");
db.pragma("journal_mode = WAL");

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
  private fabricConnected: boolean = false;

  constructor() {
    this.sessionStore = new MemorySessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    this.initializeSQLiteSchema();
    this.testConnection();
  }

  private async testConnection() {
    try {
      this.fabricConnected = await connectToFabric();
      console.log('✅ Microsoft Fabric SQL Server ready for future operations');
    } catch (error) {
      console.error('❌ Microsoft Fabric connection failed:', error.message);
      console.log('🔄 Using SQLite as primary database for reliable OKR operations');
      this.fabricConnected = false;
    }
  }

  private initializeSQLiteSchema() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT,
          name TEXT,
          role TEXT DEFAULT 'operacional',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS regions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sub_regions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          description TEXT,
          region_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (region_id) REFERENCES regions(id)
        );

        CREATE TABLE IF NOT EXISTS strategic_indicators (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS solutions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS service_lines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          solution_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (solution_id) REFERENCES solutions(id)
        );

        CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          service_line_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (service_line_id) REFERENCES service_lines(id)
        );

        CREATE TABLE IF NOT EXISTS objectives (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          owner_id INTEGER NOT NULL,
          region_id INTEGER,
          sub_region_id INTEGER,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          status TEXT DEFAULT 'active',
          progress REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id),
          FOREIGN KEY (region_id) REFERENCES regions(id),
          FOREIGN KEY (sub_region_id) REFERENCES sub_regions(id)
        );

        CREATE TABLE IF NOT EXISTS key_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          objective_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          number INTEGER NOT NULL,
          service_line_id INTEGER,
          service_id INTEGER,
          initial_value REAL NOT NULL,
          target_value REAL NOT NULL,
          current_value REAL DEFAULT 0,
          unit TEXT,
          frequency TEXT NOT NULL,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          progress REAL DEFAULT 0,
          status TEXT DEFAULT 'active',
          strategic_indicator_ids TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (objective_id) REFERENCES objectives(id),
          FOREIGN KEY (service_line_id) REFERENCES service_lines(id),
          FOREIGN KEY (service_id) REFERENCES services(id)
        );

        CREATE TABLE IF NOT EXISTS actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_result_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          responsible_id INTEGER,
          priority TEXT DEFAULT 'medium',
          status TEXT DEFAULT 'pending',
          due_date DATETIME,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (key_result_id) REFERENCES key_results(id),
          FOREIGN KEY (responsible_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS checkpoints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_result_id INTEGER NOT NULL,
          period TEXT NOT NULL,
          target_value REAL NOT NULL,
          actual_value REAL,
          progress REAL DEFAULT 0,
          status TEXT DEFAULT 'pendente',
          notes TEXT,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (key_result_id) REFERENCES key_results(id)
        );

        CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          description TEXT NOT NULL,
          old_values TEXT,
          new_values TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);
      console.log('✅ SQLite schema initialized for reliable OKR operations');
    } catch (error) {
      console.error('❌ Failed to initialize SQLite schema:', error.message);
    }
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      return result as User | undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      return result as User | undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = db.prepare(`
        INSERT INTO users (username, password, email, name, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(insertUser.username, insertUser.password, insertUser.email, insertUser.name, insertUser.role);
      
      const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      return newUser as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Reference data methods
  async getRegions(): Promise<Region[]> {
    try {
      const result = db.prepare('SELECT * FROM regions ORDER BY name').all();
      return result as Region[];
    } catch (error) {
      console.error('Error getting regions:', error);
      throw error;
    }
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    try {
      let query = 'SELECT * FROM sub_regions';
      let params: any[] = [];
      
      if (regionId) {
        query += ' WHERE region_id = ?';
        params.push(regionId);
      }
      
      query += ' ORDER BY name';
      
      const result = db.prepare(query).all(...params);
      return result as SubRegion[];
    } catch (error) {
      console.error('Error getting sub-regions:', error);
      throw error;
    }
  }

  async getSolutions(): Promise<Solution[]> {
    try {
      const result = db.prepare('SELECT * FROM solutions ORDER BY name').all();
      return result as Solution[];
    } catch (error) {
      console.error('Error getting solutions:', error);
      throw error;
    }
  }

  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    try {
      let query = 'SELECT * FROM service_lines';
      let params: any[] = [];
      
      if (solutionId) {
        query += ' WHERE solution_id = ?';
        params.push(solutionId);
      }
      
      query += ' ORDER BY name';
      
      const result = db.prepare(query).all(...params);
      return result as ServiceLine[];
    } catch (error) {
      console.error('Error getting service lines:', error);
      throw error;
    }
  }

  async getServices(serviceLineId?: number): Promise<Service[]> {
    try {
      let query = 'SELECT * FROM services';
      let params: any[] = [];
      
      if (serviceLineId) {
        query += ' WHERE service_line_id = ?';
        params.push(serviceLineId);
      }
      
      query += ' ORDER BY name';
      
      const result = db.prepare(query).all(...params);
      return result as Service[];
    } catch (error) {
      console.error('Error getting services:', error);
      throw error;
    }
  }

  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    try {
      const result = db.prepare('SELECT * FROM strategic_indicators ORDER BY name').all();
      return result as StrategicIndicator[];
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
      let query = `
        SELECT o.*, 
               u.username, u.name as owner_name, u.email as owner_email, u.role as owner_role,
               r.name as region_name, r.code as region_code,
               sr.name as sub_region_name, sr.code as sub_region_code
        FROM objectives o
        JOIN users u ON o.owner_id = u.id
        LEFT JOIN regions r ON o.region_id = r.id
        LEFT JOIN sub_regions sr ON o.sub_region_id = sr.id
        WHERE 1=1
      `;
      
      let params: any[] = [];
      
      if (filters?.regionId) {
        query += ' AND o.region_id = ?';
        params.push(filters.regionId);
      }
      
      if (filters?.subRegionId) {
        query += ' AND o.sub_region_id = ?';
        params.push(filters.subRegionId);
      }
      
      if (filters?.ownerId) {
        query += ' AND o.owner_id = ?';
        params.push(filters.ownerId);
      }
      
      query += ' ORDER BY o.created_at DESC';
      
      const result = db.prepare(query).all(...params);
      
      return result.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        ownerId: row.owner_id,
        regionId: row.region_id,
        subRegionId: row.sub_region_id,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        progress: row.progress,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        owner: {
          id: row.owner_id,
          username: row.username,
          name: row.owner_name,
          email: row.owner_email,
          role: row.owner_role
        },
        region: row.region_name ? {
          id: row.region_id,
          name: row.region_name,
          code: row.region_code
        } : undefined,
        subRegion: row.sub_region_name ? {
          id: row.sub_region_id,
          name: row.sub_region_name,
          code: row.sub_region_code
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting objectives:', error);
      throw error;
    }
  }

  async getObjective(id: number): Promise<Objective | undefined> {
    try {
      const result = db.prepare('SELECT * FROM objectives WHERE id = ?').get(id);
      return result as Objective | undefined;
    } catch (error) {
      console.error('Error getting objective:', error);
      throw error;
    }
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    try {
      const result = db.prepare(`
        INSERT INTO objectives (title, description, owner_id, region_id, sub_region_id, start_date, end_date, status, progress)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        objective.title,
        objective.description,
        objective.ownerId,
        objective.regionId || null,
        objective.subRegionId || null,
        objective.startDate ? new Date(objective.startDate).toISOString() : null,
        objective.endDate ? new Date(objective.endDate).toISOString() : null,
        objective.status || 'active',
        objective.progress || 0
      );
      
      const newObjective = db.prepare('SELECT * FROM objectives WHERE id = ?').get(result.lastInsertRowid);
      return newObjective as Objective;
    } catch (error) {
      console.error('Error creating objective:', error);
      throw error;
    }
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    try {
      const fields = [];
      const values = [];
      
      if (objective.title !== undefined) {
        fields.push('title = ?');
        values.push(objective.title);
      }
      if (objective.description !== undefined) {
        fields.push('description = ?');
        values.push(objective.description);
      }
      if (objective.ownerId !== undefined) {
        fields.push('owner_id = ?');
        values.push(objective.ownerId);
      }
      if (objective.regionId !== undefined) {
        fields.push('region_id = ?');
        values.push(objective.regionId);
      }
      if (objective.subRegionId !== undefined) {
        fields.push('sub_region_id = ?');
        values.push(objective.subRegionId);
      }
      if (objective.startDate !== undefined) {
        fields.push('start_date = ?');
        values.push(objective.startDate ? new Date(objective.startDate).toISOString() : null);
      }
      if (objective.endDate !== undefined) {
        fields.push('end_date = ?');
        values.push(objective.endDate ? new Date(objective.endDate).toISOString() : null);
      }
      if (objective.status !== undefined) {
        fields.push('status = ?');
        values.push(objective.status);
      }
      if (objective.progress !== undefined) {
        fields.push('progress = ?');
        values.push(objective.progress);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE objectives SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
      
      const updatedObjective = db.prepare('SELECT * FROM objectives WHERE id = ?').get(id);
      return updatedObjective as Objective;
    } catch (error) {
      console.error('Error updating objective:', error);
      throw error;
    }
  }

  async deleteObjective(id: number): Promise<void> {
    try {
      db.prepare('DELETE FROM objectives WHERE id = ?').run(id);
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
      let query = `
        SELECT kr.*, 
               o.title as objective_title, o.description as objective_description,
               o.owner_id as objective_owner_id, o.region_id as objective_region_id,
               o.sub_region_id as objective_sub_region_id, o.start_date as objective_start_date,
               o.end_date as objective_end_date, o.status as objective_status,
               o.progress as objective_progress, o.created_at as objective_created_at,
               o.updated_at as objective_updated_at
        FROM key_results kr
        JOIN objectives o ON kr.objective_id = o.id
        WHERE 1=1
      `;
      
      let params: any[] = [];
      
      if (objectiveId) {
        query += ' AND kr.objective_id = ?';
        params.push(objectiveId);
      }
      
      query += ' ORDER BY kr.created_at DESC';
      
      const result = db.prepare(query).all(...params);
      
      return result.map((row: any) => ({
        id: row.id,
        objectiveId: row.objective_id,
        title: row.title,
        description: row.description,
        number: row.number,
        serviceLineId: row.service_line_id,
        serviceId: row.service_id,
        initialValue: row.initial_value,
        targetValue: row.target_value,
        currentValue: row.current_value,
        unit: row.unit,
        frequency: row.frequency,
        startDate: row.start_date,
        endDate: row.end_date,
        progress: row.progress,
        status: row.status,
        strategicIndicatorIds: row.strategic_indicator_ids ? JSON.parse(row.strategic_indicator_ids) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        objective: {
          id: row.objective_id,
          title: row.objective_title,
          description: row.objective_description,
          ownerId: row.objective_owner_id,
          regionId: row.objective_region_id,
          subRegionId: row.objective_sub_region_id,
          startDate: row.objective_start_date,
          endDate: row.objective_end_date,
          status: row.objective_status,
          progress: row.objective_progress,
          createdAt: row.objective_created_at,
          updatedAt: row.objective_updated_at
        }
      }));
    } catch (error) {
      console.error('Error getting key results:', error);
      throw error;
    }
  }

  async getKeyResult(id: number): Promise<KeyResult | undefined> {
    try {
      const result = db.prepare('SELECT * FROM key_results WHERE id = ?').get(id);
      return result as KeyResult | undefined;
    } catch (error) {
      console.error('Error getting key result:', error);
      throw error;
    }
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    try {
      const result = db.prepare(`
        INSERT INTO key_results (objective_id, title, description, number, service_line_id, service_id, 
                               initial_value, target_value, current_value, unit, frequency, start_date, 
                               end_date, progress, status, strategic_indicator_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        keyResult.objectiveId,
        keyResult.title,
        keyResult.description,
        keyResult.number,
        keyResult.serviceLineId,
        keyResult.serviceId,
        keyResult.initialValue,
        keyResult.targetValue,
        keyResult.currentValue || 0,
        keyResult.unit,
        keyResult.frequency,
        keyResult.startDate ? new Date(keyResult.startDate).toISOString() : null,
        keyResult.endDate ? new Date(keyResult.endDate).toISOString() : null,
        keyResult.progress || 0,
        keyResult.status || 'active',
        JSON.stringify(keyResult.strategicIndicatorIds || [])
      );
      
      const newKeyResult = db.prepare('SELECT * FROM key_results WHERE id = ?').get(result.lastInsertRowid);
      return newKeyResult as KeyResult;
    } catch (error) {
      console.error('Error creating key result:', error);
      throw error;
    }
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    try {
      const fields = [];
      const values = [];
      
      if (keyResult.title !== undefined) {
        fields.push('title = ?');
        values.push(keyResult.title);
      }
      if (keyResult.description !== undefined) {
        fields.push('description = ?');
        values.push(keyResult.description);
      }
      if (keyResult.currentValue !== undefined) {
        fields.push('current_value = ?');
        values.push(keyResult.currentValue);
      }
      if (keyResult.progress !== undefined) {
        fields.push('progress = ?');
        values.push(keyResult.progress);
      }
      if (keyResult.status !== undefined) {
        fields.push('status = ?');
        values.push(keyResult.status);
      }
      if (keyResult.strategicIndicatorIds !== undefined) {
        fields.push('strategic_indicator_ids = ?');
        values.push(JSON.stringify(keyResult.strategicIndicatorIds));
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE key_results SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
      
      const updatedKeyResult = db.prepare('SELECT * FROM key_results WHERE id = ?').get(id);
      return updatedKeyResult as KeyResult;
    } catch (error) {
      console.error('Error updating key result:', error);
      throw error;
    }
  }

  async deleteKeyResult(id: number): Promise<void> {
    try {
      db.prepare('DELETE FROM key_results WHERE id = ?').run(id);
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
      let query = `
        SELECT a.*, 
               kr.title as key_result_title, kr.description as key_result_description,
               kr.objective_id, kr.number as key_result_number,
               u.username, u.name as responsible_name, u.email as responsible_email
        FROM actions a
        JOIN key_results kr ON a.key_result_id = kr.id
        LEFT JOIN users u ON a.responsible_id = u.id
        WHERE 1=1
      `;
      
      let params: any[] = [];
      
      if (keyResultId) {
        query += ' AND a.key_result_id = ?';
        params.push(keyResultId);
      }
      
      query += ' ORDER BY a.created_at DESC';
      
      const result = db.prepare(query).all(...params);
      
      return result.map((row: any) => ({
        id: row.id,
        keyResultId: row.key_result_id,
        title: row.title,
        description: row.description,
        responsibleId: row.responsible_id,
        priority: row.priority,
        status: row.status,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        keyResult: {
          id: row.key_result_id,
          title: row.key_result_title,
          description: row.key_result_description,
          objectiveId: row.objective_id,
          number: row.key_result_number
        },
        responsible: row.responsible_id ? {
          id: row.responsible_id,
          username: row.username,
          name: row.responsible_name,
          email: row.responsible_email
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting actions:', error);
      throw error;
    }
  }

  async getAction(id: number): Promise<Action | undefined> {
    try {
      const result = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
      return result as Action | undefined;
    } catch (error) {
      console.error('Error getting action:', error);
      throw error;
    }
  }

  async createAction(action: InsertAction): Promise<Action> {
    try {
      const result = db.prepare(`
        INSERT INTO actions (key_result_id, title, description, responsible_id, priority, status, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        action.keyResultId,
        action.title,
        action.description,
        action.responsibleId,
        action.priority || 'medium',
        action.status || 'pending',
        action.dueDate ? new Date(action.dueDate).toISOString() : null
      );
      
      const newAction = db.prepare('SELECT * FROM actions WHERE id = ?').get(result.lastInsertRowid);
      return newAction as Action;
    } catch (error) {
      console.error('Error creating action:', error);
      throw error;
    }
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    try {
      const fields = [];
      const values = [];
      
      if (action.title !== undefined) {
        fields.push('title = ?');
        values.push(action.title);
      }
      if (action.description !== undefined) {
        fields.push('description = ?');
        values.push(action.description);
      }
      if (action.responsibleId !== undefined) {
        fields.push('responsible_id = ?');
        values.push(action.responsibleId);
      }
      if (action.priority !== undefined) {
        fields.push('priority = ?');
        values.push(action.priority);
      }
      if (action.status !== undefined) {
        fields.push('status = ?');
        values.push(action.status);
        
        if (action.status === 'completed') {
          fields.push('completed_at = CURRENT_TIMESTAMP');
        }
      }
      if (action.dueDate !== undefined) {
        fields.push('due_date = ?');
        values.push(action.dueDate ? new Date(action.dueDate).toISOString() : null);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE actions SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
      
      const updatedAction = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
      return updatedAction as Action;
    } catch (error) {
      console.error('Error updating action:', error);
      throw error;
    }
  }

  async deleteAction(id: number): Promise<void> {
    try {
      db.prepare('DELETE FROM actions WHERE id = ?').run(id);
    } catch (error) {
      console.error('Error deleting action:', error);
      throw error;
    }
  }

  // Checkpoints methods
  async getCheckpoints(keyResultId?: number): Promise<Checkpoint[]> {
    try {
      let query = 'SELECT * FROM checkpoints WHERE 1=1';
      let params: any[] = [];
      
      if (keyResultId) {
        query += ' AND key_result_id = ?';
        params.push(keyResultId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = db.prepare(query).all(...params);
      return result as Checkpoint[];
    } catch (error) {
      console.error('Error getting checkpoints:', error);
      throw error;
    }
  }

  async getCheckpoint(id: number): Promise<Checkpoint | undefined> {
    try {
      const result = db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(id);
      return result as Checkpoint | undefined;
    } catch (error) {
      console.error('Error getting checkpoint:', error);
      throw error;
    }
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    try {
      const result = db.prepare(`
        INSERT INTO checkpoints (key_result_id, period, target_value, actual_value, progress, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        checkpoint.keyResultId,
        checkpoint.period,
        checkpoint.targetValue,
        checkpoint.actualValue,
        checkpoint.progress || 0,
        checkpoint.status || 'pendente',
        checkpoint.notes
      );
      
      const newCheckpoint = db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(result.lastInsertRowid);
      return newCheckpoint as Checkpoint;
    } catch (error) {
      console.error('Error creating checkpoint:', error);
      throw error;
    }
  }

  async updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint> {
    try {
      const fields = [];
      const values = [];
      
      if (checkpoint.actualValue !== undefined) {
        fields.push('actual_value = ?');
        values.push(checkpoint.actualValue);
      }
      if (checkpoint.progress !== undefined) {
        fields.push('progress = ?');
        values.push(checkpoint.progress);
      }
      if (checkpoint.status !== undefined) {
        fields.push('status = ?');
        values.push(checkpoint.status);
        
        if (checkpoint.status === 'concluido') {
          fields.push('completed_at = CURRENT_TIMESTAMP');
        }
      }
      if (checkpoint.notes !== undefined) {
        fields.push('notes = ?');
        values.push(checkpoint.notes);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE checkpoints SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
      
      const updatedCheckpoint = db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(id);
      return updatedCheckpoint as Checkpoint;
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
      
      // Generate checkpoint periods based on frequency
      const periods = this.generateCheckpointPeriods(keyResult);
      
      // Clear existing checkpoints
      db.prepare('DELETE FROM checkpoints WHERE key_result_id = ?').run(keyResultId);
      
      // Create new checkpoints
      const checkpoints: Checkpoint[] = [];
      
      for (const period of periods) {
        const checkpoint = await this.createCheckpoint({
          keyResultId,
          period: period.period,
          targetValue: period.targetValue,
          actualValue: undefined,
          progress: 0,
          status: 'pendente',
          notes: undefined
        });
        checkpoints.push(checkpoint);
      }
      
      return checkpoints;
    } catch (error) {
      console.error('Error generating checkpoints:', error);
      throw error;
    }
  }

  private generateCheckpointPeriods(keyResult: KeyResult): InsertCheckpoint[] {
    const periods: InsertCheckpoint[] = [];
    const startDate = new Date(keyResult.startDate);
    const endDate = new Date(keyResult.endDate);
    
    if (keyResult.frequency === 'monthly') {
      const months = this.getMonthsBetween(startDate, endDate);
      const targetValuePerMonth = keyResult.targetValue / months.length;
      
      months.forEach((month, index) => {
        periods.push({
          keyResultId: keyResult.id,
          period: month,
          targetValue: targetValuePerMonth * (index + 1),
          actualValue: undefined,
          progress: 0,
          status: 'pendente',
          notes: undefined
        });
      });
    } else if (keyResult.frequency === 'quarterly') {
      const quarters = this.getQuartersBetween(startDate, endDate);
      const targetValuePerQuarter = keyResult.targetValue / quarters.length;
      
      quarters.forEach((quarter, index) => {
        periods.push({
          keyResultId: keyResult.id,
          period: quarter,
          targetValue: targetValuePerQuarter * (index + 1),
          actualValue: undefined,
          progress: 0,
          status: 'pendente',
          notes: undefined
        });
      });
    } else if (keyResult.frequency === 'weekly') {
      const weeks = this.getWeeksBetween(startDate, endDate);
      const targetValuePerWeek = keyResult.targetValue / weeks.length;
      
      weeks.forEach((week, index) => {
        periods.push({
          keyResultId: keyResult.id,
          period: week,
          targetValue: targetValuePerWeek * (index + 1),
          actualValue: undefined,
          progress: 0,
          status: 'pendente',
          notes: undefined
        });
      });
    }
    
    return periods;
  }

  private getMonthsBetween(start: Date, end: Date): string[] {
    const months: string[] = [];
    let current = new Date(start);
    
    while (current <= end) {
      const year = current.getFullYear();
      const month = current.getMonth() + 1;
      months.push(`${year}-${month.toString().padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }

  private getQuartersBetween(start: Date, end: Date): string[] {
    const quarters: string[] = [];
    let current = new Date(start);
    
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
    let current = new Date(start);
    
    while (current <= end) {
      const year = current.getFullYear();
      const week = this.getWeekNumber(current);
      weeks.push(`${year}-W${week.toString().padStart(2, '0')}`);
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
      const result = db.prepare(`
        SELECT a.*, u.username, u.name as user_name, u.email as user_email
        FROM activities a
        JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT ?
      `).all(limit);
      
      return result.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        description: row.description,
        oldValues: row.old_values ? JSON.parse(row.old_values) : undefined,
        newValues: row.new_values ? JSON.parse(row.new_values) : undefined,
        createdAt: row.created_at,
        user: {
          id: row.user_id,
          username: row.username,
          name: row.user_name,
          email: row.user_email
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
      const result = db.prepare(`
        INSERT INTO activities (user_id, entity_type, entity_id, action, description, old_values, new_values)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        activity.userId,
        activity.entityType,
        activity.entityId,
        activity.action,
        activity.description,
        activity.oldValues ? JSON.stringify(activity.oldValues) : null,
        activity.newValues ? JSON.stringify(activity.newValues) : null
      );
      
      const newActivity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
      return newActivity as Activity;
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
      let objectivesQuery = 'SELECT COUNT(*) as count, AVG(o.progress) as avg_progress FROM objectives o WHERE 1=1';
      let keyResultsQuery = 'SELECT COUNT(*) as count, AVG(kr.progress) as avg_progress FROM key_results kr JOIN objectives o ON kr.objective_id = o.id WHERE 1=1';
      let actionsQuery = 'SELECT COUNT(*) as total, SUM(CASE WHEN a.status = "completed" THEN 1 ELSE 0 END) as completed FROM actions a JOIN key_results kr ON a.key_result_id = kr.id JOIN objectives o ON kr.objective_id = o.id WHERE 1=1';
      
      const params: any[] = [];
      
      if (filters?.regionId) {
        objectivesQuery += ' AND o.region_id = ?';
        keyResultsQuery += ' AND o.region_id = ?';
        actionsQuery += ' AND o.region_id = ?';
        params.push(filters.regionId);
      }
      
      if (filters?.subRegionId) {
        objectivesQuery += ' AND o.sub_region_id = ?';
        keyResultsQuery += ' AND o.sub_region_id = ?';
        actionsQuery += ' AND o.sub_region_id = ?';
        params.push(filters.subRegionId);
      }
      
      const objectivesResult = db.prepare(objectivesQuery).get(...params) as any;
      const keyResultsResult = db.prepare(keyResultsQuery).get(...params) as any;
      const actionsResult = db.prepare(actionsQuery).get(...params) as any;
      
      const totalObjectives = objectivesResult.count;
      const totalKeyResults = keyResultsResult.count;
      const averageProgress = keyResultsResult.avg_progress || 0;
      const totalActions = actionsResult.total;
      const completedActions = actionsResult.completed;
      
      // Calculate overall progress as weighted average
      const overallProgress = (objectivesResult.avg_progress + keyResultsResult.avg_progress) / 2 || 0;
      
      return {
        totalObjectives,
        totalKeyResults,
        averageProgress,
        totalActions,
        completedActions,
        overallProgress
      };
    } catch (error) {
      console.error('Error getting dashboard KPIs:', error);
      throw error;
    }
  }
}

export const storage = new FabricOnlyStorage();