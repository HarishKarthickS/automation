"use client";
import { useState } from "react";
import Link from "next/link";
import { useRequireSession } from "@/lib/session";
import { useAutomations } from "@/hooks/use-api";
import { AutomationList } from "@/components/dashboard/automation-list";
import { Button } from "@/components/ui/button";

export default function AutomationsPage() {
  const session = useRequireSession();
  const [pages, setPages] = useState<Array<string | undefined>>([undefined]);
  const { data, isLoading, error, refetch } = useAutomations(20, pages[pages.length - 1]);
  if (session.loading || isLoading) return <section className="page-shell py-10" aria-busy="true">Loading automations…</section>;
  if (!session.user) return null;
  return <section className="page-shell space-y-6 py-10">
    <header className="flex items-center justify-between gap-4"><h1 className="page-heading">All automations</h1><Button asChild><Link href="/automations/new">New automation</Link></Button></header>
    {error ? <div role="alert" className="space-y-3"><p>Unable to load automations.</p><Button onClick={() => void refetch()}>Try again</Button><Button variant="outline" onClick={() => setPages([undefined])}>Restart list</Button></div> : <AutomationList automations={data?.items ?? []} />}
    <nav aria-label="Automation pages" className="flex items-center justify-between gap-4">
      <Button variant="outline" disabled={pages.length === 1} onClick={() => setPages((current) => current.slice(0, -1))}>Previous</Button>
      <span className="text-sm text-muted-foreground">Page {pages.length}</span>
      <Button variant="outline" disabled={!data?.nextCursor || !!error} onClick={() => setPages((current) => [...current, data?.nextCursor ?? undefined])}>Next</Button>
    </nav>
  </section>;
}
