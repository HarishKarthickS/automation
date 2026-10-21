"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { invalidateSessionCache, useSessionState } from "@/lib/session";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpRight, ChevronDown, LogOut, Workflow } from "lucide-react";

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionState();
  const nav = [
    { href: "/dashboard", label: "Workspace" },
    { href: "/templates", label: "Templates" },
    ...(session.user?.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  const active = (href: string) =>
    pathname?.startsWith(href) ||
    (href === "/dashboard" && pathname?.startsWith("/automations"));
  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      invalidateSessionCache();
    } finally {
      router.push("/login");
      router.refresh();
    }
  };
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="page-shell flex min-h-16 items-center justify-between gap-4 py-0">
        <div className="flex items-center gap-10">
          <Link
            href={session.user ? "/dashboard" : "/"}
            aria-label="Automiq home"
            className="flex items-center gap-2.5"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-primary text-primary-foreground">
              <Workflow className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-lg font-semibold tracking-[-0.05em]">
              automiq<span className="text-primary">.</span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 md:flex"
          >
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={`flex h-16 items-center border-b-2 text-[13px] transition-colors ${active(href) ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://github.com/HarishKarthickS/automation"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground lg:flex"
          >
            Source <ArrowUpRight className="h-3 w-3" />
          </a>
          <ThemeToggle />
          {session.loading ? (
            <div
              className="h-8 w-16 animate-pulse rounded bg-muted"
              aria-label="Loading account"
            />
          ) : session.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-secondary font-mono text-xs text-foreground">
                    {session.user.email?.[0]?.toUpperCase() ?? "U"}
                  </span>
                  <span className="hidden max-w-28 truncate text-xs sm:inline">
                    {session.user.name || "Account"}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                  <span className="sr-only">Open account menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="mt-1 truncate text-sm">{session.user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/signup">
                  Get started <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
      <nav
        aria-label="Mobile navigation"
        className="page-shell flex items-center gap-6 overflow-x-auto border-t py-2 md:hidden"
      >
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`whitespace-nowrap text-xs ${active(href) ? "font-medium text-primary" : "text-muted-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
