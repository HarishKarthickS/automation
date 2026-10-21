import crypto from "node:crypto";
import { env } from "../config/env.js";
import { redis } from "../db/redis.js";
import { runDueAutomations, cancelActiveRuns } from "../scheduler/runDueAutomations.js";
import { logger } from "../utils/logger.js";

let stopping = false;
let loop: Promise<void> | null = null;
let lastTick: number | null = null;
let inFlight: Promise<unknown> | null = null;
function tick() {
  if (!inFlight) inFlight = runDueAutomations().then(() => { lastTick = Date.now(); }).finally(() => { inFlight = null; });
  return inFlight;
}
export function queueWorkerState() { return { started: loop !== null, stopping, lastTick }; }
export async function enqueueDueAutomationsJob() {
  const jobId = crypto.randomUUID();
  const payload = { jobId, triggeredAt: new Date().toISOString() };
  try {
    // Redis is a best-effort notification only. Due schedules and run tasks live in PostgreSQL.
    await redis.publish(env.REDIS_DUE_QUEUE, JSON.stringify(payload));
    return { initiated: true, mode: "redis" as const, jobId };
  } catch (error) {
    logger.error({ err: error, jobId }, "Redis enqueue failed, using async fallback");
    setImmediate(() => { tick().catch((err) => logger.error({ err, jobId }, "Async fallback due automation run failed")); });
    return { initiated: true, mode: "fallback" as const, jobId };
  }
}
export async function startDueAutomationsWorker() {
  if (loop || env.executionMode === "disabled") return;
  stopping = false;
  loop = (async () => {
    while (!stopping) {
      try { await tick(); } catch (err) { logger.error({ err }, "Durable worker tick failed; database tasks retained"); }
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  })();
}
export async function shutdownQueue() {
  stopping = true; cancelActiveRuns();
  await loop; await inFlight; loop = null;
}
