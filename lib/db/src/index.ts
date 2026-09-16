import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Lazy singletons — DATABASE_URL is only required at runtime, not at build time.
let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
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
