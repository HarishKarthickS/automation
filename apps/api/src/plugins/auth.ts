import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth/betterAuth.js";
import { env } from "../config/env.js";

const authHandler = toNodeHandler(auth as any);
const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX_REQUESTS_PER_WINDOW = 30;
const authRateState = new Map<string, { count: number; resetAt: number }>();
const MAX_RATE_STATE_ENTRIES = 10_000;

function isAuthPath(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return url === "/api/v1/auth" || url.startsWith("/api/v1/auth/");
}

function enforceAuthRateLimit(request: FastifyRequest, reply: FastifyReply): boolean {
  const now = Date.now();
  if (authRateState.size > MAX_RATE_STATE_ENTRIES) {
    for (const [ip, state] of authRateState) {
      if (state.resetAt <= now) {
        authRateState.delete(ip);
      }
    }
  }

  const key = request.ip;
  const current = authRateState.get(key);

  if (!current || current.resetAt <= now) {
    authRateState.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return true;
  }

  if (current.count >= AUTH_MAX_REQUESTS_PER_WINDOW) {
    reply
      .code(429)
      .header("retry-after", Math.ceil((current.resetAt - now) / 1000))
      .send({ message: "Too many auth requests. Try again shortly." });
    return false;
  }

  current.count += 1;
  return true;
}

function applyAuthCorsHeaders(request: FastifyRequest, reply: FastifyReply) {
  const origin = request.headers.origin;
  if (!origin || !env.corsOrigins.includes(origin)) {
    return;
  }

  reply.raw.setHeader("access-control-allow-origin", origin);
  reply.raw.setHeader("vary", "Origin");
  reply.raw.setHeader("access-control-allow-credentials", "true");
  reply.raw.setHeader(
    "access-control-allow-methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  reply.raw.setHeader(
    "access-control-allow-headers",
    "Content-Type, Authorization, x-csrf-token"
  );
}

export const authPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    if (!isAuthPath(request.raw.url)) {
      return;
    }

    applyAuthCorsHeaders(request, reply);

    if (request.method === "OPTIONS") {
      reply.code(204).send();
      return reply;
    }

    if (!enforceAuthRateLimit(request, reply)) {
      return reply;
    }

    await authHandler(request.raw, reply.raw);
    reply.hijack();
    return reply;
  });
});

