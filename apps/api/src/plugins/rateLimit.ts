import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";

export const rateLimitPlugin = fp(async (app) => {
  await app.register(rateLimit, {
    // Per-instance admission remains available when optional Redis is offline.
    cache: 5000,
    max: 200,
    timeWindow: "1 minute",
    keyGenerator(request) {
      return request.ip;
    },
    skipOnError: false
  });
});
