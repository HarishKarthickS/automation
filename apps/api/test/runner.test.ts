import { describe, expect, it } from "vitest";
import { executeAutomation, executeNodeAutomation } from "../src/executor/runner.js";

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

  it("supports runtime-dispatch execution for node runtime", async () => {
    const result = await executeAutomation({
      runId: "test-runtime-dispatch",
      runtime: "nodejs20",
      code: "console.log('dispatch-ok');",
      timeoutSeconds: 5,
      envVars: {}
    });

    expect(result.status).toBe("succeeded");
    expect(result.output).toContain("dispatch-ok");
  });

  it("fails gracefully on unsupported runtime", async () => {
    const result = await executeAutomation({
      runId: "test-runtime-unsupported",
      runtime: "unsupported-runtime" as any,
      code: "console.log('x');",
      timeoutSeconds: 5,
      envVars: {}
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Unsupported runtime");
  });
});
