import type { RuntimeId } from "@automation/shared";
import { limits } from "./limits.js";
import { HttpError } from "../utils/errors.js";

export function getEnabledRuntimes(): RuntimeId[] {
  return [...limits.enabledRuntimes] as RuntimeId[];
}

export function isRuntimeEnabled(runtime: RuntimeId): boolean {
  return getEnabledRuntimes().includes(runtime);
}

export function assertRuntimeEnabled(runtime: RuntimeId) {
  if (!isRuntimeEnabled(runtime)) {
    throw new HttpError(400, `Runtime '${runtime}' is currently disabled`);
  }
}
