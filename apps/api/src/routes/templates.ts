import type { FastifyPluginAsync } from "fastify";
import { templateCloneSchema, templateListQuerySchema } from "@automation/shared";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { cloneTemplateForUser, getTemplateById, listTemplates } from "../services/templates.service.js";
import { toTemplateDTO } from "../utils/serializers.js";
import { getCachedAsync, invalidateByPrefix, setCached } from "../utils/memoryCache.js";
import { trackProductEvent } from "../services/product-events.service.js";
import { setOnboardingStepCompleted } from "../services/onboarding.service.js";

const templateParams = z.object({ id: z.string().uuid() });
const TEMPLATE_LIST_CACHE_TTL_MS = 10;
const TEMPLATE_DETAIL_CACHE_TTL_MS = 30;

export const templateRoutes: FastifyPluginAsync = async (app) => {
  app.get("/templates", async (request) => {
    const query = templateListQuerySchema.parse(request.query);
    const cacheKey = `templates:list:${JSON.stringify(query)}`;
    const cached = await getCachedAsync<{ items: ReturnType<typeof toTemplateDTO>[]; nextCursor: string | null }>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await listTemplates({
      limit: query.limit,
      cursor: query.cursor,
      query: query.query,
      sort: query.sort,
      tag: query.tag
    });

    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit).map(toTemplateDTO);

    const payload = {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null
    };
    await setCached(cacheKey, payload, TEMPLATE_LIST_CACHE_TTL_MS);
    return payload;
  });

  app.get("/templates/:id", async (request) => {
    const { id } = templateParams.parse(request.params);
    const cacheKey = `templates:detail:${id}`;
    const cached = await getCachedAsync<{ template: ReturnType<typeof toTemplateDTO> }>(cacheKey);
    if (cached) {
      return cached;
    }

    const row = await getTemplateById(id);
    const payload = { template: toTemplateDTO(row) };
    await setCached(cacheKey, payload, TEMPLATE_DETAIL_CACHE_TTL_MS);
    return payload;
  });

  app.post("/templates/:id/clone", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = templateParams.parse(request.params);
    const input = templateCloneSchema.parse(request.body ?? {});

    const cloned = await cloneTemplateForUser(
      id,
      request.authUser!.id,
      input.nameOverride,
      input.timezoneOverride
    );
    await setOnboardingStepCompleted(request.authUser!.id, "create_automation");
    await setOnboardingStepCompleted(request.authUser!.id, "configure_schedule");
    await trackProductEvent(request.authUser!.id, "template_cloned", { templateId: id, automationId: cloned.id });
    await invalidateByPrefix("templates:");

    reply.code(201).send({ automationId: cloned.id });
  });
};
