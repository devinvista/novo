import { db } from './db';
import { sql } from 'drizzle-orm';

async function addManagerFields() {
  try {
    // Add new columns for manager and approval system
    await db.run(sql`ALTER TABLE users ADD COLUMN gestor_id INTEGER REFERENCES users(id)`);
    await db.run(sql`ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 0`);
    await db.run(sql`ALTER TABLE users ADD COLUMN approved_at TEXT`);
    await db.run(sql`ALTER TABLE users ADD COLUMN approved_by INTEGER REFERENCES users(id)`);
    
    // Update existing users to be approved by default (except new ones)
    await db.run(sql`UPDATE users SET approved = 1 WHERE approved IS NULL OR approved = 0`);
    
    console.log('✅ Successfully added manager and approval fields to users table');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Fields already exist, skipping migration');
    } else {
      console.error('Error adding manager fields:', error);
    }
  }
}

addManagerFields();