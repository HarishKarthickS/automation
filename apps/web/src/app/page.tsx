import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Sparkles, Gauge } from "lucide-react";

export default function HomePage() {
  return (
    <section className="page-shell space-y-8 py-14 sm:py-20">
      <div className="hero-surface overflow-hidden rounded-3xl border border-border/80 p-8 sm:p-12">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Secure Automation Platform</p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight sm:text-6xl">
          Ship reliable cron automations with enterprise safety and startup speed.
        </h1>
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Automiq combines encrypted secrets, controlled execution, and complete run visibility so teams can automate
          with confidence from day one.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Start building
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/templates">Explore templates</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="panel p-6">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Secure by default
          </p>
          <h2 className="mt-2 font-serif text-2xl">Protected execution</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Secrets are encrypted server-side and injected only at runtime.
          </p>
        </article>
        <article className="panel p-6">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Gauge className="h-3.5 w-3.5 text-warning" />
            Operator clarity
          </p>
          <h2 className="mt-2 font-serif text-2xl">Actionable visibility</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Track success rates, retries, and failures from one control room.
          </p>
        </article>
        <article className="panel p-6">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Fast onboarding
          </p>
          <h2 className="mt-2 font-serif text-2xl">First run in minutes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Guided workflow and templates help new users reach first success quickly.
          </p>
        </article>
      </div>

      <div className="panel flex flex-col gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ready to automate?</p>
          <h3 className="mt-1 font-serif text-3xl">Launch your first reliable workflow today.</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/signup">Create account</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">View dashboard</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

