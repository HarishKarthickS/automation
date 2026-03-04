import crypto from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  adminAuditLogs,
  adminSettings,
  automations,
  onboardingProgress,
  productEvents,
  runs,
  templates,
  users
} from "../db/schema.js";
import { getObservabilityAlerts } from "./observability.service.js";

type PreflightPayload = {
  action: string;
  resourceType: string;
  resourceId: string;
  reason: string;
  adminUserId: string;
  expiresAtMs: number;
};

const preflightTokens = new Map<string, PreflightPayload>();
const PREVIEW_TTL_MS = 5 * 60 * 1000;

export function createActionPreflight(input: {
  action: string;
  resourceType: string;
  resourceId: string;
  reason: string;
  adminUserId: string;
}) {
  const token = crypto.randomUUID();
  preflightTokens.set(token, {
    ...input,
    expiresAtMs: Date.now() + PREVIEW_TTL_MS
  });
  return { token, expiresInSeconds: Math.floor(PREVIEW_TTL_MS / 1000) };
}

export function consumeActionPreflight(
  token: string | undefined,
  expected: { action: string; resourceType: string; resourceId: string; adminUserId: string }
) {
  if (!token) {
    return { ok: false, reason: "Missing admin action token" };
  }
  const payload = preflightTokens.get(token);
  if (!payload) {
    return { ok: false, reason: "Invalid or expired admin action token" };
  }
  preflightTokens.delete(token);

  if (payload.expiresAtMs < Date.now()) {
    return { ok: false, reason: "Expired admin action token" };
  }
  if (
    payload.action !== expected.action ||
    payload.resourceType !== expected.resourceType ||
    payload.resourceId !== expected.resourceId ||
    payload.adminUserId !== expected.adminUserId
  ) {
    return { ok: false, reason: "Admin action token does not match request" };
  }
  return { ok: true as const, reason: payload.reason };
}

export async function writeAdminAudit(input: {
  adminUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  reason: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(adminAuditLogs).values({
    adminUserId: input.adminUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    reason: input.reason,
    beforeJson: input.before === undefined ? null : JSON.stringify(input.before),
    afterJson: input.after === undefined ? null : JSON.stringify(input.after)
  });
}

export async function getAdminOverview() {
  const [counts, alerts] = await Promise.all([
    db.execute(sql`
      select
        (select count(*)::int from "user") as users_total,
        (select count(*)::int from "user" where suspended = true) as users_suspended,
        (select count(*)::int from automations) as automations_total,
        (select count(*)::int from runs where started_at >= now() - interval '24 hours') as runs_24h,
        (select count(*)::int from templates where is_published = true) as templates_published
    `),
    getObservabilityAlerts()
  ]);
  const row = (counts as any).rows?.[0] as
    | {
        users_total: number;
        users_suspended: number;
        automations_total: number;
        runs_24h: number;
        templates_published: number;
      }
    | undefined;

  return {
    counts: {
      usersTotal: row?.users_total ?? 0,
      usersSuspended: row?.users_suspended ?? 0,
      automationsTotal: row?.automations_total ?? 0,
      runs24h: row?.runs_24h ?? 0,
      templatesPublished: row?.templates_published ?? 0
    },
    alerts: alerts as {
      generatedAt: string;
      overall: "ok" | "warn" | "critical";
      snapshot: {
        generatedAt: string;
        automationsEnabled: number;
        automationsTotal: number;
        queueDepth: number;
        schedulerLagMinutes: number;
        runs24hTotal: number;
        runs24hSucceeded: number;
        runs24hFailed: number;
        runs24hExhaustedRetries: number;
        successRate24h: number;
      };
      alerts: Array<{
        key: string;
        status: "ok" | "warn" | "critical";
        value: number;
        threshold: number;
        message: string;
      }>;
    }
  };
}

export async function listAdminUsers(limit = 100) {
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
}

export async function listAdminAutomations(limit = 100) {
  return db.select().from(automations).orderBy(desc(automations.updatedAt)).limit(limit);
}

export async function listAdminRuns(limit = 100) {
  return db.select().from(runs).orderBy(desc(runs.startedAt)).limit(limit);
}

export async function listAdminTemplates(limit = 100) {
  return db.select().from(templates).orderBy(desc(templates.updatedAt)).limit(limit);
}

export async function listAdminOnboarding(limit = 100) {
  return db.select().from(onboardingProgress).orderBy(desc(onboardingProgress.updatedAt)).limit(limit);
}

export async function listAdminEvents(limit = 200) {
  return db.select().from(productEvents).orderBy(desc(productEvents.createdAt)).limit(limit);
}

export async function listAdminAuditLogs(limit = 200) {
  return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit);
}

export async function upsertAdminSetting(key: string, value: string, updatedByUserId: string) {
  const [existing] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
  if (existing) {
    const [updated] = await db
      .update(adminSettings)
      .set({
        value,
        updatedByUserId,
        updatedAt: new Date()
      })
      .where(eq(adminSettings.key, key))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(adminSettings)
    .values({
      key,
      value,
      updatedByUserId,
      updatedAt: new Date()
    })
    .returning();
  return created;
}

export async function listAdminSettings() {
  return db.select().from(adminSettings).orderBy(adminSettings.key);
}

export async function getUserByIdForAdmin(userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  return row ?? null;
}

export async function getAutomationByIdForAdmin(id: string) {
  const [row] = await db.select().from(automations).where(eq(automations.id, id));
  return row ?? null;
}

export async function getRunByIdForAdmin(id: string) {
  const [row] = await db.select().from(runs).where(eq(runs.id, id));
  return row ?? null;
}

export async function getTemplateByIdForAdmin(id: string) {
  const [row] = await db.select().from(templates).where(eq(templates.id, id));
  return row ?? null;
}

export async function updateUserForAdmin(userId: string, patch: Partial<{ role: "user" | "admin"; suspended: boolean; name: string }>) {
  const [updated] = await db
    .update(users)
    .set({
      role: patch.role,
      suspended: patch.suspended,
      name: patch.name,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}

export async function deleteUserForAdmin(userId: string) {
  const [deleted] = await db.delete(users).where(eq(users.id, userId)).returning();
  return deleted ?? null;
}

export async function updateAutomationForAdmin(id: string, patch: Partial<{ name: string; enabled: boolean }>) {
  const [updated] = await db
    .update(automations)
    .set({
      name: patch.name,
      enabled: patch.enabled,
      updatedAt: new Date()
    })
    .where(eq(automations.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteAutomationForAdmin(id: string) {
  const [deleted] = await db.delete(automations).where(eq(automations.id, id)).returning();
  return deleted ?? null;
}

export async function deleteRunForAdmin(id: string) {
  const [deleted] = await db.delete(runs).where(eq(runs.id, id)).returning();
  return deleted ?? null;
}

export async function updateTemplateForAdmin(id: string, patch: Partial<{ isPublished: boolean; name: string }>) {
  const [updated] = await db
    .update(templates)
    .set({
      isPublished: patch.isPublished,
      name: patch.name,
      updatedAt: new Date()
    })
    .where(eq(templates.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteTemplateForAdmin(id: string) {
  const [deleted] = await db.delete(templates).where(eq(templates.id, id)).returning();
  return deleted ?? null;
}

export async function deleteEventForAdmin(id: string) {
  const [deleted] = await db.delete(productEvents).where(eq(productEvents.id, id)).returning();
  return deleted ?? null;
}
