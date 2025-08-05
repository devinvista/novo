import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/mysql-schema";

// MySQL connection configuration
const connectionConfig = {
  host: process.env.MYSQL_HOST || 'srv1661.hstgr.io',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USERNAME || 'u905571261_okr',
  password: process.env.MYSQL_PASSWORD || 'Okr2025$',
  database: process.env.MYSQL_DATABASE || 'u905571261_okr',
  multipleStatements: true,
};

console.log('Connecting to MySQL database at:', `${connectionConfig.host}:${connectionConfig.port}`);

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