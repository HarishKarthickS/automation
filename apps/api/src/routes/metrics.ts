import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middleware/requireAuth.js";
import { getOnboardingStatus } from "../services/onboarding.service.js";
import { getKpiSummary } from "../services/product-events.service.js";

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/metrics/summary", async (request) => {
    const userId = request.authUser!.id;
    const [kpi, onboarding] = await Promise.all([getKpiSummary(userId, 7), getOnboardingStatus(userId)]);
    return { kpi, onboarding };
  });
};
