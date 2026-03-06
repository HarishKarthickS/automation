import { getKpiSummary } from "./product-events.service.js";
import { getReliabilitySummary } from "./runs.service.js";
import { listAutomations } from "./automations.service.js";
import { toAutomationDTO } from "../utils/serializers.js";
import type { DashboardOverviewDTO } from "@automation/shared";
import { db } from "../db/client.js";
import { sql } from "drizzle-orm";

const DASHBOARD_AUTOMATION_LIMIT = 12;

export async function getDashboardOverview(userId: string): Promise<DashboardOverviewDTO> {
  const [automationsRows, reliability, kpi, countsResult] = await Promise.all([
    listAutomations(userId, DASHBOARD_AUTOMATION_LIMIT),
    getReliabilitySummary(userId, 24),
    getKpiSummary(userId, 7),
    db.execute(sql`
      select
        count(*)::int as total_automations,
        count(*) filter (where enabled = true)::int as active_automations
      from automations
      where user_id = ${userId}
    `)
  ]);

  const automations = automationsRows.slice(0, DASHBOARD_AUTOMATION_LIMIT).map(toAutomationDTO);
  const countsRow = (countsResult as any).rows?.[0] as
    | { total_automations: number; active_automations: number }
    | undefined;
  const totalAutomations = countsRow?.total_automations ?? 0;
  const activeAutomations = countsRow?.active_automations ?? 0;
  const pausedAutomations = Math.max(0, totalAutomations - activeAutomations);

  return {
    counts: {
      totalAutomations,
      activeAutomations,
      pausedAutomations
    },
    reliability,
    kpi,
    automations,
    needsAttention: automations
      .filter((row) => !row.enabled)
      .slice(0, 3)
      .map((row) => ({
        id: row.id,
        name: row.name,
        updatedAt: row.updatedAt
      }))
  };
}
