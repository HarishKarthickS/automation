import { assertSchemaReady, requiredSchema } from "../db/readiness.js";
import { redis } from "../db/redis.js";
import { env } from "../config/env.js";
import { queueWorkerState } from "../queue/redisQueue.js";
import { runtimeCapabilities } from "../executor/capabilities.js";
export const release = { commit: process.env.RENDER_GIT_COMMIT ?? process.env.BUILD_SHA ?? "unknown", schema: requiredSchema };
export async function readiness() {
  let database = false;
  try { await assertSchemaReady(); database = true; } catch { /* Do not expose connection details. */ }
  let cache = false;
  try { cache = await redis.ping() === "PONG"; } catch {}
  const state = queueWorkerState();
  const runtimes = await runtimeCapabilities();
  const executionReady = env.executionMode !== "disabled" && runtimes.length > 0 && state.started && state.lastTick !== null && Date.now() - state.lastTick < (env.MAX_TIMEOUT_SECONDS + 30) * 1000;
  const ready = database && (env.executionMode === "disabled" || executionReady);
  return { ready, status: ready ? cache ? "ready" : "degraded" : "unavailable", database, cache, release,
    execution: { mode: env.executionMode, ready: executionReady, worker: state, runtimes } };
}
