import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import sql from 'mssql';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// PostgreSQL connection (primary database for now)
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Microsoft Fabric SQL Server configuration (secondary for migration)
let mssqlPool: sql.ConnectionPool | null = null;

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
    })
    .catch(err => {
      console.warn('⚠ Microsoft Fabric connection failed, using PostgreSQL:', err.message);
      mssqlPool = null;
    });
}

// Export SQL Server pool for potential future use
export const mssqlConnection = mssqlPool;