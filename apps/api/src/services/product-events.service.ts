import { and, eq, gte, sql } from "drizzle-orm";
import type { KpiSummaryDTO } from "@automation/shared";
import { db } from "../db/client.js";
import { productEvents } from "../db/schema.js";
import { logger } from "../utils/logger.js";

type ProductEventType =
  | "automation_created"
  | "secret_added"
  | "manual_run_triggered"
  | "run_succeeded"
  | "run_failed"
  | "template_cloned";

export async function trackProductEvent(
  userId: string,
  eventType: ProductEventType,
  metadata: Record<string, unknown> = {}
) {
  try {
    await db.insert(productEvents).values({
      userId,
      eventType,
      metadata: JSON.stringify(metadata)
    });
  } catch (error) {
    logger.warn({ err: error, userId, eventType }, "Failed to record product event");
  }
}

export async function getKpiSummary(userId: string, windowDays: number = 7): Promise<KpiSummaryDTO> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const countsResult = await db.execute(sql`
    select
      count(*) filter (where event_type = 'automation_created')::int as automations_created,
      count(*) filter (where event_type = 'secret_added')::int as secrets_added,
      count(*) filter (where event_type = 'manual_run_triggered')::int as manual_runs_triggered,
      count(*) filter (where event_type = 'run_succeeded')::int as successful_runs,
      count(*) filter (where event_type = 'run_failed')::int as failed_runs,
      count(*) filter (where event_type = 'template_cloned')::int as templates_cloned
    from product_events
    where user_id = ${userId}
      and created_at >= ${since}
  `);

  const latencyResult = await db.execute(sql`
    with first_created as (
      select min(created_at) as ts
      from product_events
      where user_id = ${userId} and event_type = 'automation_created'
    ),
    first_success as (
      select min(created_at) as ts
      from product_events
      where user_id = ${userId} and event_type = 'run_succeeded'
    )
    select
      case
        when (select ts from first_created) is null or (select ts from first_success) is null then null
        else extract(epoch from ((select ts from first_success) - (select ts from first_created))) / 60
      end as minutes
  `);

  const counts = (countsResult as any).rows?.[0] as
    | {
        automations_created: number;
        secrets_added: number;
        manual_runs_triggered: number;
        successful_runs: number;
        failed_runs: number;
        templates_cloned: number;
      }
    | undefined;
  const latency = (latencyResult as any).rows?.[0] as { minutes: number | null } | undefined;

  return {
    windowDays,
    automationsCreated: counts?.automations_created ?? 0,
    secretsAdded: counts?.secrets_added ?? 0,
    manualRunsTriggered: counts?.manual_runs_triggered ?? 0,
    successfulRuns: counts?.successful_runs ?? 0,
    failedRuns: counts?.failed_runs ?? 0,
    templatesCloned: counts?.templates_cloned ?? 0,
    firstSuccessLatencyMinutes:
      typeof latency?.minutes === "number" ? Math.max(0, Math.round(latency.minutes * 100) / 100) : null
  };
}
