import { env } from "../config/env.js";

export const limits = {
  maxCodeSizeBytes: env.MAX_CODE_SIZE_BYTES,
  maxOutputBytes: env.MAX_OUTPUT_BYTES,
  defaultTimeoutSeconds: env.DEFAULT_TIMEOUT_SECONDS,
  maxTimeoutSeconds: env.MAX_TIMEOUT_SECONDS,
  executionConcurrency: env.EXECUTION_CONCURRENCY,
  perUserConcurrentRuns: env.PER_USER_CONCURRENT_RUNS,
  perUserDailyRunLimit: env.PER_USER_DAILY_RUN_LIMIT,
  dueAutomationsBatchSize: env.DUE_AUTOMATIONS_BATCH_SIZE,
  runRetentionDays: env.RUN_RETENTION_DAYS,
  enabledRuntimes: env.enabledRuntimes,
  dependencyAllowlistMode: env.DEPENDENCY_ALLOWLIST_MODE,
  dependencyMaxCount: env.DEPENDENCY_MAX_COUNT,
  dependencyMaxTotalChars: env.DEPENDENCY_MAX_TOTAL_CHARS,
  dependencyInstallTimeoutSeconds: env.DEPENDENCY_INSTALL_TIMEOUT_SECONDS,
  pythonAllowedPackages: env.pythonAllowedPackages,
  goAllowedModules: env.goAllowedModules,
  rustAllowedCrates: env.rustAllowedCrates
} as const;

