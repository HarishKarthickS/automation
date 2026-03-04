import { and, eq, sql } from "drizzle-orm";
import type { OnboardingStatusDTO, OnboardingStepId, OnboardingStepStateDTO } from "@automation/shared";
import { db } from "../db/client.js";
import { onboardingProgress } from "../db/schema.js";

const STEP_COPY: Record<OnboardingStepId, { title: string; description: string }> = {
  create_automation: {
    title: "Create your first automation",
    description: "Start with a blank automation or clone a template."
  },
  configure_schedule: {
    title: "Configure a schedule",
    description: "Set cron frequency and timezone for predictable runs."
  },
  add_secret: {
    title: "Add at least one secret",
    description: "Store API keys or credentials securely."
  },
  trigger_manual_run: {
    title: "Trigger a manual run",
    description: "Validate your automation immediately."
  },
  first_successful_run: {
    title: "Get the first successful run",
    description: "Confirm output and verify execution end-to-end."
  }
};

const STEP_ORDER: OnboardingStepId[] = [
  "create_automation",
  "configure_schedule",
  "add_secret",
  "trigger_manual_run",
  "first_successful_run"
];

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatusDTO> {
  const result = await db.execute(sql`
    with per_user as (
      select a.id, a.cron_expr
      from automations a
      where a.user_id = ${userId}
    ),
    has_secret as (
      select exists(
        select 1
        from automation_secrets s
        inner join automations a on a.id = s.automation_id
        where a.user_id = ${userId}
      ) as value
    ),
    has_manual as (
      select exists(
        select 1
        from runs r
        inner join automations a on a.id = r.automation_id
        where a.user_id = ${userId}
          and r.triggered_by = 'manual'
      ) as value
    ),
    has_success as (
      select exists(
        select 1
        from runs r
        inner join automations a on a.id = r.automation_id
        where a.user_id = ${userId}
          and r.status = 'succeeded'
      ) as value
    )
    select
      (select count(*)::int from per_user) as automation_count,
      (select count(*)::int from per_user where cron_expr is not null and length(cron_expr) > 0) as scheduled_count,
      (select value from has_secret) as has_secret,
      (select value from has_manual) as has_manual,
      (select value from has_success) as has_success
  `);

  const row = (result as any).rows?.[0] as
    | {
        automation_count: number;
        scheduled_count: number;
        has_secret: boolean;
        has_manual: boolean;
        has_success: boolean;
      }
    | undefined;

  const derivedComplete: Record<OnboardingStepId, boolean> = {
    create_automation: (row?.automation_count ?? 0) > 0,
    configure_schedule: (row?.scheduled_count ?? 0) > 0,
    add_secret: Boolean(row?.has_secret),
    trigger_manual_run: Boolean(row?.has_manual),
    first_successful_run: Boolean(row?.has_success)
  };

  const [saved] = await db
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.userId, userId));

  const savedSet = new Set<OnboardingStepId>((saved?.completedSteps ?? []) as OnboardingStepId[]);
  const steps: OnboardingStepStateDTO[] = STEP_ORDER.map((id) => ({
    id,
    title: STEP_COPY[id].title,
    description: STEP_COPY[id].description,
    completed: derivedComplete[id] || savedSet.has(id)
  }));

  const completedCount = steps.filter((step) => step.completed).length;
  const completed = completedCount === steps.length;
  const nextStep = steps.find((step) => !step.completed)?.id ?? null;

  return {
    completed,
    progressPercent: Math.round((completedCount / steps.length) * 100),
    nextStep,
    steps
  };
}

export async function setOnboardingStepCompleted(userId: string, step: OnboardingStepId) {
  const [saved] = await db
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.userId, userId));

  const current = new Set<string>(saved?.completedSteps ?? []);
  current.add(step);

  if (saved) {
    await db
      .update(onboardingProgress)
      .set({
        completedSteps: Array.from(current),
        updatedAt: new Date()
      })
      .where(and(eq(onboardingProgress.userId, userId)));
    return;
  }

  await db.insert(onboardingProgress).values({
    userId,
    completedSteps: Array.from(current),
    dismissed: false
  });
}
