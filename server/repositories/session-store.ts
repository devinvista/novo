import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';

const PgSession = connectPgSimple(session);

const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 5,
  idleTimeoutMillis: 10_000,
});

sessionPool.on('error', (err) => {
  console.error('[sessionPool] idle client error (recovered):', err?.message ?? err);
});

export const sessionStore = new PgSession({
  pool: sessionPool,
  tableName: 'session',
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 15,
});
