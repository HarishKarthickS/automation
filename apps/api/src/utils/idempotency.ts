import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { db, withTransaction } from "../db/client.js";
import { HttpError } from "./errors.js";

/** A retry with the same key/body returns the committed result, even on another API instance. */
export async function idempotent<T>(userId: string, scope: string, key: unknown, input: unknown, work: () => Promise<T>): Promise<T> {
  if (key === undefined) return work();
  if (typeof key !== "string" || !/^[\w-]{16,100}$/.test(key)) throw new HttpError(400, "Invalid Idempotency-Key");
  const hash = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return withTransaction(async () => {
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${userId}:${scope}:${key}`}, 0))`);
    const result = await db.execute(sql`SELECT request_hash, response_json FROM mutation_requests WHERE user_id = ${userId} AND scope = ${scope} AND request_key = ${key}`);
    const row = (result as any).rows[0];
    if (row) {
      if (row.request_hash !== hash) throw new HttpError(409, "Idempotency-Key was already used with different input");
      return JSON.parse(row.response_json) as T;
    }
    const response = await work();
    await db.execute(sql`INSERT INTO mutation_requests(user_id, scope, request_key, request_hash, response_json) VALUES (${userId}, ${scope}, ${key}, ${hash}, ${JSON.stringify(response)})`);
    return response;
  });
}
