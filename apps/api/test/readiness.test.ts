import Fastify from "fastify";
import { afterEach, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({ schema: vi.fn(), ping: vi.fn() }));
vi.mock("../src/db/readiness.js", () => ({ assertSchemaReady: deps.schema, requiredSchema: 1700000000008 }));
vi.mock("../src/db/redis.js", () => ({ redis: { ping: deps.ping } }));
vi.mock("../src/queue/redisQueue.js", () => ({ queueWorkerState: () => ({ started: false, stopping: false, lastTick: null }) }));
vi.mock("../src/executor/capabilities.js", () => ({ runtimeCapabilities: async () => [] }));
import { healthRoutes } from "../src/routes/health.js";
import { env } from "../src/config/env.js";
afterEach(() => vi.resetAllMocks());
it("reports Redis degradation without taking a deliberately execution-disabled API offline", async () => {
  const original = env.executionMode; env.executionMode = "disabled";
  deps.schema.mockResolvedValue(undefined); deps.ping.mockRejectedValue(new Error("private connection URL"));
  const app = Fastify(); await app.register(healthRoutes);
  try {
    const response = await app.inject("/ready"); expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ database: true, cache: false, status: "degraded", execution: { ready: false, mode: "disabled" } });
    expect(response.body).not.toContain("private connection URL");
    deps.schema.mockRejectedValue(new Error("schema unavailable"));
    expect((await app.inject("/ready")).statusCode).toBe(503);
    expect((await app.inject("/health")).statusCode).toBe(200);
  } finally { env.executionMode = original; await app.close(); }
});
