import { runtimeCapabilities } from "../executor/capabilities.js";
import { env } from "../config/env.js";
import type { FastifyPluginAsync } from "fastify";
import { RUNTIMES, RUNTIME_LABELS } from "@automation/shared";
import { requireAuth } from "../middleware/requireAuth.js";
import { getEnabledRuntimes } from "../security/runtimePolicy.js";

export const runtimeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/runtimes", async () => {
    return { items: await runtimeCapabilities(), mode: env.executionMode, message: env.executionMode === "disabled" ? "An isolated execution worker must be configured before jobs can run." : null };

  });
};
