export const RUNTIME_NODE_20 = "nodejs20" as const;

export const LIMITS = {
  MAX_CODE_SIZE_BYTES: 100 * 1024,
  DEFAULT_TIMEOUT_SECONDS: 30,
  MAX_TIMEOUT_SECONDS: 120,
  MAX_OUTPUT_BYTES: 256 * 1024,
  RUN_RETENTION_DAYS: 30
} as const;

export const RUN_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "timed_out",
  "killed"
] as const;

export const TRIGGERED_BY = ["schedule", "manual", "retry"] as const;

