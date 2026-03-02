"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { TemplateDTO } from "@automation/shared";
import { apiFetch } from "@/lib/api";
import { CloneTemplateButton } from "@/components/templates/clone-template-button";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const [template, setTemplate] = useState<TemplateDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      try {
        const response = await apiFetch<{ template: TemplateDTO }>(`/templates/${params.id}`, { skipCsrf: true });
        setTemplate(response.template);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load template");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [params.id]);

  const copyCode = async () => {
    if (!template) {
      return;
    }
    try {
      await navigator.clipboard.writeText(template.code);
      toast.success("Template code copied");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  if (loading) {
    return (
      <section className="page-shell py-10">
        <p className="text-sm text-muted-foreground">Loading template...</p>
      </section>
    );
  }

  if (!template) {
    return (
      <section className="page-shell py-10">
        <p className="text-sm text-destructive">{error ?? "Template not found"}</p>
      </section>
    );
  }

  return (
    <section className="page-shell space-y-6 py-8">
      <div className="panel space-y-3 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Public Template</p>
        <h1 className="font-serif text-4xl">{template.name}</h1>
        <p className="text-sm text-muted-foreground">{template.description || "No description"}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>By {template.ownerName}</span>
          <span>Clones: {template.cloneCount}</span>
          <span>Cron: {template.cronExpr}</span>
          <span>Timezone: {template.timezone}</span>
        </div>
        <CloneTemplateButton templateId={template.id} templateName={template.name} />
        <p className="text-xs text-muted-foreground">Secrets are never copied. Add your own environment variables after clone.</p>
      </div>

      <div className="panel p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Template Code</h2>
          <Button variant="outline" size="sm" onClick={copyCode}>Copy code</Button>
        </div>
        <pre className="max-h-[560px] overflow-auto rounded-xl border border-border bg-muted/35 p-4 text-xs">
          {template.code}
        </pre>
      </div>
    </section>
  );
}
