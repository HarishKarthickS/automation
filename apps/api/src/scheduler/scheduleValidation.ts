import { HttpError } from "../utils/errors.js";
import { computeNextRun } from "./cronParser.js";

export function computeNextRunOrThrow(cronExpr: string, timezone: string, context: string): Date {
  try {
    return computeNextRun(cronExpr, timezone);
  } catch {
    throw new HttpError(400, `Invalid schedule for ${context}: cronExpr/timezone is not valid`);
  }
}

