import { env } from "../config/env.js";

export const limits = {
  maxCodeSizeBytes: env.MAX_CODE_SIZE_BYTES,
  maxOutputBytes: env.MAX_OUTPUT_BYTES,
  defaultTimeoutSeconds: env.DEFAULT_TIMEOUT_SECONDS,
  maxTimeoutSeconds: env.MAX_TIMEOUT_SECONDS,
  executionConcurrency: env.EXECUTION_CONCURRENCY,
  perUserConcurrentRuns: env.PER_USER_CONCURRENT_RUNS,
  perUserDailyRunLimit: env.PER_USER_DAILY_RUN_LIMIT,
  runRetentionDays: env.RUN_RETENTION_DAYS
} as const;

