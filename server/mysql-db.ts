import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

// MySQL connection configuration
const connectionConfig = {
  host: process.env.MYSQL_HOST!,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USERNAME!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!,
  multipleStatements: true,
};

// Create MySQL connection pool
const pool = mysql.createPool({
  ...connectionConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create Drizzle instance
export const db = drizzle(pool, { schema, mode: 'default' });

// Initialize the database connection
const initializeDatabase = async () => {
  try {
    // Test connection
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    console.log('✓ Connected to MySQL database');
    return true;
  } catch (err) {
    console.error('✗ MySQL connection failed:', err);
    throw err;
  }
};

// Initialize connection
initializeDatabase();

// Export the pool for direct queries if needed
export { pool as connection };