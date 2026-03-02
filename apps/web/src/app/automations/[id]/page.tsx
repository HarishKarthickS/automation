"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { AutomationDTO } from "@automation/shared";
import { apiFetch } from "@/lib/api";
import { useRequireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { AutomationForm } from "@/components/forms/automation-form";
import { SecretManager } from "@/components/forms/secret-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function AutomationDetailsPage() {
  const session = useRequireSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [automation, setAutomation] = useState<AutomationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.user) {
      return;
    }

    const loadAutomation = async () => {
      setLoading(true);
      try {
        const response = await apiFetch<{ automation: AutomationDTO }>(`/automations/${params.id}`, {
          skipCsrf: true
        });
        setAutomation(response.automation);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load automation");
      } finally {
        setLoading(false);
      }
    };

    loadAutomation();
  }, [params.id, session.user]);

  const publish = async (publishState: boolean) => {
    if (!automation) {
      return;
    }

    setActionLoading(true);
    try {
      const endpoint = publishState
        ? `/automations/${automation.id}/publish`
        : `/automations/${automation.id}/unpublish`;
      const response = await apiFetch<{ automation: AutomationDTO }>(endpoint, {
        method: "POST",
        body: {}
      });
      setAutomation(response.automation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update publishing state");
    } finally {
      setActionLoading(false);
    }
  };

  const trigger = async () => {
    if (!automation) {
      return;
    }

    setActionLoading(true);
    try {
      await apiFetch(`/automations/${automation.id}/trigger`, { method: "POST", body: {} });
      router.push(`/automations/${automation.id}/runs`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger run");
    } finally {
      setActionLoading(false);
    }
  };

  const remove = async () => {
    if (!automation) {
      return;
    }

    if (!window.confirm("Delete this automation? This cannot be undone.")) {
      return;
    }

    setActionLoading(true);
    try {
      await apiFetch(`/automations/${automation.id}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete automation");
    } finally {
      setActionLoading(false);
    }
  };

  if (session.loading || loading) {
    return (
      <section className="page-shell py-10">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </section>
    );
  }

  if (!automation) {
    return (
      <section className="page-shell py-10">
        <p className="text-sm text-destructive">{error ?? "Automation not found"}</p>
      </section>
    );
  }

  return (
    <section className="page-shell space-y-6 py-8">
      <div className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl">{automation.name}</h1>
          <p className="text-sm text-muted-foreground">Manage code, secrets, publishing, and execution.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={automation.enabled ? "success" : "warning"}>
              {automation.enabled ? "Enabled" : "Paused"}
            </Badge>
            {automation.isTemplatePublished && <Badge variant="secondary">Template published</Badge>}
            <Badge variant="outline">TZ: {automation.timezone}</Badge>
            <Badge variant="outline">Timeout: {automation.timeoutSeconds}s</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/automations/${automation.id}/runs`}>
            <Button variant="ghost">View runs</Button>
          </Link>
          <Button onClick={trigger} disabled={actionLoading}>
            Run now
          </Button>
          <Button
            variant="ghost"
            onClick={() => publish(!automation.isTemplatePublished)}
            disabled={actionLoading}
          >
            {automation.isTemplatePublished ? "Unpublish template" : "Publish template"}
          </Button>
          <Button variant="destructive" onClick={remove} disabled={actionLoading}>
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <AutomationForm mode="edit" automation={automation} />
      <SecretManager automationId={automation.id} />
    </section>
  );
}

