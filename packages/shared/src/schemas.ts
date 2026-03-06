import { z } from "zod";
import { LIMITS, RUNTIMES, RUN_STATUSES, TRIGGERED_BY } from "./constants.js";

export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const automationCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  code: z
    .string()
    .min(1)
    .max(LIMITS.MAX_CODE_SIZE_BYTES, "Code is too large"),
  runtime: z.enum(RUNTIMES).default("nodejs20"),
  cronExpr: z.string().min(5).max(120),
  timezone: z.string().min(1).max(100),
  timeoutSeconds: z
    .number()
    .int()
    .min(1)
    .max(LIMITS.MAX_TIMEOUT_SECONDS)
    .default(LIMITS.DEFAULT_TIMEOUT_SECONDS),
  enabled: z.boolean().default(true),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).default([])
});

export const automationUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  code: z
    .string()
    .min(1)
    .max(LIMITS.MAX_CODE_SIZE_BYTES, "Code is too large")
    .optional(),
  runtime: z.enum(RUNTIMES).optional(),
  cronExpr: z.string().min(5).max(120).optional(),
  timezone: z.string().min(1).max(100).optional(),
  timeoutSeconds: z.number().int().min(1).max(LIMITS.MAX_TIMEOUT_SECONDS).optional(),
  enabled: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional()
});

export const secretUpsertSchema = z.object({
  key: z
    .string()
    .regex(/^[A-Z_][A-Z0-9_]*$/, "Use uppercase env var format"),
  value: z.string().min(1).max(5000)
});

export const runStatusSchema = z.enum(RUN_STATUSES);
export const triggeredBySchema = z.enum(TRIGGERED_BY);

export const templateListQuerySchema = z.object({
  query: z.string().max(120).optional(),
  sort: z.enum(["recent", "popular"]).default("recent"),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  tag: z.string().max(40).optional()
});

export const templateCloneSchema = z.object({
  nameOverride: z.string().min(1).max(120).optional(),
  timezoneOverride: z.string().min(1).max(100).optional()
});

