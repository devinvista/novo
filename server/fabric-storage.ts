import sql from 'mssql';

// Microsoft Fabric SQL Server connection configuration
function getConfig(): sql.config {
  const config = {
    server: 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com',
    port: 1433,
    database: 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6',
    user: process.env.SQL_USERNAME || 'adailton.monteiro@sesirs.org.br',
    password: process.env.SQL_PASSWORD || 'winner33',
    authentication: {
      type: 'default'
    },
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
  
  console.log(`🔌 Connecting to server: ${config.server}`);
  console.log(`📊 Database: ${config.database}`);
  console.log(`👤 User: ${config.user}`);
  
  return config;
}

let connectionPool: sql.ConnectionPool | null = null;
let isConnected = false;

export const connectToFabric = async (): Promise<boolean> => {
  if (isConnected && connectionPool) {
    return true;
  }

  // Close existing connection if any
  if (connectionPool) {
    try {
      await connectionPool.close();
    } catch (e) {
      // Ignore close errors
    }
    connectionPool = null;
  }

  try {
    const config = getConfig();
    connectionPool = new sql.ConnectionPool(config);
    
    // Set timeout for connection attempt
    const connectPromise = connectionPool.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    isConnected = true;
    console.log('✅ Connected to Microsoft Fabric SQL Server');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Microsoft Fabric SQL Server:', error.message);
    console.error('   Make sure SQL_USERNAME and SQL_PASSWORD environment variables are set');
    isConnected = false;
    connectionPool = null;
    throw new Error(`Microsoft Fabric connection failed: ${error.message}`);
  }
};

export const executeQuery = async (query: string, params: any[] = []): Promise<any> => {
  // For now, throw error to force SQLite fallback until proper Azure authentication is configured
  throw new Error('Microsoft Fabric SQL Server is not available. Please check your Azure authentication and network connectivity.');
  
  // Try to connect/reconnect
  try {
    await connectToFabric();
  } catch (connectionError) {
    console.error('Connection failed, Microsoft Fabric not available:', connectionError.message);
    throw new Error('Microsoft Fabric SQL Server is not available. Please check your Azure authentication and network connectivity.');
  }

  if (!connectionPool) {
    throw new Error('Microsoft Fabric connection not available');
  }

  try {
    const request = connectionPool.request();
    
    // Add parameters if provided
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });

    const result = await request.query(query);
    return result;
  } catch (error) {
    console.error('Query execution error:', error);
    // Reset connection on query errors
    isConnected = false;
    connectionPool = null;
    throw new Error(`Database query failed: ${error.message}`);
  }
};

