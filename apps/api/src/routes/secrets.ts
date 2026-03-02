import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { secretUpsertSchema } from "@automation/shared";
import { requireAuth } from "../middleware/requireAuth.js";
import { getAutomationById } from "../services/automations.service.js";
import { deleteSecret, listSecretKeys, upsertSecret } from "../services/secrets.service.js";
import { toSecretDTO } from "../utils/serializers.js";

const automationIdParams = z.object({ id: z.string().uuid() });
const secretParams = z.object({ id: z.string().uuid(), key: z.string() });

export const secretRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.post("/automations/:id/secrets", async (request, reply) => {
    const { id } = automationIdParams.parse(request.params);
    const input = secretUpsertSchema.parse(request.body);

    await getAutomationById(request.authUser!.id, id);
    const secret = await upsertSecret(id, input);

    reply.code(201).send({ secret: toSecretDTO(secret) });
  });

  app.get("/automations/:id/secrets", async (request) => {
    const { id } = automationIdParams.parse(request.params);
    await getAutomationById(request.authUser!.id, id);

    const secrets = await listSecretKeys(id);
    return {
      items: secrets.map(toSecretDTO)
    };
  });

  app.delete("/automations/:id/secrets/:key", async (request, reply) => {
    const { id, key } = secretParams.parse(request.params);
    await getAutomationById(request.authUser!.id, id);
    await deleteSecret(id, key);
    reply.code(204).send();
  });
};

