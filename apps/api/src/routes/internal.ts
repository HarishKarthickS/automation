import type { FastifyPluginAsync } from "fastify";
import { requireInternalToken } from "../middleware/requireInternalToken.js";
import { runDueAutomations } from "../scheduler/runDueAutomations.js";

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

    const result = await runDueAutomations();
    app.log.info({ reqId: request.id, ...result }, "Internal scheduler trigger completed");
    reply.code(200).send(result);
  });
};

