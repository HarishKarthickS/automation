"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, resetCsrfToken } from "./api";

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

export const AUTH_CHANGE_EVENT = "automiq:auth-change";
let sessionGeneration = 0;
export function invalidateSessionCache(broadcast = true) {
  sessionGeneration++;
  resetCsrfToken();
  sessionCache = null;
  inFlightSessionRequest = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    if (broadcast) { try { localStorage.setItem(AUTH_CHANGE_EVENT, crypto.randomUUID()); } catch {} }
  }
}

async function loadSession(force = false): Promise<SessionPayload> {
  const now = Date.now();
  if (!force && sessionCache && now - sessionCache.fetchedAt < SESSION_CACHE_TTL_MS) {
    return sessionCache.payload;
  }

  if (!inFlightSessionRequest) {
    const generation = sessionGeneration;
    inFlightSessionRequest = apiFetch<SessionPayload>("/session", { skipCsrf: true }).then((payload) => {
      if (generation !== sessionGeneration) throw new Error("Session changed; retry");
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
    let active = true;
    let requestId = 0;
    const refresh = () => {
      const id = ++requestId;
      setState({ loading: true, user: null, session: null, error: null });
      loadSession().then((payload) => {
        if (active && id === requestId) setState({ loading: false, ...payload, error: null });
      }).catch((error: Error) => {
        if (active && id === requestId) setState({ loading: false, user: null, session: null, error: error.message });
      });
    };
    window.addEventListener(AUTH_CHANGE_EVENT, refresh);
    refresh();
    return () => { active = false; window.removeEventListener(AUTH_CHANGE_EVENT, refresh); };
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

