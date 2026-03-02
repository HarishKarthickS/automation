"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { RunDTO } from "@automation/shared";
import { useRequireSession } from "@/lib/session";
import { useRuns } from "@/hooks/use-api";
import { RunTable } from "@/components/runs/run-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AutomationRunsPage() {
  const session = useRequireSession();
  const params = useParams<{ id: string }>();
  const [selected, setSelected] = useState<RunDTO | null>(null);
  const { data, isLoading, error } = useRuns(params.id, 50);

  const runs = data?.items ?? [];

  if (session.loading || isLoading) {
    return (
      <section className="page-shell py-10">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl">Run History</h1>
          <p className="text-sm text-muted-foreground">Execution timeline, outputs, and failures.</p>
        </div>
        <Link href={`/automations/${params.id}`} className="text-sm text-accent hover:underline">
          Back to automation
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">Failed to load runs</p>}

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card className="panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Execution list</CardTitle>
            <CardDescription>Latest run first. Select one to inspect logs.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
          <RunTable runs={runs} onViewLog={(run) => { setSelected(run); }} />
          </CardContent>
        </Card>

        <aside className="panel space-y-3 p-5 lg:sticky lg:top-24 lg:h-fit">
          <h2 className="font-serif text-2xl">Log Viewer</h2>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a run to inspect logs.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Run {selected.id}</p>
              <pre className="max-h-[420px] overflow-auto rounded-xl border border-border bg-muted/35 p-3 font-mono text-xs leading-5">
                {selected.output || selected.error || "No logs captured"}
              </pre>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
