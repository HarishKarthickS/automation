import "dotenv/config";
import { z } from "zod";

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
  EXECUTION_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  PER_USER_CONCURRENT_RUNS: z.coerce.number().int().min(1).max(20).default(2),
  PER_USER_DAILY_RUN_LIMIT: z.coerce.number().int().min(1).default(200),
  MAX_RUN_ATTEMPTS: z.coerce.number().int().min(1).default(2),
  RUN_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
  OBS_ALERT_MIN_SUCCESS_RATE_24H: z.coerce.number().min(0).max(100).default(95),
  OBS_ALERT_MAX_EXHAUSTED_RETRIES_24H: z.coerce.number().int().min(0).default(5),
  OBS_ALERT_MAX_QUEUE_DEPTH: z.coerce.number().int().min(0).default(25),
  OBS_ALERT_MAX_SCHEDULER_LAG_MINUTES: z.coerce.number().int().min(0).default(5),
  MAIL_USER: z.string().email().optional(),
  MAIL_PASS: z.string().min(1).optional(),
  CORS_ORIGINS: z.string().optional(),
  AUTO_MIGRATE: z.enum(["true", "false"]).optional(),
  REDIS_DUE_QUEUE: z.string().min(1).default("queue:run_due_automations")
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
    (parsed.data.AUTO_MIGRATE === undefined && parsed.data.NODE_ENV !== "production")
};
