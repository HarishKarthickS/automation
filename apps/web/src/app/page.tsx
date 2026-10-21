import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Code2,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const jobs = [
  {
    name: "daily-report.py",
    cron: "0 9 * * 1-5",
    time: "09:00",
    runtime: "Python",
  },
  {
    name: "sync-inventory.go",
    cron: "*/30 * * * *",
    time: "09:30",
    runtime: "Go",
  },
  {
    name: "cleanup.rs",
    cron: "0 0 * * 0",
    time: "Sun, 00:00",
    runtime: "Rust",
  },
];

export default function HomePage() {
  return (
    <div className="page-shell pb-0 pt-0">
      <section className="grid items-center gap-14 border-b py-16 lg:grid-cols-[1fr_1.03fr] lg:gap-16 lg:py-24">
        <div className="fade-in">
          <p className="eyebrow flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 bg-primary" /> A personal automation
            workspace
          </p>
          <h1 className="mt-7 max-w-xl text-[clamp(3.25rem,6vw,5.5rem)] font-medium leading-[0.98] tracking-[-0.065em]">
            Your scripts.
            <br />
            <span className="text-muted-foreground">On schedule.</span>
          </h1>
          <p className="mt-7 max-w-[400px] text-base leading-7 text-muted-foreground">
            Give your scripts a schedule and a place to run. Keep the code,
            secrets, and execution history together.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Create your workspace <ArrowRight className="ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/templates">Browse templates</Link>
            </Button>
          </div>
          <p className="mt-5 font-mono text-[11px] text-muted-foreground">
            Your scripts. Your schedule. One workspace.
          </p>
        </div>
        <div className="fade-in" style={{ animationDelay: "90ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">A small example</p>
            <span className="font-mono text-[10px] text-muted-foreground">
              WORKSPACE / 01
            </span>
          </div>
          <div className="specimen">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <span className="flex items-center gap-2 text-sm font-medium">
                <GitBranch className="h-4 w-4 text-primary" /> Daily report
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />{" "}
                SCHEDULED
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-muted/40 px-5 py-3 font-mono text-[10px] text-muted-foreground">
              <span>PYTHON 3.12</span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-3 w-3" /> 0 9 * * 1-5
              </span>
              <span>UTC</span>
            </div>
            <div
              className="specimen-code overflow-x-auto px-5 py-6 font-mono text-[11px] leading-7 sm:text-xs"
              aria-label="Example Python automation code"
            >
              <div>
                <span className="mr-5 select-none opacity-30">01</span>
                <span className="comment">
                  # A little less work, every morning.
                </span>
              </div>
              <div>
                <span className="mr-5 select-none opacity-30">02</span>
                <span className="token">import</span> os
              </div>
              <div>
                <span className="mr-5 select-none opacity-30">03</span>
              </div>
              <div>
                <span className="mr-5 select-none opacity-30">04</span>name =
                os.getenv(<span className="string">"REPORT_NAME"</span>,{" "}
                <span className="string">"daily"</span>)
              </div>
              <div>
                <span className="mr-5 select-none opacity-30">05</span>print(
                <span className="string">
                  f"&#123;name&#125; report ready."
                </span>
                )
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Example run output</span>
                <span className="flex items-center gap-1 font-mono text-[10px] text-success">
                  <Check className="h-3 w-3" /> COMPLETED
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                daily report ready.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>ILLUSTRATIVE DATA</span>
            <span>Code → Schedule → Run</span>
          </div>
        </div>
      </section>

      <section className="grid border-b py-7 sm:grid-cols-[1fr_2fr] sm:items-center sm:gap-8">
        <p className="eyebrow mb-4 sm:mb-0">Work in your language</p>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium">
          <span>Python</span>
          <span>Go</span>
          <span>Rust</span>
          <span>Java</span>
          <span>C++</span>
          <span className="text-muted-foreground">
            Node.js <sup className="font-mono text-[9px]">LEGACY</sup>
          </span>
        </div>
      </section>

      <section className="grid gap-12 border-b py-16 lg:grid-cols-[1fr_1.5fr] lg:gap-24 lg:py-20">
        <div>
          <p className="eyebrow">Built for the repeatable</p>
          <h2 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.04em]">
            Write it once.
            <br />
            Keep it running.
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
            Daily reports, periodic checks, or the script you keep forgetting to
            run.
          </p>
          <a
            href="#how-it-works"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium"
          >
            The workflow <ArrowDown className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-sm font-medium">A day on autopilot</h3>
            <span className="eyebrow">Example schedules</span>
          </div>
          {jobs.map((job) => (
            <div
              key={job.name}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b px-5 py-5 last:border-0"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Code2 className="h-4 w-4 text-muted-foreground" />
                  {job.name}
                </p>
                <p className="mt-1.5 pl-6 font-mono text-[11px] text-muted-foreground">
                  {job.cron} <span className="px-2 opacity-40">/</span>{" "}
                  {job.runtime}
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {job.time}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-24 border-b py-16 lg:py-20"
      >
        <div className="mb-10 flex items-center justify-between">
          <h2 className="text-2xl font-medium tracking-tight">
            A straightforward workflow.
          </h2>
          <span className="eyebrow hidden sm:block">No extra ceremony</span>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            [
              "01",
              "Bring your script",
              "Choose a runtime and add your code. Start from a shared template when it helps.",
            ],
            [
              "02",
              "Set the rhythm",
              "Add a cron expression, choose a timezone, and attach the secrets your script needs.",
            ],
            [
              "03",
              "Know what happened",
              "Trigger a run, inspect its output, and track successes and failures in one place.",
            ],
          ].map(([number, title, text]) => (
            <div key={number} className="border-t pt-5">
              <span className="font-mono text-xs text-primary">{number}</span>
              <h3 className="mt-4 text-lg font-medium tracking-tight">
                {title}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-4 border-b py-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-sm font-medium">
            A workspace for code you trust.
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Jobs use subprocess execution with an environment allowlist,
            timeouts, and output limits. Secrets are encrypted at rest.
            Execution has no container, filesystem, or network isolation.
          </p>
        </div>
        <a
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
          href="https://github.com/HarishKarthickS/automation#security-model"
          target="_blank"
          rel="noreferrer"
        >
          Security model <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </aside>
      <footer className="flex flex-wrap items-center justify-between gap-4 py-7">
        <p className="text-xs text-muted-foreground">
          Automiq <span className="mx-2 text-border">/</span> A personal
          automation workspace.
        </p>
        <a
          href="https://github.com/HarishKarthickS/automation"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          View source <ArrowUpRight className="h-3 w-3" />
        </a>
      </footer>
    </div>
  );
}
