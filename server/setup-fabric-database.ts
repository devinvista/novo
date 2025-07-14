import { executeQuery, connectToFabric } from './fabric-storage';

async function setupFabricDatabase() {
  console.log('🚀 Setting up Microsoft Fabric database with initial data...');
  
  try {
    // Test connection first
    await connectToFabric();
    console.log('✅ Connected to Microsoft Fabric SQL Server');
    
    // Create/verify table structure
    console.log('📋 Creating database tables...');
    await createTables();
    
    // Seed initial data
    console.log('🌱 Seeding initial data...');
    await seedData();
    
    console.log('🎉 Microsoft Fabric database setup completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to setup Microsoft Fabric database:', error.message);
    throw error;
  }
}

async function createTables() {
  const tables = [
    // Users table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
     CREATE TABLE users (
       id INT IDENTITY(1,1) PRIMARY KEY,
       username NVARCHAR(50) NOT NULL UNIQUE,
       password NVARCHAR(255) NOT NULL,
       name NVARCHAR(100) NOT NULL,
       email NVARCHAR(100) NOT NULL UNIQUE,
       role NVARCHAR(20) NOT NULL DEFAULT 'operacional',
       region_id INT,
       sub_region_id INT,
       active BIT NOT NULL DEFAULT 1,
       created_at DATETIME2 DEFAULT GETDATE()
     )`,
    
    // Regions table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='regions' AND xtype='U')
     CREATE TABLE regions (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL UNIQUE,
       code NVARCHAR(10) NOT NULL UNIQUE
     )`,
    
    // Sub-regions table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sub_regions' AND xtype='U')
     CREATE TABLE sub_regions (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL,
       code NVARCHAR(10) NOT NULL UNIQUE,
       region_id INT NOT NULL
     )`,
    
    // Solutions table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='solutions' AND xtype='U')
     CREATE TABLE solutions (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL UNIQUE,
       description NVARCHAR(MAX),
       created_at DATETIME2 DEFAULT GETDATE()
     )`,
    
    // Service lines table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='service_lines' AND xtype='U')
     CREATE TABLE service_lines (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL,
       description NVARCHAR(MAX),
       solution_id INT NOT NULL,
       created_at DATETIME2 DEFAULT GETDATE()
     )`,
    
    // Services table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='services' AND xtype='U')
     CREATE TABLE services (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL,
       description NVARCHAR(MAX),
       service_line_id INT NOT NULL,
       created_at DATETIME2 DEFAULT GETDATE()
     )`,
    
    // Strategic indicators table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='strategic_indicators' AND xtype='U')
     CREATE TABLE strategic_indicators (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(100) NOT NULL UNIQUE,
       description NVARCHAR(MAX),
       unit NVARCHAR(20),
       active BIT NOT NULL DEFAULT 1
     )`,
    
    // Objectives table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='objectives' AND xtype='U')
     CREATE TABLE objectives (
       id INT IDENTITY(1,1) PRIMARY KEY,
       title NVARCHAR(200) NOT NULL,
       description NVARCHAR(MAX),
       owner_id INT NOT NULL,
       region_id INT,
       sub_region_id INT,
       start_date DATE NOT NULL,
       end_date DATE NOT NULL,
       status NVARCHAR(20) NOT NULL DEFAULT 'active',
       progress FLOAT DEFAULT 0,
       created_at DATETIME2 DEFAULT GETDATE(),
       updated_at DATETIME2 DEFAULT GETDATE()
     )`,
    
    // Key results table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='key_results' AND xtype='U')
     CREATE TABLE key_results (
       id INT IDENTITY(1,1) PRIMARY KEY,
       objective_id INT NOT NULL,
       title NVARCHAR(200) NOT NULL,
       description NVARCHAR(MAX),
       number INT NOT NULL,
       strategic_indicator_ids NVARCHAR(255),
       service_line_id INT,
       service_id INT,
       initial_value FLOAT NOT NULL,
       target_value FLOAT NOT NULL,
       current_value FLOAT DEFAULT 0,
       unit NVARCHAR(20),
       frequency NVARCHAR(20) NOT NULL,
       start_date DATE NOT NULL,
       end_date DATE NOT NULL,
       progress FLOAT DEFAULT 0,
       status NVARCHAR(20) NOT NULL DEFAULT 'active',
       created_at DATETIME2 DEFAULT GETDATE(),
       updated_at DATETIME2 DEFAULT GETDATE()
     )`,
    
    // Actions table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='actions' AND xtype='U')
     CREATE TABLE actions (
       id INT IDENTITY(1,1) PRIMARY KEY,
       key_result_id INT NOT NULL,
       title NVARCHAR(200) NOT NULL,
       description NVARCHAR(MAX),
       number INT NOT NULL,
       strategic_indicator_id INT,
       responsible_id INT,
       due_date DATE,
       status NVARCHAR(20) NOT NULL DEFAULT 'pending',
       priority NVARCHAR(20) NOT NULL DEFAULT 'medium',
       created_at DATETIME2 DEFAULT GETDATE(),
       updated_at DATETIME2 DEFAULT GETDATE()
     )`,
    
    // Checkpoints table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='checkpoints' AND xtype='U')
     CREATE TABLE checkpoints (
       id INT IDENTITY(1,1) PRIMARY KEY,
       key_result_id INT NOT NULL,
       period NVARCHAR(20) NOT NULL,
       target_value FLOAT NOT NULL,
       actual_value FLOAT,
       progress FLOAT DEFAULT 0,
       status NVARCHAR(20) NOT NULL DEFAULT 'pendente',
       notes NVARCHAR(MAX),
       completed_at DATETIME2,
       created_at DATETIME2 DEFAULT GETDATE(),
       updated_at DATETIME2 DEFAULT GETDATE()
     )`,
    
    // Activities table
    `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activities' AND xtype='U')
     CREATE TABLE activities (
       id INT IDENTITY(1,1) PRIMARY KEY,
       user_id INT NOT NULL,
       entity_type NVARCHAR(50) NOT NULL,
       entity_id INT NOT NULL,
       action NVARCHAR(50) NOT NULL,
       description NVARCHAR(255) NOT NULL,
       old_values NVARCHAR(MAX),
       new_values NVARCHAR(MAX),
       created_at DATETIME2 DEFAULT GETDATE()
     )`
  ];

  for (const table of tables) {
    await executeQuery(table);
  }
  
  console.log('✅ All tables created successfully');
}

async function seedData() {
  // Seed regions
  const regions = [
    ['Norte', 'NOR'], ['Nordeste', 'NE'], ['Centro-Oeste', 'CO'], ['Sudeste', 'SE'], 
    ['Sul', 'SUL'], ['São Paulo Capital', 'SP'], ['Interior SP', 'ISP'], 
    ['Rio de Janeiro', 'RJ'], ['Minas Gerais', 'MG'], ['Bahia', 'BA'], ['Central', 'CEN']
  ];
  
  for (const [name, code] of regions) {
    await executeQuery(
      'IF NOT EXISTS (SELECT 1 FROM regions WHERE code = @param0) INSERT INTO regions (name, code) VALUES (@param1, @param0)',
      [code, name]
    );
  }
  
  // Seed solutions
  const solutions = [
    ['Educação', 'Soluções educacionais para desenvolvimento profissional'],
    ['Saúde', 'Soluções de saúde e segurança no trabalho']
  ];
  
  for (const [name, description] of solutions) {
    await executeQuery(
      'IF NOT EXISTS (SELECT 1 FROM solutions WHERE name = @param0) INSERT INTO solutions (name, description) VALUES (@param0, @param1)',
      [name, description]
    );
  }
  
  // Seed strategic indicators
  const indicators = [
    ['Sustentabilidade Operacional', 'Indicador de sustentabilidade das operações', '%'],
    ['Receita de Serviços', 'Total de receitas geradas pelos serviços', 'R$'],
    ['Matrículas em Educação', 'Número total de matrículas em cursos educacionais', 'unidades'],
    ['Indústrias Atendidas em Saúde', 'Número de indústrias atendidas pelos serviços de saúde', 'unidades'],
    ['Trabalhadores da Indústria Atendidos em Saúde', 'Número de trabalhadores atendidos em serviços de saúde', 'pessoas'],
    ['Matrículas Presenciais com Mais de 4 Horas', 'Matrículas em cursos presenciais com carga horária superior a 4 horas', 'unidades'],
    ['Custo Hora Aluno', 'Custo por hora de ensino por aluno', 'R$/hora']
  ];
  
  for (const [name, description, unit] of indicators) {
    await executeQuery(
      'IF NOT EXISTS (SELECT 1 FROM strategic_indicators WHERE name = @param0) INSERT INTO strategic_indicators (name, description, unit) VALUES (@param0, @param1, @param2)',
      [name, description, unit]
    );
  }
  
  // Create default admin user
  await executeQuery(
    `IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
     INSERT INTO users (username, password, name, email, role, active) 
     VALUES ('admin', '$2a$10$example.hash.for.admin.user.password', 'Administrador', 'admin@example.com', 'admin', 1)`
  );
  
  console.log('✅ Initial data seeded successfully');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupFabricDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setupFabricDatabase };