import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { automations, runs } from "../db/schema.js";
import { limits } from "../security/limits.js";
import { computeNextRun } from "./cronParser.js";
import { getRetryDelayMs } from "./retryPolicy.js";
import { executeNodeAutomation } from "../executor/runner.js";
import { assertUserExecutionCapacity } from "./dueSelector.js";
import { getDecryptedSecretsMap } from "../services/secrets.service.js";
import { sendRunFailedAfterRetriesEmail } from "../services/notifications.service.js";
import { setOnboardingStepCompleted } from "../services/onboarding.service.js";
import { trackProductEvent } from "../services/product-events.service.js";
import { env } from "../config/env.js";
import { addDays } from "../utils/dates.js";
import { HttpError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

interface ClaimedRun {
  runId: string;
  attempt: number;
  automation: {
    id: string;
    name: string;
    userId: string;
    ownerEmail: string;
    ownerName: string;
    code: string;
    timeoutSeconds: number;
    notifyOnFinalFailure: boolean;
    runOrigin: "schedule" | "manual";
  };
}

const DEFAULT_BATCH_SIZE = 20;

function classifyRunFailure(
  status: "succeeded" | "failed" | "timed_out" | "killed",
  isRetriable: boolean
): {
  failureCategory: "execution_failed" | "execution_timeout" | "execution_killed" | null;
  failureRetriable: boolean | null;
} {
  if (status === "succeeded") {
    return { failureCategory: null, failureRetriable: null };
  }

  if (status === "timed_out") {
    return { failureCategory: "execution_timeout", failureRetriable: isRetriable };
  }

  if (status === "killed") {
    return { failureCategory: "execution_killed", failureRetriable: isRetriable };
  }

  return { failureCategory: "execution_failed", failureRetriable: isRetriable };
}

async function claimDueAutomations(batchSize = DEFAULT_BATCH_SIZE): Promise<ClaimedRun[]> {
  return db.transaction(async (tx) => {
    const dueRowsResult = await tx.execute(sql`
      SELECT
        a.id,
        a.name,
        a.user_id,
        a.code,
        a.timeout_seconds,
        a.cron_expr,
        a.timezone,
        u.email as owner_email,
        u.name as owner_name
      FROM automations a
      INNER JOIN "user" u ON u.id = a.user_id
      WHERE a.enabled = true
        AND a.next_run_at <= NOW()
      ORDER BY a.next_run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    `);

    const dueRows = (dueRowsResult as any).rows as Array<{
      id: string;
      name: string;
      user_id: string;
      code: string;
      timeout_seconds: number;
      cron_expr: string;
      timezone: string;
      owner_email: string;
      owner_name: string;
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
          name: row.name,
          userId: row.user_id,
          ownerEmail: row.owner_email,
          ownerName: row.owner_name,
          code: row.code,
          timeoutSeconds: row.timeout_seconds,
          notifyOnFinalFailure: true,
          runOrigin: "schedule"
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
          failureCategory: "capacity_limit",
          failureRetriable: false,
          output: "",
          durationMs: 0
        })
        .where(eq(runs.id, current.runId));
      await trackProductEvent(current.automation.userId, "run_failed", {
        automationId: current.automation.id,
        runId: current.runId,
        failureCategory: "capacity_limit",
        origin: current.automation.runOrigin
      });
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

    const isRetryableFailure =
      result.status === "failed" || result.status === "timed_out" || result.status === "killed";
    const shouldRetry = isRetryableFailure && current.attempt < env.MAX_RUN_ATTEMPTS;
    const failure = classifyRunFailure(result.status, shouldRetry);

    await db
      .update(runs)
      .set({
        status: result.status,
        finishedAt: new Date(),
        output: result.output,
        error: result.error,
        failureCategory: failure.failureCategory,
        failureRetriable: failure.failureRetriable,
        exitCode: result.exitCode,
        durationMs: result.durationMs
      })
      .where(eq(runs.id, current.runId));

    if (result.status === "succeeded") {
      await setOnboardingStepCompleted(current.automation.userId, "first_successful_run");
      await trackProductEvent(current.automation.userId, "run_succeeded", {
        automationId: current.automation.id,
        runId: current.runId,
        origin: current.automation.runOrigin
      });
    } else if (isRetryableFailure) {
      await trackProductEvent(current.automation.userId, "run_failed", {
        automationId: current.automation.id,
        runId: current.runId,
        status: result.status,
        attempt: current.attempt,
        origin: current.automation.runOrigin
      });
    }

    await db
      .update(automations)
      .set({
        lastRunAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(automations.id, current.automation.id));

    if (!shouldRetry) {
      const finalFailureStatus =
        result.status === "failed" || result.status === "timed_out" || result.status === "killed"
          ? result.status
          : null;
      if (finalFailureStatus && current.automation.notifyOnFinalFailure) {
        await sendRunFailedAfterRetriesEmail({
          recipientEmail: current.automation.ownerEmail,
          recipientName: current.automation.ownerName,
          automationId: current.automation.id,
          automationName: current.automation.name,
          runId: current.runId,
          status: finalFailureStatus,
          attempt: current.attempt,
          maxAttempts: env.MAX_RUN_ATTEMPTS,
          error: result.error
        });
      }
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
      name: automation.name,
      userId: automation.userId,
      ownerEmail: "",
      ownerName: "",
      code: automation.code,
      timeoutSeconds: automation.timeoutSeconds,
      notifyOnFinalFailure: false,
      runOrigin: "manual"
    }
  }).catch((error) => {
    logger.error({ err: error, runId: run.id }, "Manual run execution failed unexpectedly");
  });

  return run;
}

