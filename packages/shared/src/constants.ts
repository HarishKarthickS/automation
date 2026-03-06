export const RUNTIME_NODE_20 = "nodejs20" as const;
export const RUNTIME_CPP_23 = "cpp23" as const;
export const RUNTIME_JAVA_21 = "java21" as const;
export const RUNTIME_PYTHON_312 = "python312" as const;
export const RUNTIME_GO_122 = "go122" as const;
export const RUNTIME_RUST_183 = "rust183" as const;

export const RUNTIMES = [
  RUNTIME_NODE_20,
  RUNTIME_CPP_23,
  RUNTIME_JAVA_21,
  RUNTIME_PYTHON_312,
  RUNTIME_GO_122,
  RUNTIME_RUST_183
] as const;

export type RuntimeId = (typeof RUNTIMES)[number];

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

