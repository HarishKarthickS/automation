import type { z } from "zod";
import {
  automationCreateSchema,
  automationUpdateSchema,
  paginationSchema,
  runStatusSchema,
  secretUpsertSchema,
  templateCloneSchema,
  templateListQuerySchema,
  triggeredBySchema
} from "./schemas.js";

export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateAutomationInput = z.infer<typeof automationCreateSchema>;
export type UpdateAutomationInput = z.infer<typeof automationUpdateSchema>;
export type SecretUpsertInput = z.infer<typeof secretUpsertSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type TriggeredBy = z.infer<typeof triggeredBySchema>;
export type RunFailureCategory =
  | "execution_failed"
  | "execution_timeout"
  | "execution_killed"
  | "capacity_limit"
  | "internal_error";
export type OnboardingStepId =
  | "create_automation"
  | "configure_schedule"
  | "add_secret"
  | "trigger_manual_run"
  | "first_successful_run";
export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;
export type TemplateCloneInput = z.infer<typeof templateCloneSchema>;

export interface AutomationDTO {
  id: string;
  name: string;
  description: string | null;
  code: string;
  runtime: "nodejs20";
  cronExpr: string;
  timezone: string;
  nextRunAt: string;
  lastRunAt: string | null;
  timeoutSeconds: number;
  enabled: boolean;
  tags: string[];
  isTemplatePublished: boolean;
  publishedAt: string | null;
  cloneCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SecretDTO {
  id: string;
  key: string;
  createdAt: string;
  updatedAt: string;
}

export interface RunDTO {
  id: string;
  automationId: string;
  status: RunStatus;
  attempt: number;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  output: string;
  error: string | null;
  failureCategory: RunFailureCategory | null;
  failureRetriable: boolean | null;
  exitCode: number | null;
  triggeredBy: TriggeredBy;
}

export interface ReliabilitySummaryDTO {
  windowHours: number;
  totalRuns: number;
  succeededRuns: number;
  failedRuns: number;
  exhaustedRetries: number;
  successRate: number;
}

export interface OnboardingStepStateDTO {
  id: OnboardingStepId;
  title: string;
  description: string;
  completed: boolean;
}

export interface OnboardingStatusDTO {
  completed: boolean;
  progressPercent: number;
  nextStep: OnboardingStepId | null;
  steps: OnboardingStepStateDTO[];
}

export interface KpiSummaryDTO {
  windowDays: number;
  automationsCreated: number;
  secretsAdded: number;
  manualRunsTriggered: number;
  successfulRuns: number;
  failedRuns: number;
  templatesCloned: number;
  firstSuccessLatencyMinutes: number | null;
}

export interface SessionUserDTO {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  suspended: boolean;
  isAdmin: boolean;
}

export interface AdminOverviewDTO {
  counts: {
    usersTotal: number;
    usersSuspended: number;
    automationsTotal: number;
    runs24h: number;
    templatesPublished: number;
  };
  alerts: unknown;
}

export interface TemplateDTO {
  id: string;
  automationId: string;
  ownerUserId: string;
  ownerName: string;
  name: string;
  description: string | null;
  code: string;
  runtime: "nodejs20";
  cronExpr: string;
  timezone: string;
  timeoutSeconds: number;
  tags: string[];
  cloneCount: number;
  publishedAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
