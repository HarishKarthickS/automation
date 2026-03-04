import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { env } from "../config/env.js";
import { redis } from "../db/redis.js";

interface ObservabilitySnapshot {
  generatedAt: string;
  automationsEnabled: number;
  automationsTotal: number;
  queueDepth: number;
  schedulerLagMinutes: number;
  runs24hTotal: number;
  runs24hSucceeded: number;
  runs24hFailed: number;
  runs24hExhaustedRetries: number;
  successRate24h: number;
}

interface AlertState {
  key: string;
  status: "ok" | "warn" | "critical";
  value: number;
  threshold: number;
  message: string;
}

export async function getObservabilitySnapshot(): Promise<ObservabilitySnapshot> {
  const [automationAgg, runAgg, schedulerLag, queueDepth] = await Promise.all([
    db.execute(sql`
      select
        count(*)::int as total,
        count(*) filter (where enabled = true)::int as enabled
      from automations
    `),
    db.execute(sql`
      select
        count(*)::int as total,
        count(*) filter (where status = 'succeeded')::int as succeeded,
        count(*) filter (where status in ('failed', 'timed_out', 'killed'))::int as failed,
        count(*) filter (
          where attempt > 1
            and status in ('failed', 'timed_out', 'killed')
            and coalesce(failure_retriable, false) = false
        )::int as exhausted
      from runs
      where started_at >= now() - interval '24 hours'
    `),
    db.execute(sql`
      select coalesce(
        max(extract(epoch from (now() - next_run_at)) / 60),
        0
      )::float8 as lag_minutes
      from automations
      where enabled = true
        and next_run_at <= now()
    `),
    redis.llen(env.REDIS_DUE_QUEUE).catch(() => 0)
  ]);

  const automationRow = (automationAgg as any).rows?.[0] as { total: number; enabled: number } | undefined;
  const runRow = (runAgg as any).rows?.[0] as
    | { total: number; succeeded: number; failed: number; exhausted: number }
    | undefined;
  const lagRow = (schedulerLag as any).rows?.[0] as { lag_minutes: number } | undefined;

  const runs24hTotal = runRow?.total ?? 0;
  const runs24hSucceeded = runRow?.succeeded ?? 0;
  const runs24hFailed = runRow?.failed ?? 0;
  const runs24hExhaustedRetries = runRow?.exhausted ?? 0;
  const successRate24h = runs24hTotal > 0 ? Math.round((runs24hSucceeded / runs24hTotal) * 10000) / 100 : 100;

  return {
    generatedAt: new Date().toISOString(),
    automationsEnabled: automationRow?.enabled ?? 0,
    automationsTotal: automationRow?.total ?? 0,
    queueDepth: Number(queueDepth) || 0,
    schedulerLagMinutes: Math.max(0, Math.round((lagRow?.lag_minutes ?? 0) * 100) / 100),
    runs24hTotal,
    runs24hSucceeded,
    runs24hFailed,
    runs24hExhaustedRetries,
    successRate24h
  };
}

