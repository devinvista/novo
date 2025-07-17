import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MySQL connection configuration for Replit
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'okr_db',
  ssl: false,
  timezone: '+00:00',
  acquireTimeout: 60000,
  timeout: 60000,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(mysqlConfig);

// Initialize connection and create database if needed
const initializeDatabase = async () => {
  try {
    // First, connect without specifying a database to create it if needed
    const tempConnection = await mysql.createConnection({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      password: mysqlConfig.password,
      ssl: mysqlConfig.ssl,
    });

    // Create database if it doesn't exist
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${mysqlConfig.database}\``);
    await tempConnection.end();

    // Test the pool connection
    const connection = await pool.getConnection();
    console.log('✓ Connected to MySQL database');
    connection.release();
    
    return pool;
  } catch (err) {
    console.error('✗ MySQL connection failed:', err);
    throw err;
  }
};

// Initialize the database connection
let dbInitialized = false;
const getDatabase = async () => {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
  return pool;
};

// Create Drizzle instance
export const db = drizzle(pool, { schema, mode: 'default' });

// Export the connection for direct queries if needed
export { pool, getDatabase };