import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema.js";
import { logger } from "../utils/logger.js";

function normalizeDatabaseUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  const sslMode = parsed.searchParams.get("sslmode");
  const useLibpqCompat = parsed.searchParams.get("uselibpqcompat");

  // pg/pg-connection-string compatibility behavior changed for sslmode=require.
  // Railway-style URLs often rely on libpq-compatible "require" semantics.
  if (sslMode === "require" && useLibpqCompat !== "true") {
    parsed.searchParams.set("uselibpqcompat", "true");
    logger.warn(
      "DATABASE_URL had sslmode=require without uselibpqcompat=true; enabling libpq compatibility to avoid self-signed TLS failures."
    );
  }

  return parsed.toString();
}

export const pool = new Pool({
  connectionString: normalizeDatabaseUrl(env.DATABASE_URL),
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
  query_timeout: 10_000
});

const database = drizzle(pool, { schema });
const transactionScope = new AsyncLocalStorage<typeof database>();
// Service calls in withTransaction share the same connection, including audit writes.
export const db: typeof database = new Proxy(database, {
  get(target, property) {
    const active = transactionScope.getStore() ?? target;
    const value = Reflect.get(active, property);
    return typeof value === "function" ? value.bind(active) : value;
  }
});
export async function withTransaction<T>(work: () => Promise<T>): Promise<T> {
  if (transactionScope.getStore()) return work();
  return database.transaction((tx) => transactionScope.run(tx as unknown as typeof database, work));
}

export type Database = typeof db;

