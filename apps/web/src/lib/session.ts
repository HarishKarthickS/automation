"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "./api";

interface SessionPayload {
  user: {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin";
    suspended: boolean;
    isAdmin: boolean;
  } | null;
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  } | null;
}

const SESSION_CACHE_TTL_MS = 60_000;

let sessionCache:
  | {
      payload: SessionPayload;
      fetchedAt: number;
    }
  | null = null;

let inFlightSessionRequest: Promise<SessionPayload> | null = null;

export function invalidateSessionCache() {
  sessionCache = null;
  inFlightSessionRequest = null;
}

async function loadSession(force = false): Promise<SessionPayload> {
  const now = Date.now();
  if (!force && sessionCache && now - sessionCache.fetchedAt < SESSION_CACHE_TTL_MS) {
    return sessionCache.payload;
  }

  if (!inFlightSessionRequest) {
    inFlightSessionRequest = apiFetch<SessionPayload>("/session", { skipCsrf: true }).then((payload) => {
      sessionCache = {
        payload,
        fetchedAt: Date.now()
      };
      return payload;
    });
  }

  try {
    return await inFlightSessionRequest;
  } finally {
    inFlightSessionRequest = null;
  }
}

export function useSessionState() {
  const [state, setState] = useState<{
    loading: boolean;
    user: SessionPayload["user"];
    session: SessionPayload["session"];
    error: string | null;
  }>({
    loading: true,
    user: null,
    session: null,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    const hasFreshCache =
      sessionCache && Date.now() - sessionCache.fetchedAt < SESSION_CACHE_TTL_MS;
    if (hasFreshCache && sessionCache) {
      setState({
        loading: false,
        user: sessionCache.payload.user,
        session: sessionCache.payload.session,
        error: null
      });
    } else {
      setState((current) => ({ ...current, loading: true }));
    }

    loadSession()
      .then((payload) => {
        if (!mounted) {
          return;
        }
        setState({
          loading: false,
          user: payload.user,
          session: payload.session,
          error: null
        });
      })
      .catch((error: Error) => {
        if (!mounted) {
          return;
        }
        setState({
          loading: false,
          user: null,
          session: null,
          error: error.message
        });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

export function useRequireSession() {
  const session = useSessionState();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!session.loading && !session.error && !session.user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
    }
  }, [pathname, router, session.error, session.loading, session.user]);

  return session;
}

