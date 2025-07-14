import sql from 'mssql';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Note: This file is now using hybrid storage with SQLite fallback
// The actual database connection is managed in hybrid-storage.ts

// Microsoft Fabric SQL Server configuration (primary database)
const mssqlConfig: sql.config = {
  server: 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com',
  port: 1433,
  database: 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6',
  user: process.env.MSSQL_USERNAME,
  password: process.env.MSSQL_PASSWORD,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.MSSQL_USERNAME,
      password: process.env.MSSQL_PASSWORD
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 15000,
  requestTimeout: 15000
};

// Create connection pool
export const pool = new sql.ConnectionPool(mssqlConfig);

// Initialize connection
let isConnected = false;

const connectToDatabase = async () => {
  if (!isConnected) {
    try {
      await pool.connect();
      isConnected = true;
      console.log('✓ Connected to Microsoft Fabric SQL Server');
    } catch (err) {
      console.error('✗ Database connection failed:', err);
      throw err;
    }
  }
  return pool;
};

// Initialize connection
connectToDatabase().catch(console.error);

// Create a custom database interface that works with Microsoft SQL Server
export const db = {
  async query(sql: string, params: any[] = []) {
    await connectToDatabase();
    const request = pool.request();
    
    // Add parameters to the request
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    
    return request.query(sql);
  },
  
  async execute(sql: string, params: any[] = []) {
    return this.query(sql, params);
  },
  
  // Add Drizzle-like interface for compatibility
  select: (fields: any) => ({
    from: (table: any) => ({
      where: (condition: any) => ({
        execute: async () => {
          // Convert to SQL Server query
          const tableName = table._.name;
          return this.query(`SELECT * FROM ${tableName}`);
        }
      }),
      execute: async () => {
        const tableName = table._.name;
        return this.query(`SELECT * FROM ${tableName}`);
      }
    })
  }),
  
  insert: (table: any) => ({
    values: (values: any) => ({
      execute: async () => {
        const tableName = table._.name;
        const columns = Object.keys(values).join(', ');
        const placeholders = Object.keys(values).map((_, i) => `@param${i}`).join(', ');
        const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
        return this.query(sql, Object.values(values));
      }
    })
  }),
  
  update: (table: any) => ({
    set: (values: any) => ({
      where: (condition: any) => ({
        execute: async () => {
          const tableName = table._.name;
          const setClause = Object.keys(values).map((key, i) => `${key} = @param${i}`).join(', ');
          const sql = `UPDATE ${tableName} SET ${setClause}`;
          return this.query(sql, Object.values(values));
        }
      })
    })
  }),
  
  delete: (table: any) => ({
    where: (condition: any) => ({
      execute: async () => {
        const tableName = table._.name;
        const sql = `DELETE FROM ${tableName}`;
        return this.query(sql);
      }
    })
  })
};