"use client";

import Link from "next/link";
import { useRequireSession } from "@/lib/session";
import { useDashboardOverview } from "@/hooks/use-api";
import { AutomationList } from "@/components/dashboard/automation-list";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileCode, AlertTriangle } from "lucide-react";
import { FeedbackState } from "@/components/ui/feedback-state";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

export default function DashboardPage() {
  const session = useRequireSession();
  const { data, isLoading, error } = useDashboardOverview();

  if (session.loading || isLoading) {
    return (
      <section className="page-shell py-8">
        <DashboardSkeleton />
      </section>
    );
  }

  if (!session.user) {
    return null;
  }

  const overview = data?.overview;
  const automations = overview?.automations ?? [];
  const reliability = overview?.reliability;
  const kpi = overview?.kpi;

  return (
    <section className="page-shell space-y-6 py-6">
      <Card className="panel border-border/70 shadow-sm">
        <CardHeader className="pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="text-xs uppercase tracking-[0.14em]">Control Room</CardDescription>
              <CardTitle className="mt-2 font-serif text-3xl sm:text-4xl">Automation Dashboard</CardTitle>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Reliable scheduling and code execution with a lightweight operating profile.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/templates">
                  <FileCode className="mr-2 h-4 w-4" />
                  Templates
                </Link>
              </Button>
              <Button asChild>
                <Link href="/automations/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New automation
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <OnboardingChecklist />

      {error && (
        <FeedbackState
          tone="destructive"
          title="Unable to load dashboard overview"
          description="Refresh and try again."
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="font-serif text-3xl">{overview?.counts.totalAutomations ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="font-serif text-3xl text-success">{overview?.counts.activeAutomations ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>Paused</CardDescription>
            <CardTitle className="font-serif text-3xl">{overview?.counts.pausedAutomations ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>Success rate (24h)</CardDescription>
            <CardTitle className="font-serif text-3xl">{reliability ? `${reliability.successRate}%` : "--"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="panel">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-2xl">Growth Metrics (7d)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile label="Created" value={kpi?.automationsCreated ?? 0} />
          <MetricTile label="Manual runs" value={kpi?.manualRunsTriggered ?? 0} />
          <MetricTile label="Successful runs" value={kpi?.successfulRuns ?? 0} />
          <MetricTile
            label="First success latency"
            value={typeof kpi?.firstSuccessLatencyMinutes === "number" ? `${kpi.firstSuccessLatencyMinutes}m` : "--"}
          />
        </CardContent>
      </Card>

      {overview && overview.needsAttention.length > 0 && (
        <Card className="panel border-warning/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Needs attention
            </CardTitle>
            <CardDescription>Recently paused automations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            {overview.needsAttention.map((item) => (
              <Link
                key={item.id}
                href={`/automations/${item.id}`}
                className="rounded-lg border border-border/70 bg-card/90 p-3 text-sm transition-colors hover:bg-accent/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{item.name}</p>
                  <Badge variant="secondary">Paused</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {dateFormatter.format(new Date(item.updatedAt))}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <AutomationList automations={automations} />
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/90 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