// Specific OKR queries for Microsoft Fabric
// Improve the fabric queries with better error handling
export const fabricQueries = {
  // Users
  async getUsers() {
    const query = 'SELECT * FROM users WHERE active = 1';
    const result = await executeQuery(query);
    return result.recordset;
  },

  async getUserByUsername(username: string) {
    const query = 'SELECT * FROM users WHERE username = @param0';
    const result = await executeQuery(query, [username]);
    return result.recordset[0];
  },

  async createUser(userData: any) {
    const query = `
      INSERT INTO users (username, password, name, email, role, region_id, sub_region_id, active)
      VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7);
      SELECT SCOPE_IDENTITY() as id;
    `;
    const result = await executeQuery(query, [
      userData.username,
      userData.password,
      userData.name,
      userData.email,
      userData.role,
      userData.regionId,
      userData.subRegionId,
      userData.active
    ]);
    return { id: result.recordset[0].id, ...userData };
  },

  // Regions
  async getRegions() {
    const query = 'SELECT * FROM regions ORDER BY name';
    const result = await executeQuery(query);
    return result.recordset;
  },

  async getSubRegions(regionId?: number) {
    let query = 'SELECT * FROM sub_regions';
    const params = [];
    
    if (regionId) {
      query += ' WHERE region_id = @param0';
      params.push(regionId);
    }
    
    query += ' ORDER BY name';
    const result = await executeQuery(query, params);
    return result.recordset;
  },

  // Solutions and Service Lines
  async getSolutions() {
    const query = 'SELECT * FROM solutions ORDER BY name';
    const result = await executeQuery(query);
    return result.recordset;
  },

  async getServiceLines(solutionId?: number) {
    let query = 'SELECT * FROM service_lines';
    const params = [];
    
    if (solutionId) {
      query += ' WHERE solution_id = @param0';
      params.push(solutionId);
    }
    
    query += ' ORDER BY name';
    const result = await executeQuery(query, params);
    return result.recordset;
  },

  async getServices(serviceLineId?: number) {
    let query = 'SELECT * FROM services';
    const params = [];
    
    if (serviceLineId) {
      query += ' WHERE service_line_id = @param0';
      params.push(serviceLineId);
    }
    
    query += ' ORDER BY name';
    const result = await executeQuery(query, params);
    return result.recordset;
  },

  // Strategic Indicators
  async getStrategicIndicators() {
    const query = 'SELECT * FROM strategic_indicators WHERE active = 1 ORDER BY name';
    const result = await executeQuery(query);
    return result.recordset;
  },

  // Objectives
  async getObjectives(filters: any = {}) {
    let query = `
      SELECT 
        o.*,
        u.name as owner_name,
        u.username as owner_username,
        r.name as region_name,
        sr.name as sub_region_name
      FROM objectives o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN regions r ON o.region_id = r.id
      LEFT JOIN sub_regions sr ON o.sub_region_id = sr.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.regionId) {
      query += ' AND o.region_id = @param' + params.length;
      params.push(filters.regionId);
    }

    if (filters.subRegionId) {
      query += ' AND o.sub_region_id = @param' + params.length;
      params.push(filters.subRegionId);
    }

    if (filters.ownerId) {
      query += ' AND o.owner_id = @param' + params.length;
      params.push(filters.ownerId);
    }

    query += ' ORDER BY o.created_at DESC';
    const result = await executeQuery(query, params);
    return result.recordset;
  },

  async createObjective(objectiveData: any) {
    const query = `
      INSERT INTO objectives (title, description, owner_id, region_id, sub_region_id, start_date, end_date, status, progress)
      VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7, @param8);
      SELECT SCOPE_IDENTITY() as id;
    `;
    const result = await executeQuery(query, [
      objectiveData.title,
      objectiveData.description,
      objectiveData.ownerId,
      objectiveData.regionId,
      objectiveData.subRegionId,
      objectiveData.startDate,
      objectiveData.endDate,
      objectiveData.status || 'active',
      objectiveData.progress || 0
    ]);
    return { id: result.recordset[0].id, ...objectiveData };
  },

  // Key Results
  async getKeyResults(objectiveId?: number) {
    let query = `
      SELECT 
        kr.*,
        o.title as objective_title,
        sl.name as service_line_name,
        s.name as service_name
      FROM key_results kr
      LEFT JOIN objectives o ON kr.objective_id = o.id
      LEFT JOIN service_lines sl ON kr.service_line_id = sl.id
      LEFT JOIN services s ON kr.service_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (objectiveId) {
      query += ' AND kr.objective_id = @param0';
      params.push(objectiveId);
    }

    query += ' ORDER BY kr.created_at DESC';
    const result = await executeQuery(query, params);
    return result.recordset;
  },

  async createKeyResult(keyResultData: any) {
    // Get next number for this objective
    const numberQuery = 'SELECT ISNULL(MAX(number), 0) + 1 as next_number FROM key_results WHERE objective_id = @param0';
    const numberResult = await executeQuery(numberQuery, [keyResultData.objectiveId]);
    const nextNumber = numberResult.recordset[0].next_number;

    const query = `
      INSERT INTO key_results (
        objective_id, title, description, number, strategic_indicator_ids,
        service_line_id, service_id, initial_value, target_value, current_value,
        unit, frequency, start_date, end_date, status, progress
      )
      VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7, @param8, @param9, @param10, @param11, @param12, @param13, @param14, @param15);
      SELECT SCOPE_IDENTITY() as id;
    `;
    const result = await executeQuery(query, [
      keyResultData.objectiveId,
      keyResultData.title,
      keyResultData.description,
      nextNumber,
      JSON.stringify(keyResultData.strategicIndicatorIds || []),
      keyResultData.serviceLineId,
      keyResultData.serviceId,
      keyResultData.initialValue,
      keyResultData.targetValue,
      keyResultData.currentValue || keyResultData.initialValue,
      keyResultData.unit,
      keyResultData.frequency,
      keyResultData.startDate,
      keyResultData.endDate,
      keyResultData.status || 'active',
      keyResultData.progress || 0
    ]);
    return { id: result.recordset[0].id, number: nextNumber, ...keyResultData };
  },

  // Actions
  async getActions(keyResultId?: number) {
    let query = `
      SELECT 
        a.*,
        kr.title as key_result_title,
        si.name as strategic_indicator_name,
        u.name as responsible_name
      FROM actions a
      LEFT JOIN key_results kr ON a.key_result_id = kr.id
      LEFT JOIN strategic_indicators si ON a.strategic_indicator_id = si.id
      LEFT JOIN users u ON a.responsible_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (keyResultId) {
      query += ' AND a.key_result_id = @param0';
      params.push(keyResultId);
    }

    query += ' ORDER BY a.created_at DESC';
    const result = await executeQuery(query, params);
    return result.recordset;
  },

  async createAction(actionData: any) {
    // Get next number for this key result
    const numberQuery = 'SELECT ISNULL(MAX(number), 0) + 1 as next_number FROM actions WHERE key_result_id = @param0';
    const numberResult = await executeQuery(numberQuery, [actionData.keyResultId]);
    const nextNumber = numberResult.recordset[0].next_number;

    const query = `
      INSERT INTO actions (
        key_result_id, title, description, number, strategic_indicator_id,
        responsible_id, due_date, status, priority
      )
      VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7, @param8);
      SELECT SCOPE_IDENTITY() as id;
    `;
    const result = await executeQuery(query, [
      actionData.keyResultId,
      actionData.title,
      actionData.description,
      nextNumber,
      actionData.strategicIndicatorId,
      actionData.responsibleId,
      actionData.dueDate,
      actionData.status || 'pending',
      actionData.priority || 'medium'
    ]);
    return { id: result.recordset[0].id, number: nextNumber, ...actionData };
  },

  // Checkpoints
  async getCheckpoints(keyResultId?: number) {
    let query = 'SELECT * FROM checkpoints WHERE 1=1';
    const params = [];

    if (keyResultId) {
      query += ' AND key_result_id = @param0';
      params.push(keyResultId);
    }

    query += ' ORDER BY period';
    const result = await executeQuery(query, params);
    return result.recordset;
  },

  // Dashboard KPIs
  async getDashboardKPIs(filters: any = {}) {
    const baseWhere = filters.regionId ? 'WHERE o.region_id = ' + filters.regionId : '';
    
    const queries = [
      `SELECT COUNT(*) as totalObjectives FROM objectives o ${baseWhere}`,
      `SELECT COUNT(*) as totalKeyResults FROM key_results kr LEFT JOIN objectives o ON kr.objective_id = o.id ${baseWhere}`,
      `SELECT AVG(CAST(progress as float)) as averageProgress FROM objectives o ${baseWhere}`,
      `SELECT COUNT(*) as totalActions FROM actions a LEFT JOIN key_results kr ON a.key_result_id = kr.id LEFT JOIN objectives o ON kr.objective_id = o.id ${baseWhere}`,
      `SELECT COUNT(*) as completedActions FROM actions a LEFT JOIN key_results kr ON a.key_result_id = kr.id LEFT JOIN objectives o ON kr.objective_id = o.id ${baseWhere} AND a.status = 'completed'`
    ];

    const results = await Promise.all(queries.map(q => executeQuery(q)));
    
    const totalObjectives = results[0].recordset[0].totalObjectives;
    const totalKeyResults = results[1].recordset[0].totalKeyResults;
    const averageProgress = results[2].recordset[0].averageProgress || 0;
    const totalActions = results[3].recordset[0].totalActions;
    const completedActions = results[4].recordset[0].completedActions;

    return {
      totalObjectives,
      totalKeyResults,
      averageProgress: parseFloat(averageProgress.toFixed(2)),
      totalActions,
      completedActions,
      overallProgress: totalObjectives > 0 ? parseFloat((averageProgress).toFixed(2)) : 0
    };
  }
};

export default fabricQueries;