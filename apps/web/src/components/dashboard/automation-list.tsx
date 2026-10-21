import Link from "next/link";
import type { AutomationDTO } from "@automation/shared";
import { ArrowRight, Clock3, FileCode2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AutomationList({
  automations,
}: {
  automations: AutomationDTO[];
}) {
  if (automations.length === 0)
    return (
      <div className="rounded-md border border-dashed px-6 py-14 text-center">
        <FileCode2
          className="mx-auto mb-4 h-7 w-7 text-muted-foreground"
          strokeWidth={1.3}
        />
        <h3 className="text-lg font-medium tracking-tight">
          Your first automation starts here.
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a script and a schedule, or start with a template.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/automations/new">
              <Plus className="h-4 w-4" />
              Create automation
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/templates">Browse templates</Link>
          </Button>
        </div>
      </div>
    );
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_auto] gap-6 border-b bg-muted/40 px-5 py-3 md:grid">
        <span className="eyebrow">Automation</span>
        <span className="eyebrow">Schedule</span>
        <span className="eyebrow">Next run</span>
        <span className="eyebrow w-24 text-right">Actions</span>
      </div>
      {automations.map((automation) => (
        <article
          key={automation.id}
          className="grid gap-4 border-b px-5 py-5 transition-colors last:border-0 hover:bg-muted/25 md:grid-cols-[minmax(0,2fr)_1fr_1fr_auto] md:items-center md:gap-6"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/automations/${automation.id}`}
                className="truncate text-sm font-medium hover:underline"
              >
                {automation.name}
              </Link>
              <Badge variant={automation.enabled ? "success" : "secondary"}>
                {automation.enabled ? "Active" : "Paused"}
              </Badge>
              {automation.isTemplatePublished && (
                <Badge variant="outline">Published</Badge>
              )}
            </div>
            <p className="mt-1.5 truncate text-xs text-muted-foreground">
              {automation.description || automation.runtime}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs">{automation.cronExpr}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {automation.timezone} <span className="mx-1 opacity-40">/</span>{" "}
              {automation.timeoutSeconds}s limit
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Clock3 className="h-3 w-3" />
              {new Date(automation.nextRunAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="mt-1 font-mono text-[11px]">
              {new Date(automation.nextRunAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex w-24 items-center justify-end gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/automations/${automation.id}/runs`}>Runs</Link>
            </Button>
            <Button asChild variant="outline" size="icon" className="h-8 w-8">
              <Link
                href={`/automations/${automation.id}`}
                aria-label={`Edit ${automation.name}`}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
