import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// PostgreSQL connection
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
export const db = drizzle(sql, { schema });

// Initialize the database connection
const initializeDatabase = async () => {
  try {
    // Test connection
    await sql`SELECT 1`;
    console.log('✓ Connected to PostgreSQL database');
    return true;
  } catch (err) {
    console.error('✗ Database connection failed:', err);
    throw err;
  }
};

// Initialize connection
initializeDatabase();

// Export the connection for direct queries if needed
export { sql as connection };