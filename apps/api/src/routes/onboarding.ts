import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { OnboardingStepId } from "@automation/shared";
import { requireAuth } from "../middleware/requireAuth.js";
import { getOnboardingStatus, setOnboardingStepCompleted } from "../services/onboarding.service.js";

const onboardingStepSchema = z.object({
  step: z.enum([
    "create_automation",
    "configure_schedule",
    "add_secret",
    "trigger_manual_run",
    "first_successful_run"
  ]),
  completed: z.boolean().default(true)
});

export const onboardingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/onboarding/status", async (request) => {
    const status = await getOnboardingStatus(request.authUser!.id);
    return { status };
  });

  app.post("/onboarding/step", async (request, reply) => {
    const input = onboardingStepSchema.parse(request.body);
    if (input.completed) {
      await setOnboardingStepCompleted(request.authUser!.id, input.step as OnboardingStepId);
    }

    const status = await getOnboardingStatus(request.authUser!.id);
    reply.code(200).send({ status });
  });
};
