"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema } from "@/lib/zod";
import { authClient } from "@/lib/auth-client";
import { invalidateSessionCache } from "@/lib/session";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, Zap, Activity } from "lucide-react";

function sanitizeNextPath(candidate: string | null): string {
  if (!candidate) {
    return "/dashboard";
  }
  if (!candidate.startsWith("/")) {
    return "/dashboard";
  }
  if (candidate.startsWith("//")) {
    return "/dashboard";
  }
  return candidate;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    setNextPath(sanitizeNextPath(next));
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const payload = loginSchema.parse({ email, password });
      setLoading(true);

      await authClient.signInEmail(payload);
      invalidateSessionCache();

      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-shell grid min-h-[calc(100vh-88px)] items-center gap-6 py-12 lg:grid-cols-2">
      <Card className="hero-surface hidden lg:block">
        <CardHeader>
          <CardDescription className="text-xs uppercase tracking-[0.18em]">Secure Cloud Runtime</CardDescription>
          <CardTitle className="font-serif text-4xl">Reliable automations without infrastructure overhead.</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Encrypted secrets by default</div>
          <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /> Fast manual triggers and run history</div>
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Live visibility into every execution</div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md border-border/80 lg:justify-self-end">
        <CardHeader className="space-y-1">
          <CardTitle className="font-serif text-3xl">Welcome back</CardTitle>
          <CardDescription>Sign in to monitor runs, update schedules, and manage secrets.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
