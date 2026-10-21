import { env } from "../config/env.js";
import { HttpError } from "../utils/errors.js";

export function assertExecutionApproved(user: { suspended?: boolean; executionApproved?: boolean }) {
  if (user.suspended) throw new HttpError(403, "Account suspended");
  if (!user.executionApproved) throw new HttpError(403, "Execution requires administrator approval");
  if (env.executionMode === "disabled") throw new HttpError(503, "Execution is disabled until an isolated worker is configured");
}
export function assertSafeJobEnvironment(values: Record<string, string>) {
  for (const key of Object.keys(values)) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key) || /^(DOCKER_|LD_|DYLD_|NODE_|PYTHON|BASH_ENV$|ENV$|PATH$|HOME$|GOCACHE$|GOPATH$|CARGO_HOME$)/.test(key)) {
      throw new HttpError(400, `Reserved execution environment key: ${key}`);
    }
  }
}
