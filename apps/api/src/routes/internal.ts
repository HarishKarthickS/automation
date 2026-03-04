import type { FastifyPluginAsync } from "fastify";
import { requireInternalToken } from "../middleware/requireInternalToken.js";
import { enqueueDueAutomationsJob } from "../queue/redisQueue.js";
import { getObservabilityAlerts, renderPrometheusMetrics } from "../services/observability.service.js";

export const internalRoutes: FastifyPluginAsync = async (app) => {
  app.post("/internal/run-due-automations", { preHandler: requireInternalToken }, async (request, reply) => {
    app.log.info(
      {
        reqId: request.id,
        method: request.method,
        url: request.url,
        ip: request.ip
      },
      "Internal scheduler trigger received"
    );

    const result = await enqueueDueAutomationsJob();
    app.log.info({ reqId: request.id, ...result }, "Internal scheduler trigger initiated");
    reply.code(202).send({
      message: "Due automation run initiated",
      ...result
    });
  });

  app.get("/internal/observability/metrics", { preHandler: requireInternalToken }, async (_request, reply) => {
    const metrics = await renderPrometheusMetrics();
    reply.header("content-type", "text/plain; version=0.0.4");
    reply.code(200).send(metrics);
  });

  app.get("/internal/observability/alerts", { preHandler: requireInternalToken }, async (_request, reply) => {
    const alerts = await getObservabilityAlerts();
    reply.code(200).send(alerts);
  });
};

