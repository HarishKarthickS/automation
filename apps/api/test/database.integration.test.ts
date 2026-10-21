import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool, withTransaction } from "../src/db/client.js";
import { users, automations, automationSecrets } from "../src/db/schema.js";
import { upsertSecret, getDecryptedSecretsMap } from "../src/services/secrets.service.js";
import { createActionPreflight, consumeActionPreflight } from "../src/services/admin.service.js";
import { idempotent } from "../src/utils/idempotency.js";

describe.skipIf(process.env.RUN_DB_TESTS !== "true")("real PostgreSQL mutation boundaries", () => {
  const owner = `audit-test-${crypto.randomUUID()}`;
  let automationId: string;
  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./drizzle" });
    await db.insert(users).values({ id: owner, name: "Integration test", email: `${owner}@example.invalid` });
    const [a] = await db.insert(automations).values({ userId: owner, name: "fixture", code: "console.log(1)", cronExpr: "* * * * *", timezone: "UTC", nextRunAt: new Date() }).returning();
    automationId = a.id;
  });
  afterAll(async () => { await db.delete(users).where(eq(users.id, owner)); await pool.end(); });
  it("atomically upserts the same secret from concurrent writers", async () => {
    await Promise.all([upsertSecret(automationId, { key: "TOKEN", value: "one" }), upsertSecret(automationId, { key: "TOKEN", value: "two" })]);
    const rows = await db.select().from(automationSecrets).where(eq(automationSecrets.automationId, automationId));
    expect(rows).toHaveLength(1);
    expect(["one", "two"]).toContain((await getDecryptedSecretsMap(automationId)).TOKEN);
  });
  it("rolls back the primary write when a later required write fails", async () => {
    const before = (await getDecryptedSecretsMap(automationId)).TOKEN;
    await expect(withTransaction(async () => { await upsertSecret(automationId, { key: "TOKEN", value: "should rollback" }); throw new Error("audit write failed"); })).rejects.toThrow("audit write failed");
    expect((await getDecryptedSecretsMap(automationId)).TOKEN).toBe(before);
  });
  it("consumes a durable action token only once and rejects a different actor", async () => {
    const input = { adminUserId: owner, action: "delete", resourceType: "automation", resourceId: automationId, reason: "test" };
    const { token } = await createActionPreflight(input);
    expect((await consumeActionPreflight(token, { ...input, adminUserId: "other" })).ok).toBe(false);
    const results = await Promise.all([consumeActionPreflight(token, input), consumeActionPreflight(token, input)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
  it("serializes duplicate mutation keys and rejects key reuse with different input", async () => {
    const key = crypto.randomUUID(); let calls = 0;
    const work = async () => { calls++; return { id: crypto.randomUUID() }; };
    const results = await Promise.all([idempotent(owner, "create", key, { name: "same" }, work), idempotent(owner, "create", key, { name: "same" }, work)]);
    expect(calls).toBe(1); expect(results[0]).toEqual(results[1]);
    await expect(idempotent(owner, "create", key, { name: "different" }, work)).rejects.toMatchObject({ statusCode: 409 });
  });
});
