"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRequireSession } from "@/lib/session";
import { apiFetch, ensureCsrfToken } from "@/lib/api";
import {
  useAdminAuditLogs,
  useAdminAutomations,
  useAdminOverview,
  useAdminRuns,
  useAdminTemplates,
  useAdminUsers
} from "@/hooks/use-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

async function performAdminDelete(path: string, action: string, resourceType: string, resourceId: string) {
  const reason = window.prompt(`Reason for ${action} on ${resourceType} ${resourceId}:`);
  if (!reason || reason.trim().length < 3) {
    throw new Error("Reason is required (min 3 characters).");
  }
  const preflight = await apiFetch<{ token: string }>("/admin/actions/preflight", {
    method: "POST",
    body: {
      action,
      resourceType,
      resourceId,
      reason: reason.trim()
    }
  });
  const csrf = await ensureCsrfToken();
  const response = await fetch(`/api/v1${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "x-csrf-token": csrf,
      "x-admin-action-token": preflight.token
    }
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error((details as any)?.message ?? "Delete failed");
  }
}

export default function AdminPage() {
  const session = useRequireSession();
  const queryClient = useQueryClient();
  const overview = useAdminOverview();
  const users = useAdminUsers();
  const automations = useAdminAutomations();
  const runs = useAdminRuns();
  const templates = useAdminTemplates();
  const audits = useAdminAuditLogs();

  const loading =
    session.loading ||
    overview.isLoading ||
    users.isLoading ||
    automations.isLoading ||
    runs.isLoading ||
    templates.isLoading ||
    audits.isLoading;

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "automations"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "runs"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] })
    ]);
  };

  if (session.loading) {
    return (
      <section className="page-shell py-8">
        <p className="text-sm text-muted-foreground">Loading admin console...</p>
      </section>
    );
  }

  if (!session.user?.isAdmin) {
    return (
      <section className="page-shell py-8">
        <Card className="panel border-destructive/40">
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>Your account is not authorized to access this area.</CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  const alertBadges = useMemo(() => {
    const alerts = (overview.data as any)?.alerts?.alerts as Array<{ key: string; status: string; message: string }> | undefined;
    return alerts ?? [];
  }, [overview.data]);

  return (
    <section className="page-shell space-y-6 py-8">
      <Card className="hero-surface border-border/80">
        <CardHeader>
          <CardDescription className="text-xs uppercase tracking-[0.16em]">Platform Control</CardDescription>
          <CardTitle className="font-serif text-4xl">Admin Console</CardTitle>
          <p className="text-sm text-muted-foreground">
            Full platform operations with audited changes and destructive-action safeguards.
          </p>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading admin data...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="stat-card"><CardHeader><CardDescription>Users</CardDescription><CardTitle>{(overview.data as any)?.counts?.usersTotal ?? 0}</CardTitle></CardHeader></Card>
            <Card className="stat-card"><CardHeader><CardDescription>Suspended</CardDescription><CardTitle>{(overview.data as any)?.counts?.usersSuspended ?? 0}</CardTitle></CardHeader></Card>
            <Card className="stat-card"><CardHeader><CardDescription>Automations</CardDescription><CardTitle>{(overview.data as any)?.counts?.automationsTotal ?? 0}</CardTitle></CardHeader></Card>
            <Card className="stat-card"><CardHeader><CardDescription>Runs 24h</CardDescription><CardTitle>{(overview.data as any)?.counts?.runs24h ?? 0}</CardTitle></CardHeader></Card>
            <Card className="stat-card"><CardHeader><CardDescription>Templates</CardDescription><CardTitle>{(overview.data as any)?.counts?.templatesPublished ?? 0}</CardTitle></CardHeader></Card>
          </div>

          <Card className="panel">
            <CardHeader>
              <CardTitle>Alert Status</CardTitle>
              <CardDescription>Derived from observability thresholds.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {alertBadges.map((a) => (
                <Badge key={a.key} variant={a.status === "critical" ? "destructive" : a.status === "warn" ? "warning" : "success"}>
                  {a.key}: {a.status}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader><CardTitle>Users</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {users.data?.items.slice(0, 20).map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.email}</span>
                    <Badge variant={u.role === "admin" ? "secondary" : "outline"}>{u.role}</Badge>
                    {u.suspended && <Badge variant="destructive">Suspended</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await apiFetch(`/admin/users/${u.id}`, {
                          method: "PATCH",
                          body: { suspended: !u.suspended, reason: "Admin moderation update" }
                        });
                        toast.success("User updated");
                        await invalidateAll();
                      }}
                    >
                      {u.suspended ? "Unsuspend" : "Suspend"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await performAdminDelete(`/admin/users/${u.id}`, "user_delete", "user", u.id);
                          toast.success("User deleted");
                          await invalidateAll();
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Delete failed");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader><CardTitle>Automations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {automations.data?.items.slice(0, 20).map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.name}</span>
                    <Badge variant={a.enabled ? "success" : "warning"}>{a.enabled ? "enabled" : "disabled"}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await apiFetch(`/admin/automations/${a.id}`, {
                          method: "PATCH",
                          body: { enabled: !a.enabled, reason: "Admin automation control" }
                        });
                        toast.success("Automation updated");
                        await invalidateAll();
                      }}
                    >
                      {a.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await performAdminDelete(`/admin/automations/${a.id}`, "automation_delete", "automation", a.id);
                          toast.success("Automation deleted");
                          await invalidateAll();
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Delete failed");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader><CardTitle>Recent Runs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {runs.data?.items.slice(0, 20).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{r.id.slice(0, 8)}</span>
                    <Badge variant="outline">{r.status}</Badge>
                    <span className="text-muted-foreground">attempt {r.attempt}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await performAdminDelete(`/admin/runs/${r.id}`, "run_delete", "run", r.id);
                        toast.success("Run deleted");
                        await invalidateAll();
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Delete failed");
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader><CardTitle>Audit Logs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {audits.data?.items.slice(0, 30).map((log) => (
                <div key={log.id} className="rounded-lg border border-border/70 p-3 text-xs">
                  <p><span className="font-semibold">{log.action}</span> on {log.resourceType}:{log.resourceId}</p>
                  <p className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()} | {log.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
