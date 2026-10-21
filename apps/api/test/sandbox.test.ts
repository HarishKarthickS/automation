import { expect, it } from "vitest";
import { sandboxCommand } from "../src/executor/sandbox.js";
import { assertExecutionApproved, assertSafeJobEnvironment } from "../src/security/executionPolicy.js";
it("does not grant execution to a registered or suspended account", () => {
  expect(() => assertExecutionApproved({ executionApproved: false })).toThrow("approval");
  expect(() => assertExecutionApproved({ executionApproved: true, suspended: true })).toThrow("suspended");
});
it("cannot override Docker client configuration through job secrets", () => {
  for (const key of ["DOCKER_HOST", "LD_PRELOAD", "PATH", "NODE_OPTIONS"]) expect(() => assertSafeJobEnvironment({ [key]: "value" })).toThrow("Reserved");
});
it("builds a container boundary without host mounts or unquoted source code", () => {
  const code = "console.log('$(touch /host)');";
  const command = sandboxCommand({ runtime: "nodejs20", runId: "test", code, timeoutSeconds: 5, envVars: { TOKEN: "private-value" } }, { fileName: "automation.js", steps: [{ kind: "run", executable: process.execPath, args: ["/host/job/automation.js"] }] }, "/host/job");
  for (const flag of ["--network=none", "--memory=512m", "--cpus=1", "--pids-limit=64", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--user=65534:65534"]) expect(command.args).toContain(flag);
  expect(command.args.join(" ")).not.toContain("private-value");
  expect(command.args.join(" ")).not.toContain("--volume");
  expect(command.script).not.toContain(code);
  expect(command.script).toContain(Buffer.from(code).toString("base64"));
});
