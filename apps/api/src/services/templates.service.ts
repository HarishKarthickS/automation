import { and, asc, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import type { RuntimeId } from "@automation/shared";
import { db } from "../db/client.js";
import { automations, templates, users } from "../db/schema.js";
import { computeNextRunOrThrow } from "../scheduler/scheduleValidation.js";
import { HttpError } from "../utils/errors.js";
import { getCachedAsync, setCached, invalidateByPrefix } from "../utils/memoryCache.js";
import { assertRuntimeEnabled } from "../security/runtimePolicy.js";

const LIST_CACHE_TTL = 60;

export async function listTemplates(input: {
  limit: number;
  cursor?: string;
  query?: string;
  sort: "recent" | "popular";
  tag?: string;
}) {
  const cacheKey = `templates:list:${input.limit}:${input.cursor || "first"}:${input.query || ""}:${input.sort}:${input.tag || ""}`;

  const filters = [eq(templates.isPublished, true)];

  if (input.query) {
    filters.push(or(ilike(templates.name, `%${input.query}%`), ilike(templates.description, `%${input.query}%`))!);
  }

  if (input.tag) {
    filters.push(sql`${input.tag} = ANY(${templates.tags})` as any);
  }

  if (input.cursor) {
    const [cursorRow] = await db
      .select({
        publishedAt: templates.publishedAt,
        cloneCount: templates.cloneCount,
        id: templates.id
      })
      .from(templates)
      .where(eq(templates.id, input.cursor));

    if (cursorRow) {
      if (input.sort === "recent") {
        filters.push(lt(templates.publishedAt, cursorRow.publishedAt));
      } else {
        filters.push(
          sql`(${templates.cloneCount}, ${templates.id}) < (${cursorRow.cloneCount}, ${cursorRow.id})` as any
        );
      }
    }
  }

  if (!input.cursor && !input.query && !input.tag) {
    const cached = await getCachedAsync<{ template: typeof templates.$inferSelect; ownerName: string }[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await db
      .select({
        template: templates,
        ownerName: users.name
      })
      .from(templates)
      .innerJoin(users, eq(users.id, templates.ownerUserId))
      .where(and(...filters))
      .orderBy(input.sort === "recent" ? desc(templates.publishedAt) : desc(templates.cloneCount), asc(templates.id))
      .limit(input.limit + 1);

    await setCached(cacheKey, rows, LIST_CACHE_TTL);
    return rows;
  }

  return db
    .select({
      template: templates,
      ownerName: users.name
    })
    .from(templates)
    .innerJoin(users, eq(users.id, templates.ownerUserId))
    .where(and(...filters))
    .orderBy(input.sort === "recent" ? desc(templates.publishedAt) : desc(templates.cloneCount), asc(templates.id))
    .limit(input.limit + 1);
}

export async function getTemplateById(templateId: string) {
  const [row] = await db
    .select({
      template: templates,
      ownerName: users.name
    })
    .from(templates)
    .innerJoin(users, eq(users.id, templates.ownerUserId))
    .where(and(eq(templates.id, templateId), eq(templates.isPublished, true)));

  if (!row) {
    throw new HttpError(404, "Template not found");
  }

  return row;
}

export async function cloneTemplateForUser(
  templateId: string,
  userId: string,
  nameOverride?: string,
  timezoneOverride?: string
) {
  const row = await getTemplateById(templateId);
  assertRuntimeEnabled(row.template.runtime as RuntimeId);
  const timezone = timezoneOverride ?? row.template.timezone;

  const [createdAutomation] = await db
    .insert(automations)
    .values({
      userId,
      name: nameOverride ?? `${row.template.name} (Copy)`,
      description: row.template.description,
      code: row.template.codeSnapshot,
      runtime: row.template.runtime,
      cronExpr: row.template.cronExpr,
      timezone,
      nextRunAt: computeNextRunOrThrow(row.template.cronExpr, timezone, "template clone"),
      timeoutSeconds: row.template.timeoutSeconds,
      enabled: false,
      tags: row.template.tags
    })
    .returning();

  await db
    .update(templates)
    .set({
      cloneCount: sql`${templates.cloneCount} + 1`,
      updatedAt: new Date()
    })
    .where(eq(templates.id, templateId));

  await db
    .update(automations)
    .set({ cloneCount: sql`${automations.cloneCount} + 1`, updatedAt: new Date() })
    .where(eq(automations.id, row.template.automationId));

  return createdAutomation;
}

