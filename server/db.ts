import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";

// For Replit compatibility, using SQLite with MySQL-compatible schema
// This provides the same functionality with MySQL table structure
const sqlite = new Database('./server/okr_mysql.db');

// Enable foreign keys for SQLite
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Initialize the database connection
const initializeDatabase = async () => {
  try {
    // Test connection
    sqlite.prepare('SELECT 1').get();
    console.log('✓ Connected to SQLite database with MySQL schema');
    return true;
  } catch (err) {
    console.error('✗ Database connection failed:', err);
    throw err;
  }
};

// Initialize connection
initializeDatabase();

// Export the connection for direct queries if needed
export { sqlite as connection };