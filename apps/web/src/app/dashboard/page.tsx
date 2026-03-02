"use client";

import Link from "next/link";
import { useRequireSession } from "@/lib/session";
import { useAutomations } from "@/hooks/use-api";
import { AutomationList } from "@/components/dashboard/automation-list";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileCode, Calendar, ArrowRight } from "lucide-react";
import { FeedbackState } from "@/components/ui/feedback-state";

export default function DashboardPage() {
  const session = useRequireSession();
  const { data, isLoading, error } = useAutomations(25);

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

  return (
    <section className="page-shell fade-in space-y-6 py-8">
      <Card className="hero-surface">
        <CardHeader className="pb-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardDescription className="text-xs uppercase tracking-[0.16em]">
                Workspace
              </CardDescription>
              <CardTitle className="mt-1 font-serif text-3xl">Automation Dashboard</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Create, run, and publish secure automations with complete execution visibility.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/templates">
                  <FileCode className="mr-2 h-4 w-4" />
                  Templates
                </Link>
              </Button>
              <Button asChild>
                <Link href="/automations/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <FeedbackState
          tone="destructive"
          title="Unable to load automations"
          description="Please refresh the page and try again."
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

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
