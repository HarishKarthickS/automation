import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool, withTransaction } from "../src/db/client.js";
import { users, automations, automationSecrets, runs } from "../src/db/schema.js";
import { triggerManualRun, admitNextRun, claimDueAutomations, processQueuedRuns } from "../src/scheduler/runDueAutomations.js";
import { limits } from "../src/security/limits.js";
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
  describe("durable execution admission", () => {
    const mutable = limits as { executionConcurrency: number; perUserConcurrentRuns: number; perUserDailyRunLimit: number };
    const initial = { executionConcurrency: mutable.executionConcurrency, perUserConcurrentRuns: mutable.perUserConcurrentRuns, perUserDailyRunLimit: mutable.perUserDailyRunLimit };
    beforeEach(async () => {
      await db.delete(runs).where(eq(runs.automationId, automationId));
      await db.delete(automationSecrets).where(eq(automationSecrets.automationId, automationId));
      await db.update(users).set({ executionApproved: true, suspended: false }).where(eq(users.id, owner));
      await db.update(automations).set({ enabled: true, nextRunAt: new Date(Date.now() + 3600_000) }).where(eq(automations.id, automationId));
      Object.assign(mutable, { executionConcurrency: 2, perUserConcurrentRuns: 1, perUserDailyRunLimit: 100 });
    });
    afterEach(() => Object.assign(mutable, initial));
    it("reserves capacity atomically across concurrent callers", async () => {
      await Promise.all([triggerManualRun(automationId, owner), triggerManualRun(automationId, owner), triggerManualRun(automationId, owner)]);
      const admitted = await Promise.all([admitNextRun(), admitNextRun(), admitNextRun()]);
      expect(admitted.filter(Boolean)).toHaveLength(1);
      const saved = await db.select().from(runs).where(eq(runs.automationId, automationId));
      expect(saved.filter((r) => r.status === "running")).toHaveLength(1);
      expect(saved.filter((r) => r.status === "queued")).toHaveLength(2);
    });
    it("admits the first run at a daily limit of one without counting queued/rejected rows", async () => {
      mutable.perUserDailyRunLimit = 1;
      const first = await triggerManualRun(automationId, owner);
      expect((await admitNextRun())?.id).toBe(first.id);
      await db.update(runs).set({ status: "succeeded", leaseToken: null, leaseExpiresAt: null }).where(eq(runs.id, first.id));
      await triggerManualRun(automationId, owner);
      expect(await admitNextRun()).toBeNull();
      const saved = await db.select().from(runs).where(eq(runs.automationId, automationId));
      expect(saved.filter((r) => r.admittedAt !== null)).toHaveLength(1);
      expect(saved.find((r) => r.failureCategory === "capacity_limit")?.admittedAt).toBeNull();
    });
    it("recovers an abandoned lease into one durable delayed retry", async () => {
      const first = await triggerManualRun(automationId, owner);
      await admitNextRun();
      await db.update(runs).set({ leaseExpiresAt: new Date(Date.now() - 1000) }).where(eq(runs.id, first.id));
      expect(await admitNextRun()).toBeNull();
      await admitNextRun();
      let saved = await db.select().from(runs).where(eq(runs.automationId, automationId));
      expect(saved.find((r) => r.id === first.id)?.failureCategory).toBe("worker_lost");
      expect(saved.filter((r) => r.parentRunId === first.id)).toHaveLength(1);
      const retry = saved.find((r) => r.parentRunId === first.id)!;
      expect(retry.availableAt.getTime()).toBeGreaterThan(Date.now());
      await db.update(runs).set({ availableAt: new Date() }).where(eq(runs.id, retry.id));
      await processQueuedRuns();
      saved = await db.select().from(runs).where(eq(runs.automationId, automationId));
      expect(saved.find((r) => r.id === retry.id)?.status).toBe("succeeded");
    });
    it("does not claim suspended schedules and cancels queued execution on suspension", async () => {
      await triggerManualRun(automationId, owner);
      await db.update(users).set({ suspended: true }).where(eq(users.id, owner));
      await db.update(automations).set({ nextRunAt: new Date(0) }).where(eq(automations.id, automationId));
      expect(await claimDueAutomations()).toBe(0);
      expect(await admitNextRun()).toBeNull();
      await expect(triggerManualRun(automationId, owner)).rejects.toMatchObject({ statusCode: 403 });
      const saved = await db.select().from(runs).where(eq(runs.automationId, automationId));
      expect(saved[0].failureCategory).toBe("permission_revoked");
    });
    it("leaves a claimed schedule durable until a later worker tick executes it", async () => {
      await db.update(automations).set({ nextRunAt: new Date(0) }).where(eq(automations.id, automationId));
      expect(await claimDueAutomations()).toBe(1);
      expect((await db.select().from(runs).where(eq(runs.automationId, automationId)))[0].status).toBe("queued");
      await processQueuedRuns();
      expect((await db.select().from(runs).where(eq(runs.automationId, automationId)))[0].status).toBe("succeeded");
    });
    it("finalizes preparation failures instead of leaving running rows forever", async () => {
      await db.insert(automationSecrets).values({ automationId, key: "BROKEN", ciphertext: "bad", iv: "bad", authTag: "bad" });
      const run = await triggerManualRun(automationId, owner);
      await processQueuedRuns();
      const [saved] = await db.select().from(runs).where(eq(runs.id, run.id));
      expect(saved.status).toBe("failed"); expect(saved.leaseToken).toBeNull(); expect(saved.finishedAt).not.toBeNull();
    });
  });
});
