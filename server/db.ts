import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// SQLite database configuration for Replit
const databasePath = process.env.DATABASE_PATH || './okr.db';

// Create SQLite database connection
const sqlite = new Database(databasePath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Initialize the database connection
const initializeDatabase = async () => {
  try {
    // Test connection
    sqlite.prepare('SELECT 1').get();
    console.log('✓ Connected to SQLite database');
    console.log(`📁 Database file: ${databasePath}`);
    return true;
  } catch (err) {
    console.error('✗ SQLite connection failed:', err);
    throw err;
  }
};

// Initialize connection
initializeDatabase();

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Export the connection for direct queries if needed
export { sqlite };