import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Lazy singletons — DATABASE_URL is only required at runtime, not at build time.
let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function normalizeDatabaseUrl(url: string): string {
  if (url.includes("db.pwhmljruumktzdmihpsr.supabase.co")) {
    return url.replace(
      /postgres:Drainwatch_6781@db\.pwhmljruumktzdmihpsr\.supabase\.co(:\d+)?/,
      "postgres.pwhmljruumktzdmihpsr:Drainwatch_6781@aws-0-ap-southeast-1.pooler.supabase.com:6543",
    );
  }
  return url;
}

function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
    _pool = new Pool({
      connectionString,
      // Supabase requires SSL — rejectUnauthorized:false accepts the self-signed cert
      ssl: { rejectUnauthorized: false },
    });
  }
  return _pool;
}

export const pool: pg.Pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return (getPool() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_target, prop) {
      if (!_db) {
        _db = drizzle(getPool(), { schema });
      }
      return (_db as unknown as Record<string | symbol, unknown>)[prop];
    },
  },
);

export * from "./schema";
