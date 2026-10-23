import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./schema.js";

const { Pool } = pg;

export interface DatabaseClientOptions {
  connectionString?: string;
  pool?: pg.Pool;
  maxConnections?: number;
  ssl?: boolean | pg.PoolConfig["ssl"];
}

let defaultDbInstance: Kysely<Database> | null = null;
let defaultPoolInstance: pg.Pool | null = null;

export function redactConnectionString(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    if (parsed.password) {
      parsed.password = "REDACTED";
    }
    return parsed.toString();
  } catch {
    return "[REDACTED_CONNECTION_STRING]";
  }
}

/**
 * Creates or retrieves a Kysely Database instance with pooled PostgreSQL connections.
 * Compatible with local PostgreSQL 16 and Neon Serverless PostgreSQL.
 */
export function getKyselyDb(optionsOrConnStr?: string | DatabaseClientOptions): Kysely<Database> {
  const options: DatabaseClientOptions =
    typeof optionsOrConnStr === "string"
      ? { connectionString: optionsOrConnStr }
      : optionsOrConnStr ?? {};

  // If already initialized as default singleton without custom options
  if (!optionsOrConnStr && defaultDbInstance) {
    return defaultDbInstance;
  }

  const rawUrl =
    options.connectionString ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgrespassword@127.0.0.1:5432/contextual_dev";

  const isNeonServerless = rawUrl.includes("neon.tech") || rawUrl.includes("sslmode=require");

  const pool =
    options.pool ??
    new Pool({
      connectionString: rawUrl,
      max: options.maxConnections ?? (isNeonServerless ? 10 : 20),
      ssl: options.ssl ?? (isNeonServerless ? { rejectUnauthorized: false } : undefined),
    });

  const dialect = new PostgresDialect({
    pool,
  });

  const db = new Kysely<Database>({
    dialect,
  });

  // Observability event
  const redactedUrl = redactConnectionString(rawUrl);
  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event: "db.client.initialized",
        status: "INFO",
        database_url: redactedUrl,
        is_neon: isNeonServerless,
        timestamp: new Date().toISOString(),
      })
    );
  }

  if (!optionsOrConnStr) {
    defaultDbInstance = db;
    defaultPoolInstance = pool;
  }

  return db;
}

/**
 * Gracefully shuts down connection pools
 */
export async function closeKyselyDb(db?: Kysely<Database>): Promise<void> {
  if (db) {
    await db.destroy();
  } else if (defaultDbInstance) {
    await defaultDbInstance.destroy();
    defaultDbInstance = null;
    if (defaultPoolInstance) {
      await defaultPoolInstance.end();
      defaultPoolInstance = null;
    }
  }
}
