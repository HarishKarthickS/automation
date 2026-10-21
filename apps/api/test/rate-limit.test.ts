import Fastify from "fastify";
import { expect, it, vi } from "vitest";
vi.mock("../src/db/redis.js", () => { throw new Error("Rate limiting must not import optional Redis"); });
import { rateLimitPlugin } from "../src/plugins/rateLimit.js";
it("keeps limiting requests even when Redis is unavailable", async () => {
  const app = Fastify(); await app.register(rateLimitPlugin);
  app.get("/probe", async () => ({ ok: true }));
  app.get("/health", { config: { rateLimit: false } }, async () => ({ ok: true }));
  try {
    for (let i = 0; i < 200; i++) expect((await app.inject("/probe")).statusCode).toBe(200);
    expect((await app.inject("/probe")).statusCode).toBe(429);
    expect((await app.inject("/health")).statusCode).toBe(200);
  } finally { await app.close(); }
});
