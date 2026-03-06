import type { FastifyPluginAsync } from "fastify";
import { RUNTIMES } from "@automation/shared";
import { requireAuth } from "../middleware/requireAuth.js";
import { getEnabledRuntimes } from "../security/runtimePolicy.js";

const RUNTIME_LABELS: Record<(typeof RUNTIMES)[number], string> = {
  nodejs20: "Node.js 20 (Legacy)",
  cpp23: "C++23",
  java21: "Java 21",
  python312: "Python 3.12",
  go122: "Go 1.22",
  rust183: "Rust 1.83"
};

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
