import type { FastifyRequest } from "fastify";
import { auth } from "./betterAuth.js";
import { env } from "../config/env.js";

const SESSION_CACHE_TTL_MS = 5_000;
const MAX_SESSION_CACHE_ENTRIES = 5_000;
const sessionCache = new Map<
  string,
  {
    expiresAtMs: number;
    value:
      | {
          session: {
            id: string;
            userId: string;
            expiresAt: Date;
          };
          user: {
            id: string;
            email: string;
            name: string;
            role: "user" | "admin";
            suspended: boolean;
            isAdmin: boolean;
          };
        }
      | null;
  }
>();

function toHeaders(request: FastifyRequest): Headers {
  const headers = new Headers();
  Object.entries(request.headers).forEach(([key, value]) => {
    if (typeof value === "string") {
      headers.set(key, value);
      return;
    }
    if (Array.isArray(value)) {
      headers.set(key, value.join(","));
    }
  });
  return headers;
}

export async function getSessionFromRequest(request: FastifyRequest) {
  const sessionToken =
    request.cookies["__Secure-caas.session_token"] ?? request.cookies["caas.session_token"];
  const now = Date.now();

  if (sessionToken) {
    const cached = sessionCache.get(sessionToken);
    if (cached && cached.expiresAtMs > now) {
      return cached.value;
    }
  }

  const sessionResult = await (auth as any).api.getSession({
    headers: toHeaders(request)
  });

  if (!sessionResult?.session || !sessionResult?.user) {
    if (sessionToken) {
      sessionCache.set(sessionToken, {
        expiresAtMs: now + SESSION_CACHE_TTL_MS,
        value: null
      });
    }
    return null;
  }

  const value = {
    session: {
      id: sessionResult.session.id,
      userId: sessionResult.session.userId,
      expiresAt: new Date(sessionResult.session.expiresAt)
    },
    user: {
      id: sessionResult.user.id,
      email: sessionResult.user.email,
      name: sessionResult.user.name,
      role: ((sessionResult.user as any).role === "admin" ? "admin" : "user") as "user" | "admin",
      suspended: Boolean((sessionResult.user as any).suspended),
      isAdmin:
        (sessionResult.user as any).role === "admin" ||
        env.adminEmails.includes(String(sessionResult.user.email || "").toLowerCase())
    }
  };

  if (sessionToken) {
    if (sessionCache.size > MAX_SESSION_CACHE_ENTRIES) {
      for (const [token, entry] of sessionCache) {
        if (entry.expiresAtMs <= now) {
          sessionCache.delete(token);
        }
      }
    }
    sessionCache.set(sessionToken, {
      expiresAtMs: now + SESSION_CACHE_TTL_MS,
      value
    });
  }

  return value;
}

