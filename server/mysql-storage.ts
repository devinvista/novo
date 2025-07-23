import mysql from 'mysql2/promise';
import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import { 
  User, InsertUser, Region, SubRegion, Solution, ServiceLine, Service, 
  StrategicIndicator, Objective, InsertObjective, KeyResult, InsertKeyResult,
  Action, InsertAction, Checkpoint, InsertCheckpoint, Activity
} from '../shared/schema';
// Removed parseDecimalBR - using parseFloat directly

// MySQL connection configuration for Replit
const mysqlConfig = {
  host: 'srv1661.hstgr.io',
  port: 3306,
  user: 'u905571261_okr',
  password: 'Okr2025$',
  database: 'u905571261_okr',
  ssl: false,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
};

// Create MySQL connection pool
let pool: mysql.Pool;

async function initializePool() {
  try {
    pool = mysql.createPool({
      ...mysqlConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL connection established successfully');
    console.log(`🔌 Connected to: ${mysqlConfig.host}:${mysqlConfig.port}`);
    console.log(`📊 Database: ${mysqlConfig.database}`);
    console.log(`👤 User: ${mysqlConfig.user}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    return false;
  }
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

export class MySQLStorage implements IStorage {
  sessionStore: session.SessionStore;
  private connected: boolean = false;

  constructor() {
    this.initializeConnection();
    
    // Initialize session store
    const MySQLSessionStore = MySQLStore(session);
    this.sessionStore = new MySQLSessionStore(mysqlConfig);
  }

  private async initializeConnection() {
    this.connected = await initializePool();
    if (this.connected) {
      await this.initializeDatabase();
    }
  }

  private async initializeDatabase() {
    try {
      // Create tables if they don't exist
      await this.createTables();
      await this.seedInitialData();
      console.log('✅ MySQL database initialized successfully');
    } catch (error) {
      console.error('❌ MySQL database initialization failed:', error);
    }
  }

  private async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role VARCHAR(50) NOT NULL DEFAULT 'operacional',
        region_id INT,
        sub_region_id INT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS regions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE
      )`,
      
      `CREATE TABLE IF NOT EXISTS sub_regions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        region_id INT NOT NULL,
        FOREIGN KEY (region_id) REFERENCES regions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS solutions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS service_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        solution_id INT NOT NULL,
        FOREIGN KEY (solution_id) REFERENCES solutions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        service_line_id INT NOT NULL,
        FOREIGN KEY (service_line_id) REFERENCES service_lines(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS strategic_indicators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        unit VARCHAR(50)
      )`,
      
      `CREATE TABLE IF NOT EXISTS objectives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        owner_id INT NOT NULL,
        region_id INT,
        sub_region_id INT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        progress DECIMAL(5,2) DEFAULT 0,
        period VARCHAR(50),
        service_line_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (region_id) REFERENCES regions(id),
        FOREIGN KEY (sub_region_id) REFERENCES sub_regions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS key_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        objective_id INT NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        target_value DECIMAL(15,2) NOT NULL,
        current_value DECIMAL(15,2) DEFAULT 0,
        unit VARCHAR(50),
        strategic_indicator_ids JSON NOT NULL,
        service_line_id INT,
        service_id INT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        progress DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (objective_id) REFERENCES objectives(id),
        FOREIGN KEY (service_line_id) REFERENCES service_lines(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS actions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_result_id INT NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        number INT NOT NULL,
        strategic_indicator_id INT,
        responsible_id INT,
        due_date TIMESTAMP,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (key_result_id) REFERENCES key_results(id),
        FOREIGN KEY (strategic_indicator_id) REFERENCES strategic_indicators(id),
        FOREIGN KEY (responsible_id) REFERENCES users(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS checkpoints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_result_id INT NOT NULL,
        period VARCHAR(50) NOT NULL,
        target_value DECIMAL(15,2) NOT NULL,
        actual_value DECIMAL(15,2),
        progress DECIMAL(5,2) DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        notes TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (key_result_id) REFERENCES key_results(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        old_values JSON,
        new_values JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    ];

    for (const table of tables) {
      await pool.execute(table);
    }
  }

  private async seedInitialData() {
    // Check if data already exists for each table
    const [regions] = await pool.execute('SELECT COUNT(*) as count FROM regions');
    const [strategicIndicators] = await pool.execute('SELECT COUNT(*) as count FROM strategic_indicators');
    
    // Seed regions if empty
    if ((regions as any)[0].count === 0) {
      // Seed regions
    const regionData = [
      { name: 'Região Norte', code: 'NORTE' },
      { name: 'Região Nordeste', code: 'NORDESTE' },
      { name: 'Região Centro-Oeste', code: 'CENTRO_OESTE' },
      { name: 'Região Sudeste', code: 'SUDESTE' },
      { name: 'Região Sul', code: 'SUL' },
      { name: 'Região Metropolitana', code: 'METROPOLITANA' },
      { name: 'Região Serra', code: 'SERRA' },
      { name: 'Região Litoral', code: 'LITORAL' },
      { name: 'Região Interior', code: 'INTERIOR' },
      { name: 'Região Fronteira', code: 'FRONTEIRA' },
      { name: 'Região Central', code: 'CENTRAL' }
    ];

    for (const region of regionData) {
      await pool.execute('INSERT INTO regions (name, code) VALUES (?, ?)', [region.name, region.code]);
    }

    // Seed sub-regions
    const subRegionData = [
      { name: 'Sub-região Norte 1', code: 'NORTE_1', regionId: 1 },
      { name: 'Sub-região Norte 2', code: 'NORTE_2', regionId: 1 },
      { name: 'Sub-região Nordeste 1', code: 'NORDESTE_1', regionId: 2 },
      { name: 'Sub-região Nordeste 2', code: 'NORDESTE_2', regionId: 2 },
      { name: 'Sub-região Centro-Oeste 1', code: 'CENTRO_OESTE_1', regionId: 3 },
      { name: 'Sub-região Centro-Oeste 2', code: 'CENTRO_OESTE_2', regionId: 3 },
      { name: 'Sub-região Sudeste 1', code: 'SUDESTE_1', regionId: 4 },
      { name: 'Sub-região Sudeste 2', code: 'SUDESTE_2', regionId: 4 },
      { name: 'Sub-região Sul 1', code: 'SUL_1', regionId: 5 },
      { name: 'Sub-região Sul 2', code: 'SUL_2', regionId: 5 },
      { name: 'Sub-região Metropolitana 1', code: 'METROPOLITANA_1', regionId: 6 },
      { name: 'Sub-região Metropolitana 2', code: 'METROPOLITANA_2', regionId: 6 },
      { name: 'Sub-região Serra 1', code: 'SERRA_1', regionId: 7 },
      { name: 'Sub-região Serra 2', code: 'SERRA_2', regionId: 7 },
      { name: 'Sub-região Litoral 1', code: 'LITORAL_1', regionId: 8 },
      { name: 'Sub-região Litoral 2', code: 'LITORAL_2', regionId: 8 },
      { name: 'Sub-região Interior 1', code: 'INTERIOR_1', regionId: 9 },
      { name: 'Sub-região Interior 2', code: 'INTERIOR_2', regionId: 9 },
      { name: 'Sub-região Fronteira 1', code: 'FRONTEIRA_1', regionId: 10 },
      { name: 'Sub-região Fronteira 2', code: 'FRONTEIRA_2', regionId: 10 },
      { name: 'Sub-região Central 1', code: 'CENTRAL_1', regionId: 11 }
    ];

      for (const subRegion of subRegionData) {
        await pool.execute('INSERT INTO sub_regions (name, code, region_id) VALUES (?, ?, ?)', 
          [subRegion.name, subRegion.code, subRegion.regionId]);
      }
    }

    // Seed solutions if empty
    const [solutions] = await pool.execute('SELECT COUNT(*) as count FROM solutions');
    if ((solutions as any)[0].count === 0) {
      // Seed solutions
    const solutions = [
      { name: 'Educação', description: 'Soluções educacionais para a indústria' },
      { name: 'Saúde', description: 'Soluções de saúde e segurança do trabalho' }
    ];

      for (const solution of solutions) {
        await pool.execute('INSERT INTO solutions (name, description) VALUES (?, ?)', 
          [solution.name, solution.description]);
      }
    }

    // Seed service lines if empty
    const [serviceLines] = await pool.execute('SELECT COUNT(*) as count FROM service_lines');
    if ((serviceLines as any)[0].count === 0) {
      // Seed service lines
    const serviceLines = [
      { name: 'Educação Profissional', description: 'Cursos técnicos e profissionalizantes', solutionId: 1 },
      { name: 'Educação Continuada', description: 'Programas de educação continuada', solutionId: 1 },
      { name: 'Educação Corporativa', description: 'Treinamentos empresariais', solutionId: 1 },
      { name: 'Educação Superior', description: 'Cursos de graduação e pós-graduação', solutionId: 1 },
      { name: 'Educação Básica', description: 'Ensino fundamental e médio', solutionId: 1 },
      { name: 'Educação à Distância', description: 'Cursos online e híbridos', solutionId: 1 },
      { name: 'Educação Inclusiva', description: 'Programas de inclusão social', solutionId: 1 },
      { name: 'Saúde Ocupacional', description: 'Medicina e segurança do trabalho', solutionId: 2 },
      { name: 'Saúde Preventiva', description: 'Programas de prevenção e promoção da saúde', solutionId: 2 },
      { name: 'Saúde Mental', description: 'Apoio psicológico e bem-estar', solutionId: 2 },
      { name: 'Saúde Ambiental', description: 'Higiene e segurança ambiental', solutionId: 2 },
      { name: 'Saúde Digital', description: 'Telemedicina e soluções digitais', solutionId: 2 },
      { name: 'Saúde Comunitária', description: 'Programas de saúde para comunidades', solutionId: 2 },
      { name: 'Saúde da Família', description: 'Cuidados com a família do trabalhador', solutionId: 2 },
      { name: 'Saúde Esportiva', description: 'Medicina esportiva e reabilitação', solutionId: 2 }
    ];

      for (const serviceLine of serviceLines) {
        await pool.execute('INSERT INTO service_lines (name, description, solution_id) VALUES (?, ?, ?)', 
          [serviceLine.name, serviceLine.description, serviceLine.solutionId]);
      }
    }

    // Seed strategic indicators if empty
    if ((strategicIndicators as any)[0].count === 0) {
      // Seed strategic indicators
    const strategicIndicators = [
      { name: 'Sustentabilidade Operacional', description: 'Indicador de sustentabilidade das operações', unit: '%' },
      { name: 'Receita de Serviços', description: 'Receita gerada pelos serviços prestados', unit: 'R$' },
      { name: 'Matrículas em Educação', description: 'Número de matrículas em programas educacionais', unit: 'unidades' },
      { name: 'Indústrias Atendidas em Saúde', description: 'Número de indústrias atendidas nos programas de saúde', unit: 'unidades' },
      { name: 'Trabalhadores da Indústria Atendidos em Saúde', description: 'Número de trabalhadores atendidos', unit: 'pessoas' },
      { name: 'Matrículas Presenciais com Mais de 4 Horas', description: 'Matrículas em cursos presenciais de longa duração', unit: 'unidades' },
      { name: 'Custo Hora Aluno', description: 'Custo por hora de ensino por aluno', unit: 'R$/hora' }
    ];

      for (const indicator of strategicIndicators) {
        await pool.execute('INSERT INTO strategic_indicators (name, description, unit) VALUES (?, ?, ?)', 
          [indicator.name, indicator.description, indicator.unit]);
      }
    }

    console.log('✅ Initial data seeded successfully');
  }

  async getUser(id: number): Promise<User | undefined> {
    if (!this.connected) return undefined;
    
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    const users = rows as User[];
    return users.length > 0 ? users[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.connected) return undefined;
    
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    const users = rows as User[];
    return users.length > 0 ? users[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!this.connected) throw new Error('Database not connected');
    
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, name, email, role, region_id, sub_region_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [insertUser.username, insertUser.password, insertUser.name, insertUser.email, insertUser.role, insertUser.regionId, insertUser.subRegionId, insertUser.active]
    );
    
    const insertId = (result as any).insertId;
    const user = await this.getUser(insertId);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async getRegions(): Promise<Region[]> {
    if (!this.connected) return [];
    
    const [rows] = await pool.execute('SELECT * FROM regions ORDER BY name');
    return rows as Region[];
  }

  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    if (!this.connected) return [];
    
    let query = 'SELECT * FROM sub_regions';
    const params: any[] = [];
    
    if (regionId) {
      query += ' WHERE region_id = ?';
      params.push(regionId);
    }
    
    query += ' ORDER BY name';
    const [rows] = await pool.execute(query, params);
    return rows as SubRegion[];
  }

  async getSolutions(): Promise<Solution[]> {
    if (!this.connected) return [];
    
    const [rows] = await pool.execute('SELECT * FROM solutions ORDER BY name');
    return rows as Solution[];
  }

  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    if (!this.connected) return [];
    
    let query = 'SELECT * FROM service_lines';
    const params: any[] = [];
    
    if (solutionId) {
      query += ' WHERE solution_id = ?';
      params.push(solutionId);
    }
    
    query += ' ORDER BY name';
    const [rows] = await pool.execute(query, params);
    return rows as ServiceLine[];
  }

  async getServices(serviceLineId?: number): Promise<Service[]> {
    if (!this.connected) return [];
    
    let query = 'SELECT * FROM services';
    const params: any[] = [];
    
    if (serviceLineId) {
      query += ' WHERE service_line_id = ?';
      params.push(serviceLineId);
    }
    
    query += ' ORDER BY name';
    const [rows] = await pool.execute(query, params);
    return rows as Service[];
  }

  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    if (!this.connected) return [];
    
    const [rows] = await pool.execute('SELECT * FROM strategic_indicators ORDER BY name');
    return rows as StrategicIndicator[];
  }

  async getObjectives(): Promise<any[]> {
    if (!this.connected) return [];
    
    const [rows] = await pool.execute(`
      SELECT o.*, 
             u.name as owner_name, u.email as owner_email,
             r.name as region_name, r.code as region_code,
             sr.name as sub_region_name, sr.code as sub_region_code
      FROM objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN regions r ON o.region_id = r.id
      LEFT JOIN sub_regions sr ON o.sub_region_id = sr.id
      ORDER BY o.created_at DESC
    `);
    
    return rows as any[];
  }

  async getObjective(id: number): Promise<Objective | undefined> {
    if (!this.connected) return undefined;
    
    const [rows] = await pool.execute('SELECT * FROM objectives WHERE id = ?', [id]);
    const objectives = rows as Objective[];
    return objectives.length > 0 ? objectives[0] : undefined;
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    if (!this.connected) throw new Error('Database not connected');
    
    const [result] = await pool.execute(
      'INSERT INTO objectives (title, description, owner_id, region_id, sub_region_id, start_date, end_date, status, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [objective.title, objective.description, objective.ownerId, objective.regionId, objective.subRegionId, objective.startDate, objective.endDate, objective.status, objective.progress]
    );
    
    const insertId = (result as any).insertId;
    const newObjective = await this.getObjective(insertId);
    if (!newObjective) throw new Error('Failed to create objective');
    return newObjective;
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    if (!this.connected) throw new Error('Database not connected');
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(objective)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    values.push(id);
    await pool.execute(`UPDATE objectives SET ${fields.join(', ')} WHERE id = ?`, values);
    
    const updated = await this.getObjective(id);
    if (!updated) throw new Error('Failed to update objective');
    return updated;
  }

  async deleteObjective(id: number): Promise<void> {
    if (!this.connected) throw new Error('Database not connected');
    
    await pool.execute('DELETE FROM objectives WHERE id = ?', [id]);
  }

  async getKeyResults(): Promise<any[]> {
    if (!this.connected) return [];
    
    const [rows] = await pool.execute(`
      SELECT kr.*, 
             o.title as objective_title,
             sl.name as service_line_name,
             s.name as service_name
      FROM key_results kr
      LEFT JOIN objectives o ON kr.objective_id = o.id
      LEFT JOIN service_lines sl ON kr.service_line_id = sl.id
      LEFT JOIN services s ON kr.service_id = s.id
      ORDER BY kr.created_at DESC
    `);
    
    return rows as any[];
  }

  async getKeyResult(id: number, userId?: number): Promise<KeyResult | undefined> {
    if (!this.connected) return undefined;
    
    // Validate that id is a valid number and not NaN
    if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
      console.error('Invalid key result ID:', id, 'Type:', typeof id);
      return undefined;
    }
    
    console.log('Getting key result with ID:', id, 'Type:', typeof id);
    const [rows] = await pool.execute('SELECT * FROM key_results WHERE id = ?', [id]);
    const keyResults = rows as KeyResult[];
    return keyResults.length > 0 ? keyResults[0] : undefined;
  }

  async createKeyResult(keyResult: InsertKeyResult): Promise<KeyResult> {
    if (!this.connected) throw new Error('Database not connected');
    
    try {
      console.log('Creating key result with data:', keyResult);
      
      // Garantir que valores decimais sejam válidos (convertendo strings para números)
      const targetValue = parseFloat(keyResult.targetValue?.toString() || "0") || 0;
      const currentValue = parseFloat(keyResult.initialValue?.toString() || "0") || 0;
      
      const [result] = await pool.execute(
        'INSERT INTO key_results (objective_id, title, description, target_value, current_value, unit, strategicIndicatorIds, serviceLineIds, service_id, start_date, end_date, frequency, status, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          keyResult.objectiveId, 
          keyResult.title, 
          keyResult.description, 
          isNaN(targetValue) ? 0 : targetValue,
          isNaN(currentValue) ? 0 : currentValue, 
          keyResult.unit || null, 
          JSON.stringify(keyResult.strategicIndicatorIds || []), 
          JSON.stringify(keyResult.serviceLineIds || []), 
          keyResult.serviceId || null, 
          keyResult.startDate, 
          keyResult.endDate, 
          keyResult.frequency, 
          keyResult.status || 'active', 
          keyResult.progress || '0'
        ]
      );
      
      const insertId = (result as any).insertId;
      console.log('Insert ID:', insertId, 'Type:', typeof insertId, 'Result:', result);
      
      // Verificar se o insert foi bem-sucedido
      if (!insertId) {
        console.error('No insertId returned. Full result:', result);
        throw new Error('Failed to get insert ID from database');
      }
      
      // Converter para number com segurança
      const validId = Number(insertId);
      if (isNaN(validId) || validId <= 0) {
        console.error('Invalid insertId after conversion:', validId, 'Original:', insertId);
        throw new Error(`Invalid insert ID: ${insertId} -> ${validId}`);
      }
      console.log('Successfully converted ID:', validId);
      
      // Buscar o key result criado diretamente
      const [rows] = await pool.execute(
        'SELECT * FROM key_results WHERE id = ?', 
        [validId]
      );
      
      const newKeyResult = (rows as any[])[0];
      if (!newKeyResult) {
        console.error('Failed to retrieve created key result with ID:', validId);
        throw new Error('Failed to create key result');
      }
      return newKeyResult;
    } catch (error) {
      console.error('Error creating key result:', error);
      throw error;
    }
  }

  async updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>): Promise<KeyResult> {
    if (!this.connected) throw new Error('Database not connected');
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(keyResult)) {
      if (value !== undefined) {
        if (key === 'strategicIndicatorIds') {
          fields.push(`strategic_indicator_ids = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
    
    values.push(id);
    await pool.execute(`UPDATE key_results SET ${fields.join(', ')} WHERE id = ?`, values);
    
    const updated = await this.getKeyResult(id);
    if (!updated) throw new Error('Failed to update key result');
    return updated;
  }

  async deleteKeyResult(id: number): Promise<void> {
    if (!this.connected) throw new Error('Database not connected');
    
    await pool.execute('DELETE FROM key_results WHERE id = ?', [id]);
  }

  async getActions(): Promise<any[]> {
    if (!this.connected) return [];
    
    const [rows] = await pool.execute(`
      SELECT a.*, 
             kr.title as key_result_title,
             si.name as strategic_indicator_name,
             u.name as responsible_name
      FROM actions a
      LEFT JOIN key_results kr ON a.key_result_id = kr.id
      LEFT JOIN strategic_indicators si ON a.strategic_indicator_id = si.id
      LEFT JOIN users u ON a.responsible_id = u.id
      ORDER BY a.created_at DESC
    `);
    
    return rows as any[];
  }

  async getAction(id: number): Promise<Action | undefined> {
    if (!this.connected) return undefined;
    
    const [rows] = await pool.execute('SELECT * FROM actions WHERE id = ?', [id]);
    const actions = rows as Action[];
    return actions.length > 0 ? actions[0] : undefined;
  }

  async createAction(action: InsertAction): Promise<Action> {
    if (!this.connected) throw new Error('Database not connected');
    
    try {
      // Get next number for this key result
      const [maxRows] = await pool.execute(
        'SELECT COALESCE(MAX(number), 0) + 1 AS next_number FROM actions WHERE key_result_id = ?',
        [action.keyResultId]
      );
      const nextNumber = (maxRows as any)[0].next_number;
      
      const [result] = await pool.execute(
        'INSERT INTO actions (key_result_id, title, description, number, strategic_indicator_id, responsible_id, due_date, status, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          action.keyResultId, 
          action.title, 
          action.description, 
          nextNumber, 
          action.strategicIndicatorId || null, 
          action.responsibleId || null, 
          action.dueDate || null, 
          action.status || 'pending', 
          action.priority || 'medium'
        ]
      );
      
      const insertId = (result as any).insertId;
      const newAction = await this.getAction(insertId);
      if (!newAction) throw new Error('Failed to create action');
      return newAction;
    } catch (error) {
      console.error('Error creating action:', error);
      throw error;
    }
  }

  async updateAction(id: number, action: Partial<InsertAction>): Promise<Action> {
    if (!this.connected) throw new Error('Database not connected');
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(action)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    values.push(id);
    await pool.execute(`UPDATE actions SET ${fields.join(', ')} WHERE id = ?`, values);
    
    const updated = await this.getAction(id);
    if (!updated) throw new Error('Failed to update action');
    return updated;
  }

  async deleteAction(id: number): Promise<void> {
    if (!this.connected) throw new Error('Database not connected');
    
    await pool.execute('DELETE FROM actions WHERE id = ?', [id]);
  }

  async getCheckpoints(): Promise<Checkpoint[]> {
    if (!this.connected) return [];
    
    const [rows] = await pool.execute('SELECT * FROM checkpoints ORDER BY created_at DESC');
    return rows as Checkpoint[];
  }

  async getCheckpoint(id: number): Promise<Checkpoint | undefined> {
    if (!this.connected) return undefined;
    
    const [rows] = await pool.execute('SELECT * FROM checkpoints WHERE id = ?', [id]);
    const checkpoints = rows as Checkpoint[];
    return checkpoints.length > 0 ? checkpoints[0] : undefined;
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    if (!this.connected) throw new Error('Database not connected');
    
    const [result] = await pool.execute(
      'INSERT INTO checkpoints (key_result_id, period, target_value, actual_value, progress, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [checkpoint.keyResultId, checkpoint.period, checkpoint.targetValue, checkpoint.actualValue, checkpoint.progress, checkpoint.status, checkpoint.notes]
    );
    
    const insertId = (result as any).insertId;
    const newCheckpoint = await this.getCheckpoint(insertId);
    if (!newCheckpoint) throw new Error('Failed to create checkpoint');
    return newCheckpoint;
  }

  async updateCheckpoint(id: number, checkpoint: Partial<InsertCheckpoint>): Promise<Checkpoint> {
    if (!this.connected) throw new Error('Database not connected');
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(checkpoint)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    values.push(id);
    await pool.execute(`UPDATE checkpoints SET ${fields.join(', ')} WHERE id = ?`, values);
    
    const updated = await this.getCheckpoint(id);
    if (!updated) throw new Error('Failed to update checkpoint');
    return updated;
  }

  async generateCheckpoints(keyResultId: number): Promise<Checkpoint[]> {
    if (!this.connected) throw new Error('Database not connected');
    
    const keyResult = await this.getKeyResult(keyResultId);
    if (!keyResult) throw new Error('Key result not found');
    
    // Delete existing checkpoints
    await pool.execute('DELETE FROM checkpoints WHERE key_result_id = ?', [keyResultId]);
    
    // Generate new checkpoints based on frequency
    const periods = this.generateCheckpointPeriods(keyResult);
    const checkpoints: Checkpoint[] = [];
    
    for (const period of periods) {
      const checkpoint = await this.createCheckpoint({
        keyResultId,
        period: period.period,
        targetValue: period.targetValue,
        actualValue: null,
        progress: 0,
        status: 'pending',
        notes: null,
        completedAt: null
      });
      checkpoints.push(checkpoint);
    }
    
    return checkpoints;
  }

  private generateCheckpointPeriods(keyResult: KeyResult): InsertCheckpoint[] {
    const periods: InsertCheckpoint[] = [];
    const start = new Date(keyResult.startDate);
    const end = new Date(keyResult.endDate);
    
    if (keyResult.frequency === 'monthly') {
      const months = this.getMonthsBetween(start, end);
      const targetPerMonth = keyResult.targetValue / months.length;
      
      months.forEach((month, index) => {
        periods.push({
          keyResultId: keyResult.id,
          period: month,
          targetValue: targetPerMonth * (index + 1), // Cumulative target
          actualValue: null,
          progress: 0,
          status: 'pending',
          notes: null,
          completedAt: null
        });
      });
    } else if (keyResult.frequency === 'quarterly') {
      const quarters = this.getQuartersBetween(start, end);
      const targetPerQuarter = keyResult.targetValue / quarters.length;
      
      quarters.forEach((quarter, index) => {
        periods.push({
          keyResultId: keyResult.id,
          period: quarter,
          targetValue: targetPerQuarter * (index + 1), // Cumulative target
          actualValue: null,
          progress: 0,
          status: 'pending',
          notes: null,
          completedAt: null
        });
      });
    } else if (keyResult.frequency === 'weekly') {
      const weeks = this.getWeeksBetween(start, end);
      const targetPerWeek = keyResult.targetValue / weeks.length;
      
      weeks.forEach((week, index) => {
        periods.push({
          keyResultId: keyResult.id,
          period: week,
          targetValue: targetPerWeek * (index + 1), // Cumulative target
          actualValue: null,
          progress: 0,
          status: 'pending',
          notes: null,
          completedAt: null
        });
      });
    }
    
    return periods;
  }

  private getMonthsBetween(start: Date, end: Date): string[] {
    const months: string[] = [];
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
      quarters.push(`${current.getFullYear()}-Q${quarter}`);
      current.setMonth(current.getMonth() + 3);
    }
    
    return quarters;
  }

  private getWeeksBetween(start: Date, end: Date): string[] {
    const weeks: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const week = this.getWeekNumber(current);
      weeks.push(`${current.getFullYear()}-W${String(week).padStart(2, '0')}`);
      current.setDate(current.getDate() + 7);
    }
    
    return weeks;
  }

  private getWeekNumber(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  async getRecentActivities(limit = 10): Promise<any[]> {
    if (!this.connected) return [];
    
    const [rows] = await pool.execute(`
      SELECT a.*, u.name as user_name
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [limit]);
    
    return rows as any[];
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
    if (!this.connected) throw new Error('Database not connected');
    
    const [result] = await pool.execute(
      'INSERT INTO activities (user_id, entity_type, entity_id, action, description, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [activity.userId, activity.entityType, activity.entityId, activity.action, activity.description, 
       activity.oldValues ? JSON.stringify(activity.oldValues) : null, 
       activity.newValues ? JSON.stringify(activity.newValues) : null]
    );
    
    const insertId = (result as any).insertId;
    const [rows] = await pool.execute('SELECT * FROM activities WHERE id = ?', [insertId]);
    const activities = rows as Activity[];
    return activities[0];
  }

  async getDashboardKPIs(): Promise<any> {
    if (!this.connected) return {};
    
    const [objectives] = await pool.execute('SELECT COUNT(*) as count FROM objectives');
    const [keyResults] = await pool.execute('SELECT COUNT(*) as count FROM key_results');
    const [actions] = await pool.execute('SELECT COUNT(*) as count FROM actions');
    const [completedActions] = await pool.execute('SELECT COUNT(*) as count FROM actions WHERE status = "completed"');
    
    return {
      totalObjectives: (objectives as any)[0].count,
      totalKeyResults: (keyResults as any)[0].count,
      totalActions: (actions as any)[0].count,
      completedActions: (completedActions as any)[0].count,
      averageProgress: 0,
      overallProgress: 0
    };
  }
}

export const storage = new MySQLStorage();