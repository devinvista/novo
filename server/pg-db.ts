import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/pg-schema';

const connectionUrl = postgresql://neondb_owner:npg_QqoTzSpN1wr9@ep-delicate-wave-acdednnh-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
 || process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionUrl, {
  ssl: connectionUrl.includes('sslmode=require') ? 'require' : undefined,
  max: 10,
});

export const db = drizzle(client, { schema });

export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    console.log('✓ Connected to PostgreSQL database');
    return true;
  } catch (err) {
    console.error('✗ PostgreSQL connection failed:', err);
    throw err;
  }
}
