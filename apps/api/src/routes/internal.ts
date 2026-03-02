import type { FastifyPluginAsync } from "fastify";
import { requireInternalToken } from "../middleware/requireInternalToken.js";
import { runDueAutomations } from "../scheduler/runDueAutomations.js";

export const internalRoutes: FastifyPluginAsync = async (app) => {
  app.post("/internal/run-due-automations", { preHandler: requireInternalToken }, async (_request, reply) => {
    const result = await runDueAutomations();
    reply.code(200).send(result);
  });
};

