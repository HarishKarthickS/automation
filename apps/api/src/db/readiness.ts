import { readFileSync } from "node:fs";
import { pool, db } from "./client.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const journal = JSON.parse(readFileSync("./drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ when: number }> };
export const requiredSchema = Math.max(...journal.entries.map((entry) => entry.when));
export async function migrateDatabase() {
  const lock = await pool.connect();
  try { await lock.query("select pg_advisory_lock(7081342)"); await migrate(db, { migrationsFolder: "./drizzle" }); }
  finally { try { await lock.query("select pg_advisory_unlock(7081342)"); } finally { lock.release(); } }
}
export async function assertSchemaReady() {
  const result = await pool.query<{ version: string | null }>('select max(created_at)::text AS version from drizzle.__drizzle_migrations');
  if (Number(result.rows[0]?.version ?? 0) < requiredSchema) throw new Error("Database migrations are required before this release can serve requests");
  await pool.query('select r.lease_token, r.admitted_at, s.key_id, u.execution_approved from runs r, automation_secrets s, "user" u limit 0');
}
