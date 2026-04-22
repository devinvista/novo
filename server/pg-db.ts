import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/pg-schema';
import { env, isProd } from './config/env';

const connectionUrl = env.DATABASE_URL;
const wantsSsl = connectionUrl.includes('sslmode=');

function buildSslOptions() {
  if (!wantsSsl) return undefined;
  // Production: require validated SSL by default. Allow override via PG_SSL_REJECT_UNAUTHORIZED=false.
  // Dev: allow self-signed cert chains by default.
  const rejectUnauthorized = isProd ? env.PG_SSL_REJECT_UNAUTHORIZED : false;
  return {
    rejectUnauthorized,
    ...(env.PG_SSL_CA ? { ca: env.PG_SSL_CA } : {}),
  } as const;
}

const client = postgres(connectionUrl, {
  ssl: buildSslOptions(),
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
