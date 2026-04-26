/**
 * Rate limit distribuído via PostgreSQL.
 *
 * Substitui o store em memória do `express-rate-limit`, permitindo que
 * múltiplas réplicas do servidor compartilhem o mesmo contador de requisições.
 *
 * Usa a tabela `rate_limit_store` (criada automaticamente na primeira chamada).
 * Utiliza o mesmo driver `pg` já presente para o store de sessão.
 */
import type { Store, Options, IncrementResponse } from "express-rate-limit";
import pg from "pg";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS rate_limit_store (
    key        TEXT        NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    count      INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (key, window_end)
  );
  CREATE INDEX IF NOT EXISTS idx_rls_window_end ON rate_limit_store (window_end);
`;

function buildPool(): pg.Pool {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
    max: 3,
    idleTimeoutMillis: 10_000,
  });
  pool.on("error", (err) => {
    console.error("[PgRateLimitStore] idle client error (recovered):", err?.message ?? err);
  });
  return pool;
}

export class PgRateLimitStore implements Store {
  private windowMs: number;
  private pool: pg.Pool;
  private tableReady = false;

  constructor(options?: { windowMs?: number }) {
    this.windowMs = options?.windowMs ?? 15 * 60 * 1000;
    this.pool = buildPool();
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    this.ensureTable().catch((err) =>
      console.error("[PgRateLimitStore] Falha ao criar tabela:", err)
    );
  }

  private async ensureTable(): Promise<void> {
    if (this.tableReady) return;
    try {
      await this.pool.query(CREATE_TABLE_SQL);
    } catch (err: any) {
      // Ignora erro de objeto já existente (código 42P07 = "relation already exists")
      // Pode ocorrer com criação concorrente entre múltiplas instâncias do store.
      if (err?.code !== "42P07" && err?.code !== "23505") throw err;
    }
    this.tableReady = true;
  }

  private windowEnd(): string {
    return new Date(
      Math.ceil(Date.now() / this.windowMs) * this.windowMs
    ).toISOString();
  }

  async increment(key: string): Promise<IncrementResponse> {
    await this.ensureTable();
    const windowEnd = this.windowEnd();
    const { rows } = await this.pool.query<{ count: string; window_end: string }>(
      `INSERT INTO rate_limit_store (key, window_end, count)
         VALUES ($1, $2, 1)
       ON CONFLICT (key, window_end)
       DO UPDATE SET count = rate_limit_store.count + 1
       RETURNING count, window_end`,
      [key, windowEnd]
    );
    return {
      totalHits: parseInt(rows[0].count, 10),
      resetTime: new Date(rows[0].window_end),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.ensureTable();
    await this.pool.query(
      `UPDATE rate_limit_store
          SET count = GREATEST(count - 1, 0)
        WHERE key = $1 AND window_end = $2`,
      [key, this.windowEnd()]
    );
  }

  async resetKey(key: string): Promise<void> {
    await this.ensureTable();
    await this.pool.query(`DELETE FROM rate_limit_store WHERE key = $1`, [key]);
  }

  /** Remove entradas de janelas expiradas. */
  async cleanup(): Promise<void> {
    await this.ensureTable();
    await this.pool.query(`DELETE FROM rate_limit_store WHERE window_end < NOW()`);
  }
}
