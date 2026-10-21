import type { Metadata } from "next";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { TopBar } from "@/components/dashboard/topbar";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Automiq",
  description:
    "Personal cron automation workspace with approved execution, encrypted secrets and run history",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <div className="grid-backdrop min-h-screen">
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:p-3"
              >
                Skip to content
              </a>
              <TopBar />
              <main id="main-content" className="pb-8">
                {children}
              </main>
            </div>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
