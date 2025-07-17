import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// SQLite database configuration for Replit
const sqlite = new Database('okr.db');

// Create Drizzle instance with SQLite
export const db = drizzle(sqlite, { schema });

// Initialize the database connection
const initializeDatabase = () => {
  try {
    console.log('✓ Connected to SQLite database');
    return true;
  } catch (err) {
    console.error('✗ SQLite connection failed:', err);
    throw err;
  }
};

// Initialize connection
initializeDatabase();

// Export the connection for direct queries if needed
export { sqlite };