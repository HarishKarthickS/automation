import Link from "next/link";
import type { TemplateDTO } from "@automation/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Copy, User } from "lucide-react";

interface TemplateCardProps {
  template: TemplateDTO;
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Card className="group transition-all hover:-translate-y-1 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="font-serif text-lg">{template.name}</CardTitle>
          <Badge variant="secondary">Template</Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {template.description || "No description provided"}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {template.ownerName}
          </span>
          <span className="flex items-center gap-1">
            <Copy className="h-3 w-3" />
            {template.cloneCount} clones
          </span>
          <Badge variant="outline" className="text-xs font-normal">
            {template.cronExpr}
          </Badge>
        </div>
        <Button asChild variant="outline" size="sm" className="opacity-0 transition-opacity group-hover:opacity-100">
          <Link href={`/templates/${template.id}`} prefetch>
            <FileCode className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
