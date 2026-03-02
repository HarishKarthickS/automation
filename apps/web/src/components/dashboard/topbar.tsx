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
import { LogOut, LayoutDashboard, FileCode } from "lucide-react";

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionState();

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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/65">
      <div className="page-shell flex items-center justify-between py-3">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex flex-col leading-none">
            <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
              Automiq
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Platform
            </span>
          </Link>

          <nav className="hidden items-center gap-2 text-sm md:flex">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
                pathname?.startsWith("/dashboard")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/templates"
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
                pathname?.startsWith("/templates")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <FileCode className="h-4 w-4" />
              Templates
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {session.loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          ) : session.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {session.user.email?.[0]?.toUpperCase() ?? "U"}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
