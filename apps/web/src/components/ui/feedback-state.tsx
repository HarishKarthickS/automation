import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedbackStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: "default" | "destructive";
  action?: ReactNode;
}

export function FeedbackState({
  title,
  description,
  icon,
  tone = "default",
  action
}: FeedbackStateProps) {
  const toneClass =
    tone === "destructive" ? "border-destructive/50 bg-destructive/10" : "border-border/80 bg-card";

  return (
    <Card className={toneClass}>
      <CardHeader className="items-center text-center">
        {icon}
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {action ? (
        <CardContent className="flex justify-center pt-0">
          {action}
        </CardContent>
      ) : null}
    </Card>
  );
}
