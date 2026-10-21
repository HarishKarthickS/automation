import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
import type { CreateAutomationInput, UpdateAutomationInput } from "@automation/shared";
import { db, withTransaction } from "../db/client.js";
import { automations, templates } from "../db/schema.js";
import { computeNextRunOrThrow } from "../scheduler/scheduleValidation.js";
import { HttpError } from "../utils/errors.js";
import { invalidateByPrefix } from "../utils/memoryCache.js";



export async function createAutomation(userId: string, input: CreateAutomationInput) {
  const nextRunAt = computeNextRunOrThrow(input.cronExpr, input.timezone, "automation creation");

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
  const filters = [eq(automations.userId, userId)];
  if (cursor) {
    const [row] = await db.select({ updatedAt: automations.updatedAt }).from(automations)
      .where(and(eq(automations.userId, userId), eq(automations.id, cursor)));
    if (!row) throw new HttpError(400, "Pagination cursor no longer exists; restart the list");
    filters.push(or(lt(automations.updatedAt, row.updatedAt),
      and(eq(automations.updatedAt, row.updatedAt), gt(automations.id, cursor)))!);
  }
  // Cache only serialized DTOs at HTTP boundaries, never typed database rows.
  return db.select().from(automations).where(and(...filters))
    .orderBy(desc(automations.updatedAt), asc(automations.id)).limit(limit + 1);
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
      ? computeNextRunOrThrow(cronExpr, timezone, "automation update")
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

async function publishAutomationTemplateImpl(userId: string, automationId: string) {
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

  await db.insert(templates).values(templatePayload).onConflictDoUpdate({ target: templates.automationId, set: templatePayload });

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

async function unpublishAutomationTemplateImpl(userId: string, automationId: string) {
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


export const publishAutomationTemplate = (...args: Parameters<typeof publishAutomationTemplateImpl>) => withTransaction(() => publishAutomationTemplateImpl(...args));

export const unpublishAutomationTemplate = (...args: Parameters<typeof unpublishAutomationTemplateImpl>) => withTransaction(() => unpublishAutomationTemplateImpl(...args));
