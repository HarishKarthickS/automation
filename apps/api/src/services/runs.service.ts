import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { automations, runs } from "../db/schema.js";
import { HttpError } from "../utils/errors.js";

export async function listRunsByAutomation(userId: string, automationId: string, limit: number, cursor?: string) {
  const [automation] = await db
    .select({ id: automations.id })
    .from(automations)
    .where(and(eq(automations.id, automationId), eq(automations.userId, userId)));

  if (!automation) {
    throw new HttpError(404, "Automation not found");
  }

  if (!cursor) {
    return db
      .select()
      .from(runs)
      .where(eq(runs.automationId, automationId))
      .orderBy(desc(runs.startedAt))
      .limit(limit + 1);
  }

  const [cursorRow] = await db
    .select({ startedAt: runs.startedAt })
    .from(runs)
    .where(and(eq(runs.id, cursor), eq(runs.automationId, automationId)));

  return db
    .select()
    .from(runs)
    .where(and(eq(runs.automationId, automationId), lt(runs.startedAt, cursorRow?.startedAt ?? new Date())))
    .orderBy(desc(runs.startedAt))
    .limit(limit + 1);
}

export async function getRunById(userId: string, runId: string) {
  const [row] = await db
    .select({
      run: runs,
      automationUserId: automations.userId
    })
    .from(runs)
    .innerJoin(automations, eq(automations.id, runs.automationId))
    .where(eq(runs.id, runId));

  if (!row || row.automationUserId !== userId) {
    throw new HttpError(404, "Run not found");
  }

  return row.run;
}

