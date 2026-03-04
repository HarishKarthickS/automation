import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { corsPlugin } from "./plugins/cors.js";
import { rateLimitPlugin } from "./plugins/rateLimit.js";
import { authPlugin } from "./plugins/auth.js";
import { csrfPlugin } from "./security/csrf.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { automationRoutes } from "./routes/automations.js";
import { secretRoutes } from "./routes/secrets.js";
import { runRoutes } from "./routes/runs.js";
import { templateRoutes } from "./routes/templates.js";
import { internalRoutes } from "./routes/internal.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { metricsRoutes } from "./routes/metrics.js";
import { adminRoutes } from "./routes/admin.js";
import { HttpError } from "./utils/errors.js";

const REQUEST_START_AT = Symbol("requestStartAt");
const SLOW_REQUEST_THRESHOLD_MS = 250;

export function createApp() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: env.MAX_CODE_SIZE_BYTES + 25 * 1024
  });

  app.register(cookie, {
    hook: "onRequest"
  });

  app.addHook("onRequest", async (request) => {
    if (request.method !== "POST" || !request.url.startsWith("/api/v1/internal/run-due-automations")) {
      return;
    }

    const contentType = request.headers["content-type"];
    const contentLength = request.headers["content-length"];
    const transferEncoding = request.headers["transfer-encoding"];
    const isJsonContentType = typeof contentType === "string" && contentType.includes("application/json");
    const hasNoBody = contentLength === "0" || (!contentLength && !transferEncoding);

    if (isJsonContentType && hasNoBody) {
      delete (request.headers as Record<string, unknown>)["content-type"];
      app.log.info({ reqId: request.id, url: request.url }, "Stripped empty JSON content-type for internal cron");
    }
  });

  app.addHook("onRequest", async (request) => {
    (request as any)[REQUEST_START_AT] = process.hrtime.bigint();
  });

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
    reply.header("cross-origin-opener-policy", "same-origin");
    reply.header("cross-origin-resource-policy", "same-origin");
    if (env.isProd) {
      reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    }

    const started = (request as any)[REQUEST_START_AT] as bigint | undefined;
    if (started) {
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      reply.header("x-response-time-ms", elapsedMs.toFixed(2));
    }
    return payload;
  });

  app.addHook("onResponse", async (request, reply) => {
    const started = (request as any)[REQUEST_START_AT] as bigint | undefined;
    if (!started) {
      return;
    }

    const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    if (elapsedMs >= SLOW_REQUEST_THRESHOLD_MS) {
      app.log.warn(
        {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTimeMs: Number(elapsedMs.toFixed(2))
        },
        "Slow request"
      );
    }
  });

  app.register(corsPlugin);
  app.register(rateLimitPlugin);
  app.register(csrfPlugin);
  app.register(authPlugin);

  app.register(healthRoutes);

  app.register(async (api) => {
    api.register(authRoutes, { prefix: "/api/v1" });
    api.register(automationRoutes, { prefix: "/api/v1" });
    api.register(secretRoutes, { prefix: "/api/v1" });
    api.register(runRoutes, { prefix: "/api/v1" });
    api.register(templateRoutes, { prefix: "/api/v1" });
    api.register(onboardingRoutes, { prefix: "/api/v1" });
    api.register(metricsRoutes, { prefix: "/api/v1" });
    api.register(adminRoutes, { prefix: "/api/v1" });
    api.register(internalRoutes, { prefix: "/api/v1" });
  });

  app.setErrorHandler((error, _request, reply) => {
    const anyError = error as any;

    if (error instanceof HttpError) {
      app.log.warn({ err: error, statusCode: error.statusCode }, "Handled HttpError");
      reply.code(error.statusCode).send({ message: error.message });
      return;
    }

    if (anyError.name === "ZodError") {
      app.log.warn({ err: error, issues: anyError.issues }, "Request validation failed");
      reply.code(400).send({ message: "Invalid request payload", issues: anyError.issues });
      return;
    }

    if (typeof anyError.statusCode === "number" && anyError.statusCode >= 400) {
      app.log.warn({ err: error, statusCode: anyError.statusCode }, "Handled framework/client error");
      reply.code(anyError.statusCode).send({ message: anyError.message ?? "Request error" });
      return;
    }

    app.log.error({ err: error }, "Unhandled error");
    reply.code(500).send({ message: "Internal server error" });
  });

  return app;
}

