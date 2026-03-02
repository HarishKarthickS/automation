"use client";

import { useRequireSession } from "@/lib/session";
import { AutomationForm } from "@/components/forms/automation-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewAutomationPage() {
  const session = useRequireSession();

  if (session.loading || !session.user) {
    return (
      <section className="page-shell py-10">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </section>
    );
  }

  return (
    <section className="page-shell space-y-6 py-8">
      <Card className="hero-surface">
        <CardHeader>
          <CardDescription className="text-xs uppercase tracking-[0.16em]">Builder</CardDescription>
          <CardTitle className="font-serif text-4xl">Create automation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Define schedule, runtime code, and execution limits in one flow.
          </p>
        </CardHeader>
      </Card>
      <AutomationForm mode="create" />
    </section>
  );
}

