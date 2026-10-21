import Link from "next/link";
import type { TemplateDTO } from "@automation/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Copy, User } from "lucide-react";

interface TemplateCardProps {
  template: TemplateDTO;
}

const runtimeLabels = { python312: "Python", go122: "Go", rust183: "Rust", java21: "Java", cpp23: "C++", nodejs20: "Node.js" };

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border bg-card transition-colors hover:border-foreground/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium tracking-tight">{template.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">{runtimeLabels[template.runtime]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-6">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {template.description || "No description provided"}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4 border-t px-6 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {template.ownerName}
          </span>
          <span className="flex items-center gap-1">
            <Copy className="h-3 w-3" />
            {template.cloneCount} {template.cloneCount === 1 ? "clone" : "clones"}
          </span>
          <Badge variant="outline" className="font-mono text-[10px] font-normal">
            {template.cronExpr}
          </Badge>
        </div>
        <Button asChild variant="outline" size="sm" className="self-end">
          <Link href={`/templates/${template.id}`} prefetch>
            <FileCode className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
