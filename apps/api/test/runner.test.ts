import { describe, expect, it } from "vitest";
import { executeNodeAutomation } from "../src/executor/runner.js";

describe("runner", () => {
  it("executes simple code and captures output", async () => {
    const result = await executeNodeAutomation({
      runId: "test-run-success",
      code: "console.log('ok');",
      timeoutSeconds: 5,
      envVars: {}
    });

    expect(result.status).toBe("succeeded");
    expect(result.output).toContain("ok");
  });

  it("times out long-running code", async () => {
    const result = await executeNodeAutomation({
      runId: "test-run-timeout",
      code: "while (true) {}",
      timeoutSeconds: 1,
      envVars: {}
    });

    expect(["timed_out", "killed"]).toContain(result.status);
  });
});
