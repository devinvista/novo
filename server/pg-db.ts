import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/pg-schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_URL.includes('sslmode=require') ? 'require' : undefined,
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
