import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import sql from 'mssql';
import * as schema from "@shared/schema";

// Create SQLite database for local development and testing
const sqlite = new Database('okr.db');
export const db = drizzle(sqlite, { schema });

// Microsoft Fabric SQL Server configuration (primary production database)
let mssqlPool: sql.ConnectionPool | null = null;
let mssqlDb: any = null;

if (process.env.MSSQL_USERNAME && process.env.MSSQL_PASSWORD) {
  const mssqlConfig: sql.config = {
    server: 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com',
    port: 1433,
    database: 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6',
    user: process.env.MSSQL_USERNAME,
    password: process.env.MSSQL_PASSWORD,
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

  mssqlPool = new sql.ConnectionPool(mssqlConfig);
  
  // Test Microsoft Fabric connection
  mssqlPool.connect()
    .then(() => {
      console.log('✓ Connected to Microsoft Fabric SQL Server');
      // TODO: Use MSSQL as primary database when connection is stable
    })
    .catch(err => {
      console.warn('⚠ Microsoft Fabric connection failed, using local SQLite:', err.message);
      mssqlPool = null;
    });
}

// For compatibility with existing code
export const pool = { 
  connectionString: 'sqlite:okr.db'
};

// Export SQL Server pool for potential future use
export const mssqlConnection = mssqlPool;