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
});

export const sessionStore = new PgSession({
  pool: sessionPool,
  tableName: 'session',
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 15,
});
