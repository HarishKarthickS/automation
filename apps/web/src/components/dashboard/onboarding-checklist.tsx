"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompleteOnboardingStep, useOnboardingStatus } from "@/hooks/use-api";

const STEP_LINKS: Record<string, string> = {
  create_automation: "/automations/new",
  configure_schedule: "/automations/new",
  add_secret: "/dashboard",
  trigger_manual_run: "/dashboard",
  first_successful_run: "/dashboard"
};

export function OnboardingChecklist() {
  const { data, isLoading } = useOnboardingStatus();
  const completeStep = useCompleteOnboardingStep();
  const status = data?.status;

  if (isLoading || !status || status.completed) {
    return null;
  }

  return (
    <Card className="hero-surface overflow-hidden border-border/80">
      <CardHeader>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Onboarding Sprint
        </div>
        <CardTitle className="font-serif text-3xl">Get to your first successful run</CardTitle>
        <CardDescription>
          Progress {status.progressPercent}% complete. Finish this checklist to activate your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.steps.map((step) => (
          <div
            key={step.id}
            className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/85 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              {step.completed ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!step.completed && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => completeStep.mutate(step.id)}
                    disabled={completeStep.isPending}
                  >
                    Mark done
                  </Button>
                  <Button asChild size="sm">
                    <Link href={STEP_LINKS[step.id] ?? "/dashboard"}>Open</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
