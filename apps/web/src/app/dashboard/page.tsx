"use client";

import Link from "next/link";
import { useRequireSession } from "@/lib/session";
import { useDashboardOverview } from "@/hooks/use-api";
import { AutomationList } from "@/components/dashboard/automation-list";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpRight, AlertTriangle } from "lucide-react";
import { FeedbackState } from "@/components/ui/feedback-state";

export default function DashboardPage() {
  const session = useRequireSession();
  const { data, isLoading, error } = useDashboardOverview();
  if (session.loading || isLoading)
    return (
      <section className="page-shell py-8">
        <DashboardSkeleton />
      </section>
    );
  if (session.error || (error && !data)) return (
    <section className="page-shell space-y-6 py-10">
      <h1 className="page-heading">Workspace unavailable</h1>
      <FeedbackState tone="destructive" title={session.error ? "Unable to check your session" : "Unable to load your automations"} description="Your data has not been changed. Try again in a moment." />
      <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
    </section>
  );
  if (!session.user) return null;
  const overview = data?.overview;
  const automations = overview?.automations ?? [];
  const reliability = overview?.reliability;
  const kpi = overview?.kpi;
  const metrics = [
    { label: "Automations", value: overview?.counts.totalAutomations ?? "—" },
    {
      label: "Active schedules",
      value: overview?.counts.activeAutomations ?? "—",
    },
    { label: "Paused", value: overview?.counts.pausedAutomations ?? "—" },
    {
      label: "Success rate · 24h",
      value: reliability ? `${reliability.successRate}%` : "—",
    },
  ];
  return (
    <section className="page-shell space-y-9 py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1 className="page-heading mt-3">Overview</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your automations, and how they’re doing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/templates">
              Templates <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild>
            <Link href="/automations/new">
              <Plus className="h-4 w-4" />
              New automation
            </Link>
          </Button>
        </div>
      </header>
      {error && (
        <FeedbackState
          tone="destructive"
          title="Unable to load workspace"
          description="Refresh to try again. Your automations have not been changed."
        />
      )}
      <div className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-md border bg-card lg:grid-cols-4">
        {metrics.map(({ label, value }, index) => (
          <div
            key={label}
            className={`px-5 py-6 ${index > 1 ? "border-t lg:border-t-0" : ""}`}
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-3 font-mono text-3xl font-medium tracking-tight tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>
      {overview && overview.needsAttention.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-warning/25 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium">
              {overview.needsAttention.length} paused{" "}
              {overview.needsAttention.length === 1
                ? "automation needs"
                : "automations need"}{" "}
              a look
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {overview.needsAttention.map((item) => (
                <Link
                  key={item.id}
                  href={`/automations/${item.id}`}
                  className="text-xs text-muted-foreground underline underline-offset-4"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium tracking-tight">
            Automations{" "}
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {automations.length}
            </span>
          </h2>
          <p className="hidden font-mono text-[10px] text-muted-foreground sm:block">
            SCRIPTS / SCHEDULES / RUNS
          </p>
        </div>
        <AutomationList automations={automations} />
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {automations.length} of {overview?.counts.totalAutomations ?? 0}</span>
          <Button asChild variant="outline"><Link href="/automations">View all automations</Link></Button>
        </div>
      </div>
      <OnboardingChecklist />
      {kpi && (
        <section className="border-t pt-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-medium">Activity</h2>
            <p className="eyebrow">Last 7 days</p>
          </div>
          <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              ["Automations created", kpi.automationsCreated],
              ["Manual runs", kpi.manualRunsTriggered],
              ["Successful runs", kpi.successfulRuns],
              [
                "Time to first success",
                typeof kpi.firstSuccessLatencyMinutes === "number"
                  ? `${kpi.firstSuccessLatencyMinutes} min`
                  : "—",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-2 font-mono text-lg">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </section>
  );
}
