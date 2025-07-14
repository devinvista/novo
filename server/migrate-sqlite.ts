import { db } from './db.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

async function migrateSQLite() {
  console.log('🔄 Creating SQLite tables...');
  
  try {
    // Create tables using raw SQL since we're converting from PostgreSQL
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'operacional',
        region_id INTEGER REFERENCES regions(id),
        sub_region_id INTEGER REFERENCES sub_regions(id),
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE
      )`,
      
      `CREATE TABLE IF NOT EXISTS sub_regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        region_id INTEGER NOT NULL REFERENCES regions(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS solutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS service_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        solution_id INTEGER NOT NULL REFERENCES solutions(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        service_line_id INTEGER NOT NULL REFERENCES service_lines(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS strategic_indicators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        unit TEXT,
        active INTEGER NOT NULL DEFAULT 1
      )`,
      
      `CREATE TABLE IF NOT EXISTS objectives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL REFERENCES users(id),
        region_id INTEGER REFERENCES regions(id),
        sub_region_id INTEGER REFERENCES sub_regions(id),
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        progress REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS key_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        objective_id INTEGER NOT NULL REFERENCES objectives(id),
        title TEXT NOT NULL,
        description TEXT,
        number INTEGER NOT NULL,
        strategic_indicator_ids TEXT,
        service_line_id INTEGER REFERENCES service_lines(id),
        service_id INTEGER REFERENCES services(id),
        initial_value REAL NOT NULL,
        target_value REAL NOT NULL,
        current_value REAL DEFAULT 0,
        unit TEXT,
        frequency TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        progress REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_result_id INTEGER NOT NULL REFERENCES key_results(id),
        title TEXT NOT NULL,
        description TEXT,
        number INTEGER NOT NULL,
        strategic_indicator_id INTEGER REFERENCES strategic_indicators(id),
        responsible_id INTEGER REFERENCES users(id),
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'medium',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_result_id INTEGER NOT NULL REFERENCES key_results(id),
        period TEXT NOT NULL,
        target_value REAL NOT NULL,
        actual_value REAL,
        progress REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pendente',
        notes TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        old_values TEXT,
        new_values TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Execute table creation queries
    for (const tableSQL of tables) {
      await db.run(tableSQL);
    }

    console.log('✅ SQLite tables created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating SQLite tables:', error);
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSQLite()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default migrateSQLite;