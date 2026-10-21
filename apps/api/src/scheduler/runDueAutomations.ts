import crypto from "node:crypto";
import { and, eq, lte, sql } from "drizzle-orm";
import { db, withTransaction } from "../db/client.js";
import { automations, runs, users } from "../db/schema.js";
import { limits } from "../security/limits.js";
import { assertExecutionApproved } from "../security/executionPolicy.js";
import { computeNextRun } from "./cronParser.js";
import { getRetryDelayMs } from "./retryPolicy.js";
import { executeAutomation, type RunnerResult } from "../executor/runner.js";
import { getDecryptedSecretsMap } from "../services/secrets.service.js";
import { setOnboardingStepCompleted } from "../services/onboarding.service.js";
import { trackProductEvent } from "../services/product-events.service.js";
import { sendRunFailedAfterRetriesEmail } from "../services/notifications.service.js";
import { env } from "../config/env.js";
import { runtimeCapabilities } from "../executor/capabilities.js";
import { HttpError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import type { RuntimeId } from "@automation/shared";

const LEASE_MS = 30_000;
const active = new Set<AbortController>();
interface Snapshot { code: string; runtime: RuntimeId; timeoutSeconds: number; origin: "manual" | "schedule"; rootId?: string }
interface Admitted { id: string; automationId: string; userId: string; attempt: number; leaseToken: string; snapshot: Snapshot }
const rows = <T>(result: unknown): T[] => (result as { rows: T[] }).rows;
const snapshot = (a: typeof automations.$inferSelect, origin: "manual" | "schedule"): Snapshot => ({ code: a.code, runtime: a.runtime as RuntimeId, timeoutSeconds: Math.min(a.timeoutSeconds, limits.maxTimeoutSeconds), origin });

export async function claimDueAutomations(batchSize = limits.dueAutomationsBatchSize) {
  if (env.executionMode === "disabled") return 0;
  const available = (await runtimeCapabilities()).map((item) => item.id);
  if (!available.length) return 0;
  return withTransaction(async () => {
    const due = rows<{ id: string }>(await db.execute(sql`SELECT a.id FROM automations a JOIN "user" u ON u.id=a.user_id
      WHERE a.enabled=true AND a.next_run_at<=now() AND u.suspended=false AND u.execution_approved=true AND a.runtime IN (${sql.join(available.map((id) => sql`${id}`), sql`, `)})
      ORDER BY a.next_run_at,a.id FOR UPDATE OF a SKIP LOCKED LIMIT ${batchSize}`));
    let count = 0;
    for (const { id } of due) {
      const [a] = await db.select().from(automations).where(eq(automations.id, id));
      let nextRunAt: Date;
      try { nextRunAt = computeNextRun(a.cronExpr, a.timezone, new Date()); }
      catch { await db.update(automations).set({ enabled: false, updatedAt: new Date() }).where(eq(automations.id, id)); continue; }
      await db.insert(runs).values({ automationId: id, status: "queued", attempt: 1, triggeredBy: "schedule", executionSnapshot: JSON.stringify(snapshot(a, "schedule")) });
      await db.update(automations).set({ nextRunAt, updatedAt: new Date() }).where(eq(automations.id, id));
      count++;
    }
    return count;
  });
}

async function queueRetry(run: typeof runs.$inferSelect) {
  if (run.attempt >= env.MAX_RUN_ATTEMPTS) return false;
  const [a] = await db.select().from(automations).where(eq(automations.id, run.automationId));
  if (!a) return false;
  const [owner] = await db.select().from(users).where(eq(users.id, a.userId));
  if (!owner || owner.suspended || !owner.executionApproved) return false;
  const saved = run.executionSnapshot ? JSON.parse(run.executionSnapshot) as Snapshot : snapshot(a, run.triggeredBy === "manual" ? "manual" : "schedule");
  if (saved.origin !== "manual" && !a.enabled) return false;
  await db.insert(runs).values({ automationId: a.id, status: "queued", attempt: run.attempt + 1, triggeredBy: "retry", parentRunId: run.id,
    executionSnapshot: JSON.stringify({ ...saved, rootId: saved.rootId ?? run.id }), availableAt: new Date(Date.now() + getRetryDelayMs(run.attempt)) })
    .onConflictDoNothing({ target: runs.parentRunId });
  return true;
}

/** All workers and trigger paths reserve user/global capacity under one DB lock. */
export async function admitNextRun(): Promise<Admitted | null> {
  if (env.executionMode === "disabled") return null;
  const available = (await runtimeCapabilities()).map((item) => item.id);
  if (!available.length) return null;
  return withTransaction(async () => {
    await db.execute(sql`SELECT pg_advisory_xact_lock(7081343)`);
    const expired = await db.update(runs).set({ status: "failed", finishedAt: new Date(), error: "Worker lease expired; execution outcome is unknown", failureCategory: "worker_lost", failureRetriable: true, leaseToken: null, leaseExpiresAt: null })
      .where(and(eq(runs.status, "running"), lte(runs.leaseExpiresAt, new Date()))).returning();
    for (const run of expired) await db.update(runs).set({ failureRetriable: await queueRetry(run) }).where(eq(runs.id, run.id));
    await db.execute(sql`UPDATE runs r SET status='failed', finished_at=now(), error='Execution permission revoked or schedule paused', failure_category='permission_revoked', failure_retriable=false
      FROM automations a JOIN "user" u ON u.id=a.user_id WHERE r.automation_id=a.id AND r.status='queued'
      AND (u.suspended=true OR u.execution_approved=false OR (r.triggered_by!='manual' AND a.enabled=false AND coalesce(r.execution_snapshot::jsonb->>'origin','schedule')!='manual'))`);
    const [{ count: global }] = rows<{ count: number }>(await db.execute(sql`SELECT count(*)::int AS count FROM runs WHERE status='running'`));
    if (global >= limits.executionConcurrency) return null;
    for (let i = 0; i < 100; i++) {
      const [candidate] = rows<{ id: string; user_id: string }>(await db.execute(sql`SELECT r.id,a.user_id FROM runs r JOIN automations a ON a.id=r.automation_id JOIN "user" u ON u.id=a.user_id
        WHERE r.status='queued' AND r.available_at<=now() AND u.suspended=false AND u.execution_approved=true
        AND coalesce(r.execution_snapshot::jsonb->>'runtime',a.runtime) IN (${sql.join(available.map((id) => sql`${id}`), sql`, `)})
        ORDER BY r.available_at,r.queued_at,r.id FOR UPDATE OF r SKIP LOCKED LIMIT 1`));
      if (!candidate) return null;
      const [usage] = rows<{ concurrent: number; daily: number }>(await db.execute(sql`SELECT
        count(*) FILTER (WHERE r.status='running')::int AS concurrent,
        count(*) FILTER (WHERE r.admitted_at >= (date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'))::int AS daily
        FROM runs r JOIN automations a ON a.id=r.automation_id WHERE a.user_id=${candidate.user_id}`));
      if (usage.concurrent >= limits.perUserConcurrentRuns) {
        await db.update(runs).set({ availableAt: new Date(Date.now() + 2000) }).where(eq(runs.id, candidate.id)); continue;
      }
      if (usage.daily >= limits.perUserDailyRunLimit) {
        await db.update(runs).set({ status: "failed", finishedAt: new Date(), failureCategory: "capacity_limit", failureRetriable: false, error: "Daily execution limit reached" }).where(eq(runs.id, candidate.id)); continue;
      }
      const leaseToken = crypto.randomUUID();
      const [run] = await db.update(runs).set({ status: "running", startedAt: new Date(), admittedAt: new Date(), leaseToken, leaseExpiresAt: new Date(Date.now() + LEASE_MS) }).where(eq(runs.id, candidate.id)).returning();
      const [a] = await db.select().from(automations).where(eq(automations.id, run.automationId));
      return { id: run.id, automationId: run.automationId, userId: candidate.user_id, attempt: run.attempt, leaseToken,
        snapshot: run.executionSnapshot ? JSON.parse(run.executionSnapshot) : snapshot(a, run.triggeredBy === "manual" ? "manual" : "schedule") };
    }
    return null;
  });
}

async function executeAdmitted(run: Admitted) {
  const controller = new AbortController(); active.add(controller);
  const heartbeat = setInterval(() => {
    void db.execute(sql`UPDATE runs r SET lease_expires_at=${new Date(Date.now() + LEASE_MS)} FROM automations a JOIN "user" u ON u.id=a.user_id
      WHERE r.id=${run.id} AND r.lease_token=${run.leaseToken} AND r.status='running' AND r.automation_id=a.id
      AND u.suspended=false AND u.execution_approved=true RETURNING r.id`).then((result) => {
        if (!rows(result).length) controller.abort();
      }).catch(() => controller.abort());
  }, 5000);
  try {
    let result: RunnerResult;
    try {
      const [owner] = await db.select().from(users).where(eq(users.id, run.userId));
      if (!owner) throw new Error("Owner removed");
      assertExecutionApproved(owner);
      const secrets = await getDecryptedSecretsMap(run.automationId);
      result = await executeAutomation({ runId: run.id, ...run.snapshot, envVars: { ...secrets, AUTOMIQ_RUN_ID: run.snapshot.rootId ?? run.id, AUTOMIQ_ATTEMPT_ID: run.id }, signal: controller.signal });
    } catch (error) {
      logger.error({ runId: run.id, errorType: error instanceof Error ? error.name : "unknown" }, "Execution preparation failed");
      result = { status: "failed", output: "", error: "Execution could not be prepared; check worker configuration and secret keys", exitCode: null, durationMs: 0 };
    }
    const completed = await withTransaction(async () => {
      const [updated] = await db.update(runs).set({ status: result.status, finishedAt: new Date(), output: result.output, error: result.error, exitCode: result.exitCode, durationMs: result.durationMs,
        failureCategory: result.status === "succeeded" ? null : "execution_failed", failureRetriable: false, leaseToken: null, leaseExpiresAt: null })
        .where(and(eq(runs.id, run.id), eq(runs.leaseToken, run.leaseToken), eq(runs.status, "running"))).returning();
      if (!updated) return null;
      const retry = result.status !== "succeeded" && !controller.signal.aborted && await queueRetry(updated);
      await db.update(runs).set({ failureRetriable: Boolean(retry) }).where(eq(runs.id, run.id));
      await db.update(automations).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(automations.id, run.automationId));
      return { retry };
    });
    if (completed) {
      await trackProductEvent(run.userId, result.status === "succeeded" ? "run_succeeded" : "run_failed", { automationId: run.automationId, runId: run.id, origin: run.snapshot.origin });
      if (result.status === "succeeded") await setOnboardingStepCompleted(run.userId, "first_successful_run");
      if (result.status !== "succeeded" && !completed.retry && run.snapshot.origin === "schedule") {
        const [owner] = await db.select().from(users).where(eq(users.id, run.userId));
        const [a] = await db.select().from(automations).where(eq(automations.id, run.automationId));
        if (owner && a) await sendRunFailedAfterRetriesEmail({ recipientEmail: owner.email, recipientName: owner.name, automationId: a.id, automationName: a.name, runId: run.id, status: result.status, attempt: run.attempt, maxAttempts: env.MAX_RUN_ATTEMPTS, error: result.error });
      }
    }
  } finally { clearInterval(heartbeat); active.delete(controller); }
}

