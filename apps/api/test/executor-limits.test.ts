import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { executeNodeAutomation } from "../src/executor/runner.js";
import { sanitizeEnv } from "../src/executor/sanitizeEnv.js";
import { limits } from "../src/security/limits.js";

afterEach(() => vi.unstubAllEnvs());

describe("subprocess execution controls", () => {
  it("does not inherit application credentials but injects explicit job secrets", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://private.example/db");
    vi.stubEnv("JOB_ONLY_SECRET", "parent-secret");
    expect(sanitizeEnv({ JOB_ONLY_SECRET: "job-value" })).not.toHaveProperty("DATABASE_URL");
    const result = await executeNodeAutomation({
      runId: "env-allowlist", timeoutSeconds: 5,
      code: "console.log(JSON.stringify({ db: process.env.DATABASE_URL, secret: process.env.JOB_ONLY_SECRET }));",
      envVars: { JOB_ONLY_SECRET: "job-value" }
    });
    expect(result.status).toBe("succeeded");
    expect(JSON.parse(result.output)).toEqual({ secret: "job-value" });
  });

  it("stops output flooding and bounds retained output", async () => {
    const result = await executeNodeAutomation({
      runId: "output-limit", timeoutSeconds: 5, envVars: {},
      code: `process.stdout.write('x'.repeat(${limits.maxOutputBytes * 2}));`
    });
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Output truncated");
    expect(Buffer.byteLength(result.output)).toBeLessThanOrEqual(limits.maxOutputBytes + 100);
  });

  it.each(["console.log(process.cwd());", "console.log(process.cwd()); process.exit(1);"])("removes the run directory after execution: %s", async (code) => {
    const result = await executeNodeAutomation({ runId: "cleanup-check", code, timeoutSeconds: 5, envVars: {} });
    await expect(fs.stat(result.output.trim())).rejects.toMatchObject({ code: "ENOENT" });
  });
});
