import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/pg-schema';

const connectionUrl = process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const isProd = process.env.NODE_ENV === 'production';

const client = postgres(connectionUrl, {
  ssl: connectionUrl.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : undefined,
  max: isProd ? 20 : 10,
  idle_timeout: 30,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  onnotice: () => {},
});

export const db = drizzle(client, { schema });

export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    if (!isProd) console.log('✓ Connected to PostgreSQL database');
    return true;
  } catch (err) {
    console.error('✗ PostgreSQL connection failed:', err);
    throw err;
  }
}
