import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ lpush: vi.fn(), run: vi.fn(), error: vi.fn() }));
vi.mock("../src/db/redis.js", () => ({ redis: { lpush: deps.lpush } }));
vi.mock("../src/scheduler/runDueAutomations.js", () => ({ runDueAutomations: deps.run }));
vi.mock("../src/utils/logger.js", () => ({ logger: { info: vi.fn(), error: deps.error } }));
import { enqueueDueAutomationsJob } from "../src/queue/redisQueue.js";
import { env } from "../src/config/env.js";

const flushImmediate = () => new Promise<void>((resolve) => setImmediate(resolve));
beforeEach(() => {
  vi.resetAllMocks();
  deps.run.mockResolvedValue(undefined);
});

describe("scheduler queue fallback", () => {
  it("enqueues a timestamped job without running the fallback when Redis works", async () => {
    deps.lpush.mockResolvedValue(1);
    const result = await enqueueDueAutomationsJob();
    expect(result).toMatchObject({ initiated: true, mode: "redis" });
    const [queue, raw] = deps.lpush.mock.calls[0];
    expect(queue).toBe(env.REDIS_DUE_QUEUE);
    expect(JSON.parse(raw)).toEqual({ jobId: result.jobId, triggeredAt: expect.any(String) });
    expect(Number.isNaN(Date.parse(JSON.parse(raw).triggeredAt))).toBe(false);
    await flushImmediate();
    expect(deps.run).not.toHaveBeenCalled();
  });

  it("acknowledges Redis failure before dispatching exactly one asynchronous fallback", async () => {
    deps.lpush.mockRejectedValue(new Error("Redis unavailable"));
    const result = await enqueueDueAutomationsJob();
    expect(result).toMatchObject({ initiated: true, mode: "fallback", jobId: expect.any(String) });
    expect(deps.run).not.toHaveBeenCalled();
    await flushImmediate();
    expect(deps.run).toHaveBeenCalledTimes(1);
  });

  it("logs fallback failure without an unhandled rejection or duplicate execution", async () => {
    deps.lpush.mockRejectedValue(new Error("Redis unavailable"));
    const failure = new Error("scheduler unavailable");
    deps.run.mockRejectedValue(failure);
    const result = await enqueueDueAutomationsJob();
    await flushImmediate();
    expect(deps.error).toHaveBeenCalledWith({ err: failure, jobId: result.jobId }, "Async fallback due automation run failed");
    expect(deps.run).toHaveBeenCalledTimes(1);
  });
});
