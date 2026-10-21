"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  useCompleteOnboardingStep,
  useOnboardingStatus,
} from "@/hooks/use-api";

const STEP_LINKS: Record<string, string> = {
  create_automation: "/automations/new",
  configure_schedule: "/automations/new",
  add_secret: "/dashboard",
  trigger_manual_run: "/dashboard",
  first_successful_run: "/dashboard",
};

export function OnboardingChecklist() {
  const { data, isLoading } = useOnboardingStatus();
  const completeStep = useCompleteOnboardingStep();
  const status = data?.status;

  if (isLoading || !status || status.completed) {
    return null;
  }

  return (
    <details className="rounded-md border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>
          Workspace checklist{" "}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {status.progressPercent}% complete
          </span>
        </span>
        <span className="font-mono text-xs text-primary">View steps +</span>
      </summary>
      <CardContent className="space-y-3">
        {status.steps.map((step) => (
          <div
            key={step.id}
            className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              {step.completed ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
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
    </details>
  );
}
