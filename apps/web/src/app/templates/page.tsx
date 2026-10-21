"use client";

import { useState, useCallback } from "react";
import { TemplateCard } from "@/components/templates/template-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTemplates } from "@/hooks/use-api";
import { TemplateCardSkeleton } from "@/components/ui/skeleton";
import { Search, FileCode, TrendingUp, Clock } from "lucide-react";
import { FeedbackState } from "@/components/ui/feedback-state";

export default function TemplatesPage() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "recent">("popular");
  const { data, isLoading, error } = useTemplates(40, undefined, searchQuery, sortBy);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(query);
  }, [query]);

  return (
    <section className="page-shell space-y-7 py-8">
      <header className="flex flex-col justify-between gap-4 border-b pb-8 sm:flex-row sm:items-end">
        <div><p className="eyebrow">The script library</p><h1 className="page-heading mt-3">Templates</h1><p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">A starting point for your next automation. Read the code, make it yours, then set a schedule.</p></div>
        <p className="font-mono text-[10px] text-muted-foreground">SHARED SCRIPTS / TRUSTED CODE ONLY</p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search templates"
              placeholder="Find a script…"
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as "popular" | "recent")}>
          <TabsList>
            <TabsTrigger value="popular" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Popular
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="h-4 w-4" />
              Recent
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <FeedbackState
          tone="destructive"
          title="Unable to load templates"
          description="Please refresh and try again."
        />
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.items && data.items.length === 0 ? (
        <FeedbackState
          title="No templates found"
          description={
            searchQuery ? "Try a different search term." : "Check back later for new templates."
          }
          icon={<FileCode className="h-10 w-10 text-muted-foreground" />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </section>
  );
}
