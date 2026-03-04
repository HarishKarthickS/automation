import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { automations, runs } from "../db/schema.js";
import { HttpError } from "../utils/errors.js";

export async function listRunsByAutomation(userId: string, automationId: string, limit: number, cursor?: string) {
  const [automation] = await db
    .select({ id: automations.id })
    .from(automations)
    .where(and(eq(automations.id, automationId), eq(automations.userId, userId)));

  if (!automation) {
    throw new HttpError(404, "Automation not found");
  }

  if (!cursor) {
    return db
      .select()
      .from(runs)
      .where(eq(runs.automationId, automationId))
      .orderBy(desc(runs.startedAt))
      .limit(limit + 1);
  }

  const [cursorRow] = await db
    .select({ startedAt: runs.startedAt })
    .from(runs)
    .where(and(eq(runs.id, cursor), eq(runs.automationId, automationId)));

  return db
    .select()
    .from(runs)
    .where(and(eq(runs.automationId, automationId), lt(runs.startedAt, cursorRow?.startedAt ?? new Date())))
    .orderBy(desc(runs.startedAt))
    .limit(limit + 1);
}

export async function getRunById(userId: string, runId: string) {
  const [row] = await db
    .select({
      run: runs,
      automationUserId: automations.userId
    })
    .from(runs)
    .innerJoin(automations, eq(automations.id, runs.automationId))
    .where(eq(runs.id, runId));

  if (!row || row.automationUserId !== userId) {
    throw new HttpError(404, "Run not found");
  }

  return row.run;
}

export async function getReliabilitySummary(userId: string, windowHours: number = 24) {
  const rowsResult = await db.execute(sql`
      select
        count(*)::int as total_runs,
        count(*) filter (where r.status = 'succeeded')::int as succeeded_runs,
        count(*) filter (where r.status in ('failed', 'timed_out', 'killed'))::int as failed_runs,
        count(*) filter (
          where r.attempt > 1
            and r.status in ('failed', 'timed_out', 'killed')
            and coalesce(r.failure_retriable, false) = false
        )::int as exhausted_retries
      from runs r
      inner join automations a on a.id = r.automation_id
      where a.user_id = ${userId}
        and r.started_at >= now() - (${windowHours} * interval '1 hour')
    `);

  const row = (rowsResult as any).rows?.[0] as
    | {
        total_runs: number;
        succeeded_runs: number;
        failed_runs: number;
        exhausted_retries: number;
      }
    | undefined;

  const totalRuns = row?.total_runs ?? 0;
  const succeededRuns = row?.succeeded_runs ?? 0;
  const failedRuns = row?.failed_runs ?? 0;
  const exhaustedRetries = row?.exhausted_retries ?? 0;
  const successRate = totalRuns > 0 ? Math.round((succeededRuns / totalRuns) * 10000) / 100 : 100;

  return {
    windowHours,
    totalRuns,
    succeededRuns,
    failedRuns,
    exhaustedRetries,
    successRate
  };
}

