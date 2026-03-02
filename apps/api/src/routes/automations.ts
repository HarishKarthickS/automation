import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { automationCreateSchema, automationUpdateSchema, paginationSchema } from "@automation/shared";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createAutomation,
  deleteAutomation,
  getAutomationById,
  listAutomations,
  publishAutomationTemplate,
  unpublishAutomationTemplate,
  updateAutomation
} from "../services/automations.service.js";
import { limits } from "../security/limits.js";
import { toAutomationDTO } from "../utils/serializers.js";
import { triggerManualRun } from "../scheduler/runDueAutomations.js";
import { invalidateByPrefix } from "../utils/memoryCache.js";

const idParamSchema = z.object({ id: z.string().uuid() });

export const automationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.post("/automations", async (request, reply) => {
    const input = automationCreateSchema.parse(request.body);
    if (Buffer.byteLength(input.code, "utf8") > limits.maxCodeSizeBytes) {
      reply.code(400).send({ message: "Code size exceeds maximum allowed bytes" });
      return;
    }

    const created = await createAutomation(request.authUser!.id, input);
    reply.code(201).send({ automation: toAutomationDTO(created) });
  });

  app.get("/automations", async (request) => {
    const query = paginationSchema.parse(request.query);
    const rows = await listAutomations(request.authUser!.id, query.limit, query.cursor);
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit).map(toAutomationDTO);

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null
    };
  });

  app.get("/automations/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const automation = await getAutomationById(request.authUser!.id, id);
    return { automation: toAutomationDTO(automation) };
  });

  app.put("/automations/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const input = automationUpdateSchema.parse(request.body);
    if (typeof input.code === "string" && Buffer.byteLength(input.code, "utf8") > limits.maxCodeSizeBytes) {
      reply.code(400).send({ message: "Code size exceeds maximum allowed bytes" });
      return;
    }

    const updated = await updateAutomation(request.authUser!.id, id, input);
    return { automation: toAutomationDTO(updated) };
  });

  app.delete("/automations/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await deleteAutomation(request.authUser!.id, id);
    reply.code(204).send();
  });

  app.post("/automations/:id/publish", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const published = await publishAutomationTemplate(request.authUser!.id, id);
    await invalidateByPrefix("templates:");
    return { automation: toAutomationDTO(published) };
  });

  app.post("/automations/:id/unpublish", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const unpublished = await unpublishAutomationTemplate(request.authUser!.id, id);
    await invalidateByPrefix("templates:");
    return { automation: toAutomationDTO(unpublished) };
  });

  app.post("/automations/:id/trigger", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const run = await triggerManualRun(id, request.authUser!.id);
    reply.code(202).send({ runId: run.id });
  });
};

