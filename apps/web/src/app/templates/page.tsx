"use client";

import { useState, useCallback } from "react";
import { TemplateCard } from "@/components/templates/template-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <section className="page-shell space-y-6 py-8">
      <Card className="hero-surface">
        <CardHeader className="pb-6">
          <CardDescription className="text-xs uppercase tracking-[0.16em]">
            Marketplace
          </CardDescription>
          <CardTitle className="mt-1 font-serif text-3xl">Automation Templates</CardTitle>
          <p className="text-sm text-muted-foreground">
            Discover public automations and clone them into your workspace.
          </p>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates..."
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
