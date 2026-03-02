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

export const db = drizzle(pool, { schema });

export type Database = typeof db;

