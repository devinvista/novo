import { connectToFabric, executeQuery } from './fabric-storage';
import { readFileSync } from 'fs';
import { join } from 'path';
import Database from "better-sqlite3";

// Initialize SQLite for data migration
const db = new Database("okr.db");
db.pragma("journal_mode = WAL");

async function setupFabricDatabase() {
  console.log('🚀 Setting up Microsoft Fabric SQL Server database...');
  
  try {
    // Test connection
    const isConnected = await connectToFabric();
    if (!isConnected) {
      throw new Error('Failed to connect to Microsoft Fabric SQL Server');
    }
    
    console.log('✅ Connected to Microsoft Fabric SQL Server');
    
    // Create schema
    await createFabricSchema();
    
    // Seed reference data
    await seedReferenceData();
    
    // Migrate existing data
    await migrateSQLiteData();
    
    console.log('🎉 Microsoft Fabric database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to setup Microsoft Fabric database:', error.message);
    throw error;
  }
}

async function createFabricSchema() {
  console.log('📋 Creating Microsoft Fabric schema...');
  
  const schemaPath = join(process.cwd(), 'server', 'fabric-schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  
  // Split schema into individual statements
  const statements = schema.split(/;\s*(?=CREATE|DROP|INSERT|IF)/i)
    .filter(stmt => stmt.trim().length > 0)
    .map(stmt => stmt.trim());
  
  for (const statement of statements) {
    if (statement.length > 0) {
      try {
        await executeQuery(statement);
        console.log(`✅ Schema: ${statement.substring(0, 50)}...`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error(`❌ Schema error: ${error.message}`);
          console.error(`Statement: ${statement}`);
        }
      }
    }
  }
}

async function seedReferenceData() {
  console.log('🌱 Seeding reference data...');
  
  try {
    // Seed regions
    const regions = [
      { name: 'Central', code: 'CEN', description: 'Região Central' },
      { name: 'Metropolitana', code: 'MET', description: 'Região Metropolitana' },
      { name: 'Norte', code: 'NOR', description: 'Região Norte' },
      { name: 'Sul', code: 'SUL', description: 'Região Sul' },
      { name: 'Leste', code: 'LES', description: 'Região Leste' },
      { name: 'Oeste', code: 'OES', description: 'Região Oeste' },
      { name: 'Nordeste', code: 'NES', description: 'Região Nordeste' },
      { name: 'Sudeste', code: 'SES', description: 'Região Sudeste' },
      { name: 'Sudoeste', code: 'SOS', description: 'Região Sudoeste' },
      { name: 'Noroeste', code: 'NOS', description: 'Região Noroeste' },
      { name: 'Interior', code: 'INT', description: 'Região Interior' }
    ];
    
    for (const region of regions) {
      await executeQuery(`
        INSERT INTO dbo.regions (name, code, description, created_at)
        VALUES (?, ?, ?, GETDATE())
      `, [region.name, region.code, region.description]);
    }
    
    // Seed sub-regions
    const subRegions = [
      { name: 'Porto Alegre', code: 'POA', description: 'Porto Alegre', region_id: 2 },
      { name: 'Canoas', code: 'CAN', description: 'Canoas', region_id: 2 },
      { name: 'Novo Hamburgo', code: 'NH', description: 'Novo Hamburgo', region_id: 2 },
      { name: 'São Leopoldo', code: 'SL', description: 'São Leopoldo', region_id: 2 },
      { name: 'Gravataí', code: 'GRA', description: 'Gravataí', region_id: 2 },
      { name: 'Viamão', code: 'VIA', description: 'Viamão', region_id: 2 },
      { name: 'Alvorada', code: 'ALV', description: 'Alvorada', region_id: 2 },
      { name: 'Cachoeirinha', code: 'CAC', description: 'Cachoeirinha', region_id: 2 },
      { name: 'Esteio', code: 'EST', description: 'Esteio', region_id: 2 },
      { name: 'Sapucaia do Sul', code: 'SAS', description: 'Sapucaia do Sul', region_id: 2 },
      { name: 'Caxias do Sul', code: 'CXS', description: 'Caxias do Sul', region_id: 4 },
      { name: 'Pelotas', code: 'PEL', description: 'Pelotas', region_id: 4 },
      { name: 'Santa Maria', code: 'SM', description: 'Santa Maria', region_id: 1 },
      { name: 'Passo Fundo', code: 'PF', description: 'Passo Fundo', region_id: 3 },
      { name: 'Uruguaiana', code: 'URU', description: 'Uruguaiana', region_id: 6 },
      { name: 'Bagé', code: 'BAG', description: 'Bagé', region_id: 4 },
      { name: 'Rio Grande', code: 'RG', description: 'Rio Grande', region_id: 4 },
      { name: 'Santa Cruz do Sul', code: 'SCS', description: 'Santa Cruz do Sul', region_id: 1 },
      { name: 'Lajeado', code: 'LAJ', description: 'Lajeado', region_id: 1 },
      { name: 'Erechim', code: 'ERE', description: 'Erechim', region_id: 3 },
      { name: 'Ijuí', code: 'IJU', description: 'Ijuí', region_id: 10 }
    ];
    
    for (const subRegion of subRegions) {
      await executeQuery(`
        INSERT INTO dbo.sub_regions (name, code, description, region_id, created_at)
        VALUES (?, ?, ?, ?, GETDATE())
      `, [subRegion.name, subRegion.code, subRegion.description, subRegion.region_id]);
    }
    
    // Seed solutions
    const solutions = [
      { name: 'Educação', description: 'Soluções educacionais para a indústria' },
      { name: 'Saúde', description: 'Soluções de saúde e segurança do trabalho' }
    ];
    
    for (const solution of solutions) {
      await executeQuery(`
        INSERT INTO dbo.solutions (name, description, created_at)
        VALUES (?, ?, GETDATE())
      `, [solution.name, solution.description]);
    }
    
    // Seed service lines
    const serviceLines = [
      { name: 'Educação Básica', description: 'Educação básica para trabalhadores', solution_id: 1 },
      { name: 'Educação Profissional', description: 'Educação profissional e técnica', solution_id: 1 },
      { name: 'Educação Superior', description: 'Educação superior e graduação', solution_id: 1 },
      { name: 'Atividade Física', description: 'Programas de atividade física', solution_id: 2 },
      { name: 'Alimentação', description: 'Programas de alimentação saudável', solution_id: 2 },
      { name: 'Saúde Ocupacional', description: 'Saúde e segurança do trabalho', solution_id: 2 },
      { name: 'Promoção da Saúde', description: 'Promoção da saúde e prevenção', solution_id: 2 },
      { name: 'Reabilitação', description: 'Reabilitação e fisioterapia', solution_id: 2 },
      { name: 'Odontologia', description: 'Serviços odontológicos', solution_id: 2 },
      { name: 'Medicina do Trabalho', description: 'Medicina do trabalho', solution_id: 2 },
      { name: 'Psicologia', description: 'Serviços psicológicos', solution_id: 2 },
      { name: 'Nutrição', description: 'Orientação nutricional', solution_id: 2 },
      { name: 'Enfermagem', description: 'Serviços de enfermagem', solution_id: 2 },
      { name: 'Laboratório', description: 'Exames laboratoriais', solution_id: 2 },
      { name: 'Radiologia', description: 'Exames radiológicos', solution_id: 2 }
    ];
    
    for (const serviceLine of serviceLines) {
      await executeQuery(`
        INSERT INTO dbo.service_lines (name, description, solution_id, created_at)
        VALUES (?, ?, ?, GETDATE())
      `, [serviceLine.name, serviceLine.description, serviceLine.solution_id]);
    }
    
    // Seed strategic indicators
    const strategicIndicators = [
      { name: 'Sustentabilidade Operacional', description: 'Indicador de sustentabilidade operacional', category: 'Operacional' },
      { name: 'Receita de Serviços', description: 'Indicador de receita de serviços', category: 'Financeiro' },
      { name: 'Matrículas em Educação', description: 'Indicador de matrículas em educação', category: 'Educação' },
      { name: 'Indústrias Atendidas em Saúde', description: 'Indicador de indústrias atendidas em saúde', category: 'Saúde' },
      { name: 'Trabalhadores da Indústria Atendidos em Saúde', description: 'Indicador de trabalhadores atendidos em saúde', category: 'Saúde' },
      { name: 'Matrículas Presenciais com Mais de 4 Horas', description: 'Indicador de matrículas presenciais com mais de 4 horas', category: 'Educação' },
      { name: 'Custo Hora Aluno', description: 'Indicador de custo por hora aluno', category: 'Financeiro' }
    ];
    
    for (const indicator of strategicIndicators) {
      await executeQuery(`
        INSERT INTO dbo.strategic_indicators (name, description, category, created_at)
        VALUES (?, ?, ?, GETDATE())
      `, [indicator.name, indicator.description, indicator.category]);
    }
    
    console.log('✅ Reference data seeded successfully');
    
  } catch (error) {
    console.error('❌ Error seeding reference data:', error.message);
  }
}

async function migrateSQLiteData() {
  console.log('🔄 Migrating existing SQLite data to Microsoft Fabric...');
  
  try {
    // Migrate users
    const users = db.prepare('SELECT * FROM users').all();
    console.log(`📊 Migrating ${users.length} users...`);
    
    for (const user of users) {
      await executeQuery(`
        INSERT INTO dbo.users (username, password, email, name, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user.username,
        user.password,
        user.email,
        user.name,
        user.role,
        user.created_at,
        user.updated_at
      ]);
    }
    
    // Migrate objectives
    const objectives = db.prepare('SELECT * FROM objectives').all();
    console.log(`🎯 Migrating ${objectives.length} objectives...`);
    
    for (const objective of objectives) {
      await executeQuery(`
        INSERT INTO dbo.objectives (title, description, owner_id, region_id, sub_region_id, start_date, end_date, status, progress, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        objective.title,
        objective.description,
        objective.owner_id,
        objective.region_id,
        objective.sub_region_id,
        objective.start_date,
        objective.end_date,
        objective.status,
        objective.progress,
        objective.created_at,
        objective.updated_at
      ]);
    }
    
    // Migrate key results
    const keyResults = db.prepare('SELECT * FROM key_results').all();
    console.log(`🔑 Migrating ${keyResults.length} key results...`);
    
    for (const keyResult of keyResults) {
      await executeQuery(`
        INSERT INTO dbo.key_results (objective_id, title, description, number, service_line_id, service_id, initial_value, target_value, current_value, unit, frequency, start_date, end_date, progress, status, strategic_indicator_ids, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        keyResult.objective_id,
        keyResult.title,
        keyResult.description,
        keyResult.number,
        keyResult.service_line_id,
        keyResult.service_id,
        keyResult.initial_value,
        keyResult.target_value,
        keyResult.current_value,
        keyResult.unit,
        keyResult.frequency,
        keyResult.start_date,
        keyResult.end_date,
        keyResult.progress,
        keyResult.status,
        keyResult.strategic_indicator_ids,
        keyResult.created_at,
        keyResult.updated_at
      ]);
    }
    
    // Migrate actions
    const actions = db.prepare('SELECT * FROM actions').all();
    console.log(`⚡ Migrating ${actions.length} actions...`);
    
    for (const action of actions) {
      await executeQuery(`
        INSERT INTO dbo.actions (key_result_id, title, description, responsible_id, priority, status, due_date, completed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        action.key_result_id,
        action.title,
        action.description,
        action.responsible_id,
        action.priority,
        action.status,
        action.due_date,
        action.completed_at,
        action.created_at,
        action.updated_at
      ]);
    }
    
    // Migrate checkpoints
    const checkpoints = db.prepare('SELECT * FROM checkpoints').all();
    console.log(`📊 Migrating ${checkpoints.length} checkpoints...`);
    
    for (const checkpoint of checkpoints) {
      await executeQuery(`
        INSERT INTO dbo.checkpoints (key_result_id, period, target_value, actual_value, progress, status, notes, completed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        checkpoint.key_result_id,
        checkpoint.period,
        checkpoint.target_value,
        checkpoint.actual_value,
        checkpoint.progress,
        checkpoint.status,
        checkpoint.notes,
        checkpoint.completed_at,
        checkpoint.created_at,
        checkpoint.updated_at
      ]);
    }
    
    // Migrate activities
    const activities = db.prepare('SELECT * FROM activities').all();
    console.log(`📝 Migrating ${activities.length} activities...`);
    
    for (const activity of activities) {
      await executeQuery(`
        INSERT INTO dbo.activities (user_id, entity_type, entity_id, action, description, old_values, new_values, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        activity.user_id,
        activity.entity_type,
        activity.entity_id,
        activity.action,
        activity.description,
        activity.old_values,
        activity.new_values,
        activity.created_at
      ]);
    }
    
    console.log('✅ Data migration completed successfully');
    
  } catch (error) {
    console.error('❌ Error migrating data:', error.message);
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupFabricDatabase()
    .then(() => {
      console.log('🎉 Microsoft Fabric database setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error.message);
      process.exit(1);
    });
}

export { setupFabricDatabase };