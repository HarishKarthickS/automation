import type { FastifyPluginAsync } from "fastify";
import { RUNTIMES, RUNTIME_LABELS } from "@automation/shared";
import { requireAuth } from "../middleware/requireAuth.js";
import { getEnabledRuntimes } from "../security/runtimePolicy.js";

export const runtimeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/runtimes", async () => {
    const enabled = new Set(getEnabledRuntimes());
    return {
      items: RUNTIMES.filter((id) => enabled.has(id)).map((id) => ({
        id,
        label: RUNTIME_LABELS[id]
      }))
    };
  });
};
