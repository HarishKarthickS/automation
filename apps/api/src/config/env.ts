import "dotenv/config";
import { z } from "zod";
import { RUNTIMES, type RuntimeId } from "@automation/shared";

function isValidMasterKey(value: string): boolean {
  try {
    const decoded = Buffer.from(value, "base64");
    return decoded.length === 32;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  ADMIN_EMAILS: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_ORIGIN: z.string().url(),
  MASTER_ENCRYPTION_KEY: z
    .string()
    .refine(isValidMasterKey, "Must be base64 and decode to exactly 32 bytes"),
  INTERNAL_CRON_TOKEN: z.string().min(24),
  MAX_CODE_SIZE_BYTES: z.coerce.number().int().positive().default(100 * 1024),
  MAX_OUTPUT_BYTES: z.coerce.number().int().positive().default(256 * 1024),
  DEFAULT_TIMEOUT_SECONDS: z.coerce.number().int().min(1).default(30),
  MAX_TIMEOUT_SECONDS: z.coerce.number().int().min(1).default(120),
  EXECUTION_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(1),
  PER_USER_CONCURRENT_RUNS: z.coerce.number().int().min(1).max(20).default(1),
  PER_USER_DAILY_RUN_LIMIT: z.coerce.number().int().min(1).default(200),
  MAX_RUN_ATTEMPTS: z.coerce.number().int().min(1).default(2),
  DUE_AUTOMATIONS_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(5),
  RUN_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
  OBS_ALERT_MIN_SUCCESS_RATE_24H: z.coerce.number().min(0).max(100).default(95),
  OBS_ALERT_MAX_EXHAUSTED_RETRIES_24H: z.coerce.number().int().min(0).default(5),
  OBS_ALERT_MAX_QUEUE_DEPTH: z.coerce.number().int().min(0).default(25),
  OBS_ALERT_MAX_SCHEDULER_LAG_MINUTES: z.coerce.number().int().min(0).default(5),
  MAIL_USER: z.string().email().optional(),
  MAIL_PASS: z.string().min(1).optional(),
  CORS_ORIGINS: z.string().optional(),
  AUTO_MIGRATE: z.enum(["true", "false"]).optional(),
  REDIS_DUE_QUEUE: z.string().min(1).default("queue:run_due_automations"),
  ENABLED_RUNTIMES: z.string().default("cpp23,java21,python312,go122,rust183,nodejs20"),
  DEPENDENCY_ALLOWLIST_MODE: z.enum(["strict", "relaxed"]).default("relaxed"),
  DEPENDENCY_MAX_COUNT: z.coerce.number().int().min(0).max(100).default(20),
  DEPENDENCY_MAX_TOTAL_CHARS: z.coerce.number().int().min(1).max(4096).default(512),
  DEPENDENCY_INSTALL_TIMEOUT_SECONDS: z.coerce.number().int().min(1).max(300).default(30),
  PYTHON_ALLOWED_PACKAGES: z.string().optional(),
  GO_ALLOWED_MODULES: z.string().optional(),
  RUST_ALLOWED_CRATES: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${formatted}`);
}

export const env = {
  ...parsed.data,
  adminEmails: parsed.data.ADMIN_EMAILS
    ? parsed.data.ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
    : [],
  corsOrigins: parsed.data.CORS_ORIGINS
    ? parsed.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [parsed.data.FRONTEND_ORIGIN],
  isProd: parsed.data.NODE_ENV === "production",
  autoMigrate:
    parsed.data.AUTO_MIGRATE === "true" ||
    (parsed.data.AUTO_MIGRATE === undefined && parsed.data.NODE_ENV !== "production"),
  enabledRuntimes: parsed.data.ENABLED_RUNTIMES.split(",")
    .map((value) => value.trim())
    .filter((value): value is RuntimeId => (RUNTIMES as readonly string[]).includes(value)),
  pythonAllowedPackages: parsed.data.PYTHON_ALLOWED_PACKAGES
    ? parsed.data.PYTHON_ALLOWED_PACKAGES.split(",").map((value) => value.trim()).filter(Boolean)
    : [],
  goAllowedModules: parsed.data.GO_ALLOWED_MODULES
    ? parsed.data.GO_ALLOWED_MODULES.split(",").map((value) => value.trim()).filter(Boolean)
    : [],
  rustAllowedCrates: parsed.data.RUST_ALLOWED_CRATES
    ? parsed.data.RUST_ALLOWED_CRATES.split(",").map((value) => value.trim()).filter(Boolean)
    : []
};
