import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { automations, runs } from "../db/schema.js";
import { limits } from "../security/limits.js";
import { computeNextRun } from "./cronParser.js";
import { getRetryDelayMs } from "./retryPolicy.js";
import { executeNodeAutomation } from "../executor/runner.js";
import { assertUserExecutionCapacity } from "./dueSelector.js";
import { getDecryptedSecretsMap } from "../services/secrets.service.js";
import { addDays } from "../utils/dates.js";
import { HttpError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

interface ClaimedRun {
  runId: string;
  attempt: number;
  automation: {
    id: string;
    userId: string;
    code: string;
    timeoutSeconds: number;
  };
}

const DEFAULT_BATCH_SIZE = 20;

async function claimDueAutomations(batchSize = DEFAULT_BATCH_SIZE): Promise<ClaimedRun[]> {
  return db.transaction(async (tx) => {
    const dueRowsResult = await tx.execute(sql`
      SELECT id, user_id, code, timeout_seconds, cron_expr, timezone
      FROM automations
      WHERE enabled = true
        AND next_run_at <= NOW()
      ORDER BY next_run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    `);

    const dueRows = (dueRowsResult as any).rows as Array<{
      id: string;
      user_id: string;
      code: string;
      timeout_seconds: number;
      cron_expr: string;
      timezone: string;
    }>;

    if (!dueRows.length) {
      return [];
    }

    const claimed: ClaimedRun[] = [];

    for (const row of dueRows) {
      let nextRunAt: Date;
      try {
        nextRunAt = computeNextRun(row.cron_expr, row.timezone, new Date());
      } catch (error) {
        logger.error(
          {
            err: error,
            automationId: row.id,
            userId: row.user_id,
            cronExpr: row.cron_expr,
            timezone: row.timezone
          },
          "Invalid schedule in due automation, disabling automation"
        );

        await tx
          .update(automations)
          .set({ enabled: false, updatedAt: new Date() })
          .where(eq(automations.id, row.id));
        continue;
      }

      await tx
        .update(automations)
        .set({ nextRunAt, updatedAt: new Date() })
        .where(eq(automations.id, row.id));

      const [run] = await tx
        .insert(runs)
        .values({
          automationId: row.id,
          status: "queued",
          attempt: 1,
          triggeredBy: "schedule"
        })
        .returning({ id: runs.id, attempt: runs.attempt });

      claimed.push({
        runId: run.id,
        attempt: run.attempt,
        automation: {
          id: row.id,
          userId: row.user_id,
          code: row.code,
          timeoutSeconds: row.timeout_seconds
        }
      });
    }

    return claimed;
  });
}

async function executeRun(claimed: ClaimedRun): Promise<void> {
  let current = claimed;

  while (true) {
    try {
      await assertUserExecutionCapacity(
        current.automation.userId,
        limits.perUserConcurrentRuns,
        limits.perUserDailyRunLimit
      );
    } catch (error) {
      await db
        .update(runs)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: (error as Error).message,
          output: "",
          durationMs: 0
        })
        .where(eq(runs.id, current.runId));
      return;
    }

    await db
      .update(runs)
      .set({
        status: "running",
        startedAt: new Date()
      })
      .where(eq(runs.id, current.runId));

    const envVars = await getDecryptedSecretsMap(current.automation.id);

    const result = await executeNodeAutomation({
      runId: current.runId,
      code: current.automation.code,
      timeoutSeconds: Math.min(current.automation.timeoutSeconds, limits.maxTimeoutSeconds),
      envVars
    });

    await db
      .update(runs)
      .set({
        status: result.status,
        finishedAt: new Date(),
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        durationMs: result.durationMs
      })
      .where(eq(runs.id, current.runId));

    await db
      .update(automations)
      .set({
        lastRunAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(automations.id, current.automation.id));

    const shouldRetry =
      (result.status === "failed" || result.status === "timed_out" || result.status === "killed") &&
      current.attempt < 2;

    if (!shouldRetry) {
      return;
    }

    const delayMs = getRetryDelayMs(current.attempt);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const [retryRun] = await db
      .insert(runs)
      .values({
        automationId: current.automation.id,
        status: "queued",
        attempt: current.attempt + 1,
        triggeredBy: "retry"
      })
      .returning({ id: runs.id, attempt: runs.attempt });

    current = {
      ...current,
      runId: retryRun.id,
      attempt: retryRun.attempt
    };
  }
}

async function runInBatches(claimedRuns: ClaimedRun[], concurrency: number) {
  const queue = [...claimedRuns];

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        return;
      }

      try {
        await executeRun(next);
      } catch (error) {
        logger.error({ err: error, runId: next.runId }, "Run execution failed unexpectedly");
      }
    }
  });

  await Promise.all(workers);
}

export async function cleanupOldRuns() {
  const cutoff = addDays(new Date(), -limits.runRetentionDays);
  await db.delete(runs).where(lte(runs.startedAt, cutoff));
}

export async function runDueAutomations(batchSize = DEFAULT_BATCH_SIZE) {
  logger.info({ batchSize }, "Starting due automation run");
  const claimed = await claimDueAutomations(batchSize);

  if (!claimed.length) {
    await cleanupOldRuns();
    logger.info({ claimed: 0 }, "No due automations claimed");
    return { claimed: 0 };
  }

  await runInBatches(claimed, limits.executionConcurrency);
  await cleanupOldRuns();

  logger.info({ claimed: claimed.length }, "Completed due automation run");
  return { claimed: claimed.length };
}

export async function triggerManualRun(automationId: string, userId: string) {
  const [automation] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, automationId), eq(automations.userId, userId)));

  if (!automation) {
    throw new HttpError(404, "Automation not found");
  }

  const [run] = await db
    .insert(runs)
    .values({
      automationId,
      status: "queued",
      attempt: 1,
      triggeredBy: "manual"
    })
    .returning({ id: runs.id, attempt: runs.attempt });

  void executeRun({
    runId: run.id,
    attempt: run.attempt,
    automation: {
      id: automation.id,
      userId: automation.userId,
      code: automation.code,
      timeoutSeconds: automation.timeoutSeconds
    }
  }).catch((error) => {
    logger.error({ err: error, runId: run.id }, "Manual run execution failed unexpectedly");
  });

  return run;
}

