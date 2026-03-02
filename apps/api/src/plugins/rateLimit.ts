import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { redis } from "../db/redis.js";

export const rateLimitPlugin = fp(async (app) => {
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
    keyGenerator(request) {
      return request.ip;
    },
    redis,
    skipOnError: false
  });
});
