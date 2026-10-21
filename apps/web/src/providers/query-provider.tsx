"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState, type ReactNode } from "react";

import { AUTH_CHANGE_EVENT, invalidateSessionCache } from "@/lib/session";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: true
          }
        }
      })
  );

  useEffect(() => {
    const clear = () => { void queryClient.cancelQueries(); queryClient.clear(); };
    const changedInAnotherTab = (event: StorageEvent) => { if (event.key === AUTH_CHANGE_EVENT) invalidateSessionCache(false); };
    window.addEventListener(AUTH_CHANGE_EVENT, clear);
    window.addEventListener("storage", changedInAnotherTab);
    return () => { window.removeEventListener(AUTH_CHANGE_EVENT, clear); window.removeEventListener("storage", changedInAnotherTab); };
  }, [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
