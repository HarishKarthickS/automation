import Link from "next/link";
import type { AutomationDTO } from "@automation/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AutomationListProps {
  automations: AutomationDTO[];
}

export function AutomationList({ automations }: AutomationListProps) {
  if (automations.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <h3 className="font-serif text-2xl">No automations yet</h3>
        <p className="mt-2 text-muted-foreground">Create your first automation or clone a template.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/automations/new" prefetch>
            <Button>Create automation</Button>
          </Link>
          <Link href="/templates" prefetch>
            <Button variant="ghost">Browse templates</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {automations.map((automation) => (
        <article key={automation.id} className="panel p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl">{automation.name}</h3>
                <Badge variant={automation.enabled ? "success" : "warning"}>
                  {automation.enabled ? "Enabled" : "Disabled"}
                </Badge>
                {automation.isTemplatePublished && <Badge>Template</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{automation.description || "No description"}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Next: {new Date(automation.nextRunAt).toLocaleString()}</span>
                <span>Timeout: {automation.timeoutSeconds}s</span>
                <span>TZ: {automation.timezone}</span>
              </div>
              {automation.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {automation.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/automations/${automation.id}/runs`} prefetch>
                <Button variant="ghost">Runs</Button>
              </Link>
              <Link href={`/automations/${automation.id}`} prefetch>
                <Button>Edit</Button>
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
