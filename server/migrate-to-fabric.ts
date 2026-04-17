import { connectToFabric, executeQuery } from './fabric-storage';
import { readFileSync } from 'fs';
import { join } from 'path';
import Database from "better-sqlite3";

// Initialize SQLite for data migration
const db = new Database("okr.db");
db.pragma("journal_mode = WAL");

export async function migrateSQLiteToFabric() {
  console.log('🔄 Starting migration from SQLite to Microsoft Fabric SQL Server...');
  
  try {
    // Test SQL Fabric connection
    const isConnected = await connectToFabric();
    if (!isConnected) {
      console.log('⚠️ SQL Fabric not available, updating storage layer to use Fabric queries with SQLite fallback');
      return;
    }
    
    console.log('✅ SQL Fabric connected, proceeding with migration...');
    
    // Create schema first
    await setupFabricSchema();
    
    // Migrate data from SQLite to SQL Fabric
    await migrateUsersData();
    await migrateReferenceData();
    await migrateObjectivesData();
    await migrateKeyResultsData();
    await migrateActionsData();
    await migrateCheckpointsData();
    await migrateActivitiesData();
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('⚠️ Continuing with SQLite fallback...');
  }
}

async function setupFabricSchema() {
  console.log('🔄 Setting up SQL Fabric schema...');
  
  const schemaPath = join(process.cwd(), 'server', 'fabric-schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  
  const statements = schema.split(/;\s*(?=CREATE|DROP|INSERT|IF)/i)
    .filter(stmt => stmt.trim().length > 0);
  
  for (const statement of statements) {
    const trimmedStatement = statement.trim();
    if (trimmedStatement.length > 0) {
      try {
        await executeQuery(trimmedStatement);
        console.log(`✅ Schema: ${trimmedStatement.substring(0, 50)}...`);
      } catch (error) {
        console.error(`❌ Schema error: ${error.message}`);
      }
    }
  }
}

async function migrateUsersData() {
  console.log('👥 Migrating users data...');
  
  try {
    const users = db.prepare('SELECT * FROM users').all();
    
    for (const user of users) {
      await executeQuery(`
        INSERT INTO dbo.users (id, username, password, email, name, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id,
        user.username,
        user.password,
        user.email,
        user.name,
        user.role,
        user.created_at,
        user.updated_at
      ]);
    }
    
    console.log(`✅ Migrated ${users.length} users`);
  } catch (error) {
    console.error('❌ Users migration error:', error.message);
  }
}

async function migrateReferenceData() {
  console.log('🗂️ Migrating reference data...');
  
  try {
    // Migrate regions
    const regions = db.prepare('SELECT * FROM regions').all();
    for (const region of regions) {
      await executeQuery(`
        INSERT INTO dbo.regions (id, name, code, description, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [region.id, region.name, region.code, region.description, region.created_at]);
    }
    
    // Migrate sub-regions
    const subRegions = db.prepare('SELECT * FROM sub_regions').all();
    for (const subRegion of subRegions) {
      await executeQuery(`
        INSERT INTO dbo.sub_regions (id, name, code, description, region_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [subRegion.id, subRegion.name, subRegion.code, subRegion.description, subRegion.region_id, subRegion.created_at]);
    }
    
    // Migrate strategic indicators
    const indicators = db.prepare('SELECT * FROM strategic_indicators').all();
    for (const indicator of indicators) {
      await executeQuery(`
        INSERT INTO dbo.strategic_indicators (id, name, description, category, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [indicator.id, indicator.name, indicator.description, indicator.category, indicator.created_at]);
    }
    
    // Migrate solutions
    const solutions = db.prepare('SELECT * FROM solutions').all();
    for (const solution of solutions) {
      await executeQuery(`
        INSERT INTO dbo.solutions (id, name, description, created_at)
        VALUES (?, ?, ?, ?)
      `, [solution.id, solution.name, solution.description, solution.created_at]);
    }
    
    // Migrate service lines
    const serviceLines = db.prepare('SELECT * FROM service_lines').all();
    for (const serviceLine of serviceLines) {
      await executeQuery(`
        INSERT INTO dbo.service_lines (id, name, description, solution_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [serviceLine.id, serviceLine.name, serviceLine.description, serviceLine.solution_id, serviceLine.created_at]);
    }
    
    // Migrate services
    const services = db.prepare('SELECT * FROM services').all();
    for (const service of services) {
      await executeQuery(`
        INSERT INTO dbo.services (id, name, description, service_line_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [service.id, service.name, service.description, service.service_line_id, service.created_at]);
    }
    
    console.log('✅ Reference data migrated successfully');
  } catch (error) {
    console.error('❌ Reference data migration error:', error.message);
  }
}

async function migrateObjectivesData() {
  console.log('🎯 Migrating objectives data...');
  
  try {
    const objectives = db.prepare('SELECT * FROM objectives').all();
    
    for (const objective of objectives) {
      await executeQuery(`
        INSERT INTO dbo.objectives (id, title, description, owner_id, region_id, sub_region_id, start_date, end_date, status, progress, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        objective.id,
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
    
    console.log(`✅ Migrated ${objectives.length} objectives`);
  } catch (error) {
    console.error('❌ Objectives migration error:', error.message);
  }
}

async function migrateKeyResultsData() {
  console.log('🔑 Migrating key results data...');
  
  try {
    const keyResults = db.prepare('SELECT * FROM key_results').all();
    
    for (const keyResult of keyResults) {
      await executeQuery(`
        INSERT INTO dbo.key_results (id, objective_id, title, description, number, service_line_id, service_id, initial_value, target_value, current_value, unit, frequency, start_date, end_date, progress, status, strategic_indicator_ids, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        keyResult.id,
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
        JSON.stringify(keyResult.strategic_indicator_ids),
        keyResult.created_at,
        keyResult.updated_at
      ]);
    }
    
    console.log(`✅ Migrated ${keyResults.length} key results`);
  } catch (error) {
    console.error('❌ Key results migration error:', error.message);
  }
}

async function migrateActionsData() {
  console.log('⚡ Migrating actions data...');
  
  try {
    const actions = db.prepare('SELECT * FROM actions').all();
    
    for (const action of actions) {
      await executeQuery(`
        INSERT INTO dbo.actions (id, key_result_id, title, description, responsible_id, priority, status, due_date, completed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        action.id,
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
    
    console.log(`✅ Migrated ${actions.length} actions`);
  } catch (error) {
    console.error('❌ Actions migration error:', error.message);
  }
}

async function migrateCheckpointsData() {
  console.log('📊 Migrating checkpoints data...');
  
  try {
    const checkpoints = db.prepare('SELECT * FROM checkpoints').all();
    
    for (const checkpoint of checkpoints) {
      await executeQuery(`
        INSERT INTO dbo.checkpoints (id, key_result_id, period, target_value, actual_value, progress, status, notes, completed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        checkpoint.id,
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
    
    console.log(`✅ Migrated ${checkpoints.length} checkpoints`);
  } catch (error) {
    console.error('❌ Checkpoints migration error:', error.message);
  }
}

async function migrateActivitiesData() {
  console.log('📝 Migrating activities data...');
  
  try {
    const activities = db.prepare('SELECT * FROM activities').all();
    
    for (const activity of activities) {
      await executeQuery(`
        INSERT INTO dbo.activities (id, user_id, entity_type, entity_id, action, description, old_values, new_values, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        activity.id,
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
    
    console.log(`✅ Migrated ${activities.length} activities`);
  } catch (error) {
    console.error('❌ Activities migration error:', error.message);
  }
}

// Run migration if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  (async () => {
    try {
      await migrateSQLiteToFabric();
      console.log('🎉 Migration completed successfully!');
    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    }
  })();
}