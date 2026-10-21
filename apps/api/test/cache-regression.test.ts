import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
const f = vi.hoisted(() => ({ cache: new Map<string, { value: string; until: number }>(), rows: [] as any[] }));
vi.mock("../src/db/redis.js", () => ({ redis: {
  get: async (key: string) => { const item = f.cache.get(key); return item && item.until > Date.now() ? item.value : null; },
  set: async (key: string, value: string, _ex: string, ttl: number) => f.cache.set(key, { value, until: Date.now() + ttl * 1000 })
} }));
vi.mock("../src/db/client.js", () => ({ db: { select: () => {
  const chain: any = { from: () => chain, innerJoin: () => chain, where: () => chain, orderBy: () => chain, limit: async () => f.rows };
  return chain;
} } }));
vi.mock("../src/middleware/requireAuth.js", () => ({ requireAuth: vi.fn() }));
import { templateRoutes } from "../src/routes/templates.js";
import { listAutomations } from "../src/services/automations.service.js";
import { toAutomationDTO } from "../src/utils/serializers.js";
afterEach(() => { vi.useRealTimers(); f.cache.clear(); });
describe("date-safe list boundaries", () => {
  it("serves nonempty templates on miss, hit and route-cache expiry", async () => {
    const now = new Date();
    f.rows = [{ template: { id: crypto.randomUUID(), publishedAt: now, updatedAt: now }, ownerName: "Test" }];
    const app = Fastify(); await app.register(templateRoutes);
    try {
      const first = await app.inject("/templates");
      expect(first.statusCode).toBe(200);
      expect((await app.inject("/templates")).json()).toEqual(first.json());
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 11_000);
      const expired = await app.inject("/templates");
      expect(expired.statusCode).toBe(200);
      expect(expired.json()).toEqual(first.json());
    } finally { vi.restoreAllMocks(); await app.close(); }
  });
  it("does not round-trip raw automation rows through a JSON cache", async () => {
    f.rows = [{ id: crypto.randomUUID(), nextRunAt: new Date(), createdAt: new Date(), updatedAt: new Date() }];
    for (let i = 0; i < 2; i++) {
      const rows = await listAutomations("owner", 12);
      expect(() => rows.map(toAutomationDTO)).not.toThrow();
    }
  });
});
