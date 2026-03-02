import { and, desc, eq, lt } from "drizzle-orm";
import type { CreateAutomationInput, UpdateAutomationInput } from "@automation/shared";
import { db } from "../db/client.js";
import { automations, templates } from "../db/schema.js";
import { computeNextRun } from "../scheduler/cronParser.js";
import { HttpError } from "../utils/errors.js";
import { getCachedAsync, setCached, invalidateByPrefix } from "../utils/memoryCache.js";

const LIST_CACHE_TTL = 30;

export async function createAutomation(userId: string, input: CreateAutomationInput) {
  const nextRunAt = computeNextRun(input.cronExpr, input.timezone);

  const [created] = await db
    .insert(automations)
    .values({
      userId,
      name: input.name,
      description: input.description ?? null,
      code: input.code,
      runtime: input.runtime,
      cronExpr: input.cronExpr,
      timezone: input.timezone,
      nextRunAt,
      timeoutSeconds: input.timeoutSeconds,
      enabled: input.enabled,
      tags: input.tags
    })
    .returning();

  await invalidateByPrefix(`automations:list:${userId}:`);
  return created;
}

export async function listAutomations(userId: string, limit: number, cursor?: string) {
  const cacheKey = `automations:list:${userId}:${limit}:${cursor || "first"}`;

  if (!cursor) {
    const cached = await getCachedAsync<typeof automations.$inferSelect[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await db
      .select()
      .from(automations)
      .where(eq(automations.userId, userId))
      .orderBy(desc(automations.updatedAt))
      .limit(limit + 1);

    await setCached(cacheKey, rows, LIST_CACHE_TTL);
    return rows;
  }

  const [cursorRow] = await db
    .select({ updatedAt: automations.updatedAt })
    .from(automations)
    .where(and(eq(automations.userId, userId), eq(automations.id, cursor)));

  if (!cursorRow) {
    return db
      .select()
      .from(automations)
      .where(eq(automations.userId, userId))
      .orderBy(desc(automations.updatedAt))
      .limit(limit + 1);
  }

  return db
    .select()
    .from(automations)
    .where(and(eq(automations.userId, userId), lt(automations.updatedAt, cursorRow.updatedAt)))
    .orderBy(desc(automations.updatedAt))
    .limit(limit + 1);
}

export async function getAutomationById(userId: string, id: string) {
  const [automation] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, id), eq(automations.userId, userId)));

  if (!automation) {
    throw new HttpError(404, "Automation not found");
  }

  return automation;
}

export async function updateAutomation(userId: string, id: string, input: UpdateAutomationInput) {
  const current = await getAutomationById(userId, id);

  const cronExpr = input.cronExpr ?? current.cronExpr;
  const timezone = input.timezone ?? current.timezone;
  const nextRunAt =
    input.cronExpr || input.timezone || input.enabled !== undefined
      ? computeNextRun(cronExpr, timezone)
      : current.nextRunAt;

  const [updated] = await db
    .update(automations)
    .set({
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      code: input.code ?? current.code,
      runtime: input.runtime ?? current.runtime,
      cronExpr,
      timezone,
      nextRunAt,
      timeoutSeconds: input.timeoutSeconds ?? current.timeoutSeconds,
      enabled: input.enabled ?? current.enabled,
      tags: input.tags ?? current.tags,
      updatedAt: new Date()
    })
    .where(eq(automations.id, id))
    .returning();

  await invalidateByPrefix(`automations:list:${userId}:`);
  return updated;
}

export async function deleteAutomation(userId: string, id: string) {
  const [deleted] = await db
    .delete(automations)
    .where(and(eq(automations.id, id), eq(automations.userId, userId)))
    .returning({ id: automations.id });

  if (!deleted) {
    throw new HttpError(404, "Automation not found");
  }

  await invalidateByPrefix(`automations:list:${userId}:`);
}

export async function publishAutomationTemplate(userId: string, automationId: string) {
  const automation = await getAutomationById(userId, automationId);

  const templatePayload = {
    automationId: automation.id,
    ownerUserId: userId,
    name: automation.name,
    description: automation.description,
    codeSnapshot: automation.code,
    runtime: automation.runtime,
    cronExpr: automation.cronExpr,
    timezone: automation.timezone,
    timeoutSeconds: automation.timeoutSeconds,
    tags: automation.tags,
    isPublished: true,
    updatedAt: new Date(),
    publishedAt: new Date()
  };

  const existing = await db.select().from(templates).where(eq(templates.automationId, automation.id)).limit(1);

  if (existing.length > 0) {
    await db.update(templates).set(templatePayload).where(eq(templates.automationId, automation.id));
  } else {
    await db.insert(templates).values(templatePayload);
  }

  const [updatedAutomation] = await db
    .update(automations)
    .set({
      isTemplatePublished: true,
      publishedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(automations.id, automation.id))
    .returning();

  return {
    ...updatedAutomation
  };
}

export async function unpublishAutomationTemplate(userId: string, automationId: string) {
  await getAutomationById(userId, automationId);

  await db
    .update(templates)
    .set({
      isPublished: false,
      updatedAt: new Date()
    })
    .where(and(eq(templates.automationId, automationId), eq(templates.ownerUserId, userId)));

  const [updatedAutomation] = await db
    .update(automations)
    .set({
      isTemplatePublished: false,
      publishedAt: null,
      updatedAt: new Date()
    })
    .where(eq(automations.id, automationId))
    .returning();

  return updatedAutomation;
}

