import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="page-shell py-16">
      <div className="panel mx-auto max-w-4xl p-10 sm:p-14">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Secure automation platform</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
          Run scheduled code safely, at scale, with complete run visibility.
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground">
          Multi-user SaaS for scheduling JavaScript automations with encrypted secrets, sandbox execution,
          retry-aware runs, and a reusable template marketplace.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup">
            <Button>Get started</Button>
          </Link>
          <Link href="/templates">
            <Button variant="ghost">Explore templates</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