export async function processQueuedRuns() {
  await Promise.all(Array.from({ length: limits.executionConcurrency }, async () => {
    const run = await admitNextRun(); if (run) await executeAdmitted(run);
  }));
}
let cleanupAt = 0;
export async function cleanupOldRuns() {
  if (Date.now() - cleanupAt < 3600_000) return;
  await db.execute(sql`DELETE FROM runs WHERE status NOT IN ('queued','running') AND finished_at < now() - (${limits.runRetentionDays} * interval '1 day')`);
  await db.execute(sql`DELETE FROM product_events WHERE created_at < now() - interval '90 days'`);
  await db.execute(sql`DELETE FROM mutation_requests WHERE created_at < now() - interval '30 days'`);
  await db.execute(sql`DELETE FROM admin_action_tokens WHERE expires_at < now()`);
  await db.execute(sql`DELETE FROM admin_audit_logs WHERE created_at < now() - interval '365 days'`);
  cleanupAt = Date.now();
}
export async function runDueAutomations(batchSize = limits.dueAutomationsBatchSize) {
  const claimed = await claimDueAutomations(batchSize);
  await processQueuedRuns(); await cleanupOldRuns(); return { claimed };
}
export async function triggerManualRun(automationId: string, userId: string) {
  const [owner] = await db.select().from(users).where(eq(users.id, userId));
  if (!owner) throw new HttpError(404, "User not found"); assertExecutionApproved(owner);
  const [a] = await db.select().from(automations).where(and(eq(automations.id, automationId), eq(automations.userId, userId)));
  if (!a) throw new HttpError(404, "Automation not found");
  if (!(await runtimeCapabilities()).some((item) => item.id === a.runtime)) throw new HttpError(503, "This runtime is unavailable on the execution worker");
  const [run] = await db.insert(runs).values({ automationId, status: "queued", attempt: 1, triggeredBy: "manual", executionSnapshot: JSON.stringify(snapshot(a, "manual")) }).returning({ id: runs.id, attempt: runs.attempt });
  return run;
}
export function cancelActiveRuns() { for (const controller of active) controller.abort(); }
