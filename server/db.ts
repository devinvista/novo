// Re-export SQLite database connection for Replit environment
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SQLite database file path
const dbPath = join(__dirname, 'okr.db');

console.log('Connecting to SQLite database at:', dbPath);

// Create or connect to SQLite database
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = on');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

console.log('✓ Connected to SQLite database');

// Export the connection for direct queries if needed
export { sqlite as connection };