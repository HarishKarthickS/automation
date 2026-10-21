import type { FastifyPluginAsync } from "fastify";
import { readiness, release } from "../services/readiness.service.js";
import { env } from "../config/env.js";
export const healthRoutes: FastifyPluginAsync = async (app) => {
  for (const path of ["/", "/health", "/heath"]) app.get(path, { config: { rateLimit: false } }, async () => ({ status: "ok", uptime: process.uptime(), release }));
  app.get("/api/v1/version", { config: { rateLimit: false } }, async () => ({ ...release, executionMode: env.executionMode }));
  for (const path of ["/ready", "/api/v1/ready"]) app.get(path, { config: { rateLimit: false } }, async (_request, reply) => {
    const result = await readiness(); reply.header("cache-control", "no-store"); return reply.code(result.ready ? 200 : 503).send(result);
  });
};
