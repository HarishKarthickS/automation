"use client";

import Link from "next/link";
import { useRequireSession } from "@/lib/session";
import { useAutomations, useKpiSummary, useReliabilitySummary } from "@/hooks/use-api";
import { AutomationList } from "@/components/dashboard/automation-list";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileCode, Calendar, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { FeedbackState } from "@/components/ui/feedback-state";

export default function DashboardPage() {
  const session = useRequireSession();
  const { data, isLoading, error } = useAutomations(25);
  const { data: reliabilityData } = useReliabilitySummary();
  const { data: kpiData } = useKpiSummary();

  if (session.loading || isLoading) {
    return (
      <section className="page-shell py-10">
        <DashboardSkeleton />
      </section>
    );
  }

  if (!session.user) {
    return null;
  }

  const automations = data?.items ?? [];
  const activeCount = automations.filter((item) => item.enabled).length;
  const pausedCount = automations.length - activeCount;
  const reliability = reliabilityData?.summary;
  const kpi = kpiData?.kpi;
  const riskyAutomations = automations.filter((item) => !item.enabled).slice(0, 3);

  return (
    <section className="page-shell fade-in space-y-8 py-8">
      <Card className="hero-surface overflow-hidden border-border/80">
        <CardHeader className="pb-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <CardDescription className="text-xs uppercase tracking-[0.16em]">Workspace Control Room</CardDescription>
              <CardTitle className="mt-2 font-serif text-4xl sm:text-5xl">Automation Dashboard</CardTitle>
              <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Design, launch, and monitor secure automations with a reliability-first workflow.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href="/templates">
                    <FileCode className="mr-2 h-4 w-4" />
                    Browse templates
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/automations/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create automation
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/85 p-5">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Reliability Snapshot
              </p>
              <p className="mt-3 font-serif text-4xl">{reliability ? `${reliability.successRate}%` : "--"}</p>
              <p className="text-sm text-muted-foreground">24h run success rate</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="font-semibold">{reliability?.failedRuns ?? 0}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Exhausted</p>
                  <p className="font-semibold">{reliability?.exhaustedRetries ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <OnboardingChecklist />

      {error && (
        <FeedbackState
          tone="destructive"
          title="Unable to load automations"
          description="Please refresh the page and try again."
        />
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>Total automations</CardDescription>
            <CardTitle className="font-serif text-3xl">{automations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="font-serif text-3xl text-success">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>Paused</CardDescription>
            <CardTitle className="font-serif text-3xl">{pausedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>Runs in window</CardDescription>
            <CardTitle className="font-serif text-3xl">{reliability?.totalRuns ?? 0}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {reliability ? `${reliability.failedRuns} failed | ${reliability.exhaustedRetries} exhausted` : "Loading reliability..."}
            </p>
          </CardHeader>
        </Card>
      </div>

      <Card className="panel">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-2xl">Growth Metrics (7d)</CardTitle>
          <CardDescription>KPI tracking for activation and execution outcomes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card/90 p-3">
            <p className="text-xs text-muted-foreground">Automations created</p>
            <p className="text-2xl font-semibold">{kpi?.automationsCreated ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/90 p-3">
            <p className="text-xs text-muted-foreground">Manual runs triggered</p>
            <p className="text-2xl font-semibold">{kpi?.manualRunsTriggered ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/90 p-3">
            <p className="text-xs text-muted-foreground">Successful runs</p>
            <p className="text-2xl font-semibold">{kpi?.successfulRuns ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/90 p-3">
            <p className="text-xs text-muted-foreground">First success latency</p>
            <p className="text-2xl font-semibold">
              {typeof kpi?.firstSuccessLatencyMinutes === "number" ? `${kpi.firstSuccessLatencyMinutes}m` : "--"}
            </p>
          </div>
        </CardContent>
      </Card>

      {riskyAutomations.length > 0 && (
        <Card className="panel border-warning/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Needs attention
            </CardTitle>
            <CardDescription>Paused automations that may require action.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            {riskyAutomations.map((automation) => (
              <Link
                key={automation.id}
                href={`/automations/${automation.id}`}
                className="rounded-xl border border-border/70 bg-card/80 p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <p className="font-semibold">{automation.name}</p>
                <p className="text-xs text-muted-foreground">Currently paused</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {automations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {automations.slice(0, 6).map((automation) => (
            <Card key={automation.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold">
                    {automation.name}
                  </CardTitle>
                  <Badge variant={automation.enabled ? "success" : "secondary"} className="text-xs">
                    {automation.enabled ? "Active" : "Paused"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Next: {new Date(automation.nextRunAt).toLocaleString()}</span>
                </div>
                <Button variant="ghost" size="sm" className="mt-3 w-full" asChild>
                  <Link href={`/automations/${automation.id}`}>
                    View details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AutomationList automations={automations} />
    </section>
  );
}