export async function getObservabilityAlerts() {
  const snapshot = await getObservabilitySnapshot();

  const alerts: AlertState[] = [
    {
      key: "success_rate_24h",
      status:
        snapshot.successRate24h < env.OBS_ALERT_MIN_SUCCESS_RATE_24H - 10
          ? "critical"
          : snapshot.successRate24h < env.OBS_ALERT_MIN_SUCCESS_RATE_24H
            ? "warn"
            : "ok",
      value: snapshot.successRate24h,
      threshold: env.OBS_ALERT_MIN_SUCCESS_RATE_24H,
      message: `24h success rate ${snapshot.successRate24h}% (min ${env.OBS_ALERT_MIN_SUCCESS_RATE_24H}%)`
    },
    {
      key: "exhausted_retries_24h",
      status:
        snapshot.runs24hExhaustedRetries > env.OBS_ALERT_MAX_EXHAUSTED_RETRIES_24H * 2
          ? "critical"
          : snapshot.runs24hExhaustedRetries > env.OBS_ALERT_MAX_EXHAUSTED_RETRIES_24H
            ? "warn"
            : "ok",
      value: snapshot.runs24hExhaustedRetries,
      threshold: env.OBS_ALERT_MAX_EXHAUSTED_RETRIES_24H,
      message: `24h exhausted retries ${snapshot.runs24hExhaustedRetries} (max ${env.OBS_ALERT_MAX_EXHAUSTED_RETRIES_24H})`
    },
    {
      key: "queue_depth",
      status:
        snapshot.queueDepth > env.OBS_ALERT_MAX_QUEUE_DEPTH * 2
          ? "critical"
          : snapshot.queueDepth > env.OBS_ALERT_MAX_QUEUE_DEPTH
            ? "warn"
            : "ok",
      value: snapshot.queueDepth,
      threshold: env.OBS_ALERT_MAX_QUEUE_DEPTH,
      message: `Queue depth ${snapshot.queueDepth} (max ${env.OBS_ALERT_MAX_QUEUE_DEPTH})`
    },
    {
      key: "scheduler_lag_minutes",
      status:
        snapshot.schedulerLagMinutes > env.OBS_ALERT_MAX_SCHEDULER_LAG_MINUTES * 2
          ? "critical"
          : snapshot.schedulerLagMinutes > env.OBS_ALERT_MAX_SCHEDULER_LAG_MINUTES
            ? "warn"
            : "ok",
      value: snapshot.schedulerLagMinutes,
      threshold: env.OBS_ALERT_MAX_SCHEDULER_LAG_MINUTES,
      message: `Scheduler lag ${snapshot.schedulerLagMinutes} minutes (max ${env.OBS_ALERT_MAX_SCHEDULER_LAG_MINUTES})`
    }
  ];

  const overall =
    alerts.some((a) => a.status === "critical") ? "critical" : alerts.some((a) => a.status === "warn") ? "warn" : "ok";

  return {
    generatedAt: snapshot.generatedAt,
    overall,
    snapshot,
    alerts
  };
}

export async function renderPrometheusMetrics(): Promise<string> {
  const s = await getObservabilitySnapshot();
  return [
    "# HELP automiq_automations_total Total automations",
    "# TYPE automiq_automations_total gauge",
    `automiq_automations_total ${s.automationsTotal}`,
    "# HELP automiq_automations_enabled Enabled automations",
    "# TYPE automiq_automations_enabled gauge",
    `automiq_automations_enabled ${s.automationsEnabled}`,
    "# HELP automiq_runs_24h_total Runs in the last 24h",
    "# TYPE automiq_runs_24h_total gauge",
    `automiq_runs_24h_total ${s.runs24hTotal}`,
    "# HELP automiq_runs_24h_succeeded Succeeded runs in the last 24h",
    "# TYPE automiq_runs_24h_succeeded gauge",
    `automiq_runs_24h_succeeded ${s.runs24hSucceeded}`,
    "# HELP automiq_runs_24h_failed Failed runs in the last 24h",
    "# TYPE automiq_runs_24h_failed gauge",
    `automiq_runs_24h_failed ${s.runs24hFailed}`,
    "# HELP automiq_runs_24h_exhausted_retries Final failed runs after retries in 24h",
    "# TYPE automiq_runs_24h_exhausted_retries gauge",
    `automiq_runs_24h_exhausted_retries ${s.runs24hExhaustedRetries}`,
    "# HELP automiq_success_rate_24h_percent Success rate percent in the last 24h",
    "# TYPE automiq_success_rate_24h_percent gauge",
    `automiq_success_rate_24h_percent ${s.successRate24h}`,
    "# HELP automiq_queue_depth Current due-automations queue depth",
    "# TYPE automiq_queue_depth gauge",
    `automiq_queue_depth ${s.queueDepth}`,
    "# HELP automiq_scheduler_lag_minutes Maximum overdue scheduler lag in minutes",
    "# TYPE automiq_scheduler_lag_minutes gauge",
    `automiq_scheduler_lag_minutes ${s.schedulerLagMinutes}`
  ].join("\n");
}
