import { describe, expect, it } from "vitest";
import { computeNextRun } from "../src/scheduler/cronParser.js";

describe("cronParser", () => {
  it("computes next run for a valid cron in timezone", () => {
    const now = new Date("2025-01-01T00:00:00.000Z");
    const next = computeNextRun("*/5 * * * *", "UTC", now);

    expect(next.toISOString()).toBe("2025-01-01T00:05:00.000Z");
  });

  it("throws for invalid cron", () => {
    expect(() => computeNextRun("invalid", "UTC", new Date())).toThrow();
  });
});
