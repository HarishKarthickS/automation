import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { paginationSchema } from "@automation/shared";
import { requireAuth } from "../middleware/requireAuth.js";
import { getRunById, listRunsByAutomation } from "../services/runs.service.js";
import { toRunDTO } from "../utils/serializers.js";

const automationParams = z.object({ id: z.string().uuid() });
const runParams = z.object({ id: z.string().uuid() });

export const runRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/automations/:id/runs", async (request) => {
    const { id } = automationParams.parse(request.params);
    const query = paginationSchema.parse(request.query);

    const rows = await listRunsByAutomation(request.authUser!.id, id, query.limit, query.cursor);
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit).map(toRunDTO);

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null
    };
  });

  app.get("/runs/:id", async (request) => {
    const { id } = runParams.parse(request.params);
    const run = await getRunById(request.authUser!.id, id);
    return { run: toRunDTO(run) };
  });
};

