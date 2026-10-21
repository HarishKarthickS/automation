"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState, type ReactNode } from "react";

import { AUTH_CHANGE_EVENT, invalidateSessionCache, useSessionState } from "@/lib/session";
import { API_MUTATION_EVENT } from "@/lib/api";

export function QueryProvider({ children }: { children: ReactNode }) {
  const session = useSessionState();
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
    const mutated = () => { void queryClient.invalidateQueries(); };
    const changedInAnotherTab = (event: StorageEvent) => { if (event.key === AUTH_CHANGE_EVENT) invalidateSessionCache(false); };
    window.addEventListener(AUTH_CHANGE_EVENT, clear);
    window.addEventListener(API_MUTATION_EVENT, mutated);
    window.addEventListener("storage", changedInAnotherTab);
    return () => { window.removeEventListener(AUTH_CHANGE_EVENT, clear); window.removeEventListener(API_MUTATION_EVENT, mutated); window.removeEventListener("storage", changedInAnotherTab); };
  }, [queryClient]);
  return (
    <QueryClientProvider key={session.user?.id ?? "anonymous"} client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
