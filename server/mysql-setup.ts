import mysql from 'mysql2/promise';

// MySQL connection configuration
const connectionConfig = {
  host: process.env.MYSQL_HOST!,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USERNAME!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!,
  multipleStatements: true,
};

async function createTablesAndSeedData() {
  let connection: mysql.Connection | null = null;
  
  try {
    console.log('🔄 Connecting to MySQL database...');
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to MySQL database');

    // Create tables
    console.log('🔄 Creating tables...');
    await createTables(connection);
    console.log('✅ Tables created successfully');

    // Seed initial data
    console.log('🔄 Seeding initial data...');
    await seedInitialData(connection);
    console.log('✅ Initial data seeded successfully');

    console.log('🎉 MySQL database setup completed successfully!');
  } catch (error) {
    console.error('❌ MySQL setup failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function createTables(connection: mysql.Connection) {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL DEFAULT 'operacional',
      regionIds JSON DEFAULT ('[]'),
      subRegionIds JSON DEFAULT ('[]'),
      solutionIds JSON DEFAULT ('[]'),
      serviceLineIds JSON DEFAULT ('[]'),
      serviceIds JSON DEFAULT ('[]'),
      gestorId INT,
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      approvedAt TIMESTAMP NULL,
      approvedBy INT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gestorId) REFERENCES users(id),
      FOREIGN KEY (approvedBy) REFERENCES users(id)
    )`,

    // Regions table
    `CREATE TABLE IF NOT EXISTS regions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      code VARCHAR(50) NOT NULL UNIQUE
    )`,

    // Sub-regions table
    `CREATE TABLE IF NOT EXISTS sub_regions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) NOT NULL UNIQUE,
      regionId INT NOT NULL,
      FOREIGN KEY (regionId) REFERENCES regions(id)
    )`,

    // Solutions table
    `CREATE TABLE IF NOT EXISTS solutions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT
    )`,

    // Service lines table
    `CREATE TABLE IF NOT EXISTS service_lines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      solutionId INT NOT NULL,
      FOREIGN KEY (solutionId) REFERENCES solutions(id)
    )`,

    // Services table
    `CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      serviceLineId INT NOT NULL,
      FOREIGN KEY (serviceLineId) REFERENCES service_lines(id)
    )`,

    // Strategic indicators table
    `CREATE TABLE IF NOT EXISTS strategic_indicators (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      unit VARCHAR(50)
    )`,

    // Objectives table
    `CREATE TABLE IF NOT EXISTS objectives (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      ownerId INT NOT NULL,
      regionId INT,
      subRegionId INT,
      startDate VARCHAR(10) NOT NULL,
      endDate VARCHAR(10) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      progress DECIMAL(5,2) DEFAULT 0,
      period VARCHAR(50),
      serviceLineId INT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (ownerId) REFERENCES users(id),
      FOREIGN KEY (regionId) REFERENCES regions(id),
      FOREIGN KEY (subRegionId) REFERENCES sub_regions(id),
      FOREIGN KEY (serviceLineId) REFERENCES service_lines(id)
    )`,

    // Key results table
    `CREATE TABLE IF NOT EXISTS key_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      objectiveId INT NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      targetValue DECIMAL(15,2) NOT NULL,
      currentValue DECIMAL(15,2) DEFAULT 0,
      unit VARCHAR(50),
      strategicIndicatorIds JSON DEFAULT ('[]'),
      serviceLineIds JSON DEFAULT ('[]'),
      serviceId INT,
      startDate VARCHAR(10) NOT NULL,
      endDate VARCHAR(10) NOT NULL,
      frequency VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      progress DECIMAL(5,2) DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (objectiveId) REFERENCES objectives(id),
      FOREIGN KEY (serviceId) REFERENCES services(id)
    )`,

    // Actions table
    `CREATE TABLE IF NOT EXISTS actions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      keyResultId INT NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      number INT NOT NULL,
      responsibleId INT,
      dueDate VARCHAR(10),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      priority VARCHAR(50) NOT NULL DEFAULT 'medium',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (keyResultId) REFERENCES key_results(id),
      FOREIGN KEY (responsibleId) REFERENCES users(id)
    )`,

    // Checkpoints table
    `CREATE TABLE IF NOT EXISTS checkpoints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      keyResultId INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      targetValue DECIMAL(15,2) NOT NULL,
      actualValue DECIMAL(15,2) DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      dueDate VARCHAR(10) NOT NULL,
      completedDate VARCHAR(10),
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (keyResultId) REFERENCES key_results(id)
    )`,

    // Action comments table
    `CREATE TABLE IF NOT EXISTS action_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      actionId INT NOT NULL,
      userId INT NOT NULL,
      comment TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actionId) REFERENCES actions(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )`
  ];

  for (const table of tables) {
    await connection.execute(table);
  }
}

async function seedInitialData(connection: mysql.Connection) {
  // Check if data already exists
  const [existing] = await connection.execute('SELECT COUNT(*) as count FROM users');
  if ((existing as any)[0].count > 0) {
    console.log('ℹ️ Data already exists, skipping seeding');
    return;
  }

  // Seed regions
  const regions = [
    [1, 'Metropolitana', 'METRO'],
    [2, 'Serra', 'SERRA'],
    [3, 'Vale do Sinos', 'SINOS'],
    [4, 'Vale do Taquari', 'TAQUARI'],
    [5, 'Norte', 'NORTE'],
    [6, 'Central', 'CENTRAL'],
    [7, 'Sul', 'SUL'],
    [8, 'Hortênsias', 'HORT'],
    [9, 'Fronteira Noroeste', 'FRONOR'],
    [10, 'Fronteira Oeste', 'FROOESTE'],
    [11, 'Alto Jacuí', 'JACUI']
  ];

  await connection.execute(
    'INSERT IGNORE INTO regions (id, name, code) VALUES ?',
    [regions]
  );

  // Seed sub-regions
  const subRegions = [
    [1, 'Metropolitana 1', 'METRO1', 1],
    [2, 'Metropolitana 2', 'METRO2', 1],
    [3, 'Metropolitana 3', 'METRO3', 1],
    [4, 'Serra 1', 'SERRA1', 2],
    [5, 'Serra 2', 'SERRA2', 2],
    [6, 'Serra 3', 'SERRA3', 2],
    [7, 'Vale do Sinos 1', 'SINOS1', 3],
    [8, 'Vale do Sinos 2', 'SINOS2', 3],
    [9, 'Vale do Sinos 3', 'SINOS3', 3],
    [10, 'Vale do Taquari 1', 'TAQUARI1', 4],
    [11, 'Vale do Taquari 2', 'TAQUARI2', 4],
    [12, 'Norte 1', 'NORTE1', 5],
    [13, 'Norte 2', 'NORTE2', 5],
    [14, 'Central 1', 'CENTRAL1', 6],
    [15, 'Central 2', 'CENTRAL2', 6],
    [16, 'Sul 1', 'SUL1', 7],
    [17, 'Sul 2', 'SUL2', 7],
    [18, 'Hortênsias 1', 'HORT1', 8],
    [19, 'Fronteira Noroeste 1', 'FRONOR1', 9],
    [20, 'Fronteira Oeste 1', 'FROOESTE1', 10],
    [21, 'Alto Jacuí 1', 'JACUI1', 11]
  ];

  await connection.execute(
    'INSERT IGNORE INTO sub_regions (id, name, code, regionId) VALUES ?',
    [subRegions]
  );

  // Seed solutions
  const solutions = [
    [1, 'Educação', 'Soluções educacionais para a indústria'],
    [2, 'Saúde', 'Soluções de saúde e segurança do trabalho']
  ];

  await connection.execute(
    'INSERT IGNORE INTO solutions (id, name, description) VALUES ?',
    [solutions]
  );

  // Seed service lines
  const serviceLines = [
    [1, 'Educação Básica', 'Educação fundamental e média', 1],
    [2, 'Educação Profissional', 'Cursos técnicos e profissionalizantes', 1],
    [3, 'Educação Superior', 'Graduação e pós-graduação', 1],
    [4, 'Saúde Ocupacional', 'Medicina e segurança do trabalho', 2],
    [5, 'Promoção da Saúde', 'Programas de bem-estar e saúde', 2]
  ];

  await connection.execute(
    'INSERT IGNORE INTO service_lines (id, name, description, solutionId) VALUES ?',
    [serviceLines]
  );

  // Seed services
  const services = [
    [1, 'Ensino Fundamental', 'Educação fundamental completa', 1],
    [2, 'Ensino Médio', 'Educação média completa', 1],
    [3, 'Cursos Técnicos', 'Formação técnica profissional', 2],
    [4, 'Graduação Tecnológica', 'Cursos superiores de tecnologia', 3],
    [5, 'Pós-graduação', 'Especialização e mestrado', 3],
    [6, 'Exames Ocupacionais', 'Exames médicos do trabalho', 4],
    [7, 'Programas de Ginástica Laboral', 'Atividades físicas no trabalho', 5]
  ];

  await connection.execute(
    'INSERT IGNORE INTO services (id, name, description, serviceLineId) VALUES ?',
    [services]
  );

  // Seed strategic indicators
  const strategicIndicators = [
    [1, 'Sustentabilidade Operacional', 'Indicador de sustentabilidade das operações', null],
    [2, 'Receita de Serviços', 'Receita gerada pelos serviços prestados', 'R$'],
    [3, 'Matrículas em Educação', 'Número de matrículas nos cursos educacionais', 'unidades'],
    [4, 'Indústrias Atendidas em Saúde', 'Quantidade de indústrias atendidas pelos serviços de saúde', 'unidades'],
    [5, 'Trabalhadores da Indústria Atendidos em Saúde', 'Número de trabalhadores atendidos', 'pessoas'],
    [6, 'Matrículas Presenciais com Mais de 4 Horas', 'Matrículas em cursos presenciais longos', 'unidades'],
    [7, 'Custo Hora Aluno', 'Custo por hora de educação por aluno', 'R$/hora']
  ];

  await connection.execute(
    'INSERT IGNORE INTO strategic_indicators (id, name, description, unit) VALUES ?',
    [strategicIndicators]
  );

  // Seed admin users
  const users = [
    [1, 'admin', '$2b$10$hash_for_admin123', 'Administrador Principal', 'admin@fiergs.org.br', 'admin', '[]', '[]', '[]', '[]', '[]', null, true, null, null, true],
    [2, 'gestor.teste', '$2b$10$hash_for_admin456', 'Gestor Teste', 'gestor.teste@fiergs.org.br', 'gestor', '[1]', '[1]', '[1]', '[1,2]', '[1,2,3]', null, true, null, null, true]
  ];

  await connection.execute(
    'INSERT IGNORE INTO users (id, username, password, name, email, role, regionIds, subRegionIds, solutionIds, serviceLineIds, serviceIds, gestorId, approved, approvedAt, approvedBy, active) VALUES ?',
    [users]
  );

  console.log('✅ Initial data seeded successfully');
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTablesAndSeedData()
    .then(() => {
      console.log('🎉 MySQL setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ MySQL setup failed:', error);
      process.exit(1);
    });
}

export { createTablesAndSeedData };