import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { runs } from "../db/schema.js";

export async function assertUserExecutionCapacity(userId: string, concurrentLimit: number, dailyLimit: number) {
  const running = await db
    .select({ count: sql<number>`count(*)` })
    .from(runs)
    .where(and(eq(runs.status, "running"), sql`${runs.automationId} in (select id from automations where user_id = ${userId})`));

  const runningCount = Number(running[0]?.count ?? 0);

  if (runningCount >= concurrentLimit) {
    throw new Error("Concurrent execution limit reached");
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const daily = await db
    .select({ count: sql<number>`count(*)` })
    .from(runs)
    .where(
      and(
        gte(runs.startedAt, dayStart),
        sql`${runs.automationId} in (select id from automations where user_id = ${userId})`
      )
    );

  const dailyCount = Number(daily[0]?.count ?? 0);
  if (dailyCount >= dailyLimit) {
    throw new Error("Daily execution limit reached");
  }
}

