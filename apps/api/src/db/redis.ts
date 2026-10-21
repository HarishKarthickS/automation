import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const redisInstance = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  commandTimeout: 1000,
  enableOfflineQueue: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
  connectTimeout: 3000
});

redisInstance.on("connect", () => {
  logger.info("Redis connected");
});

redisInstance.on("error", (err: Error) => {
  logger.error({ err }, "Redis error");
});

export const redis = redisInstance;

export async function connectRedis() {
  try {
    await redis.connect();
  } catch (err) {
    logger.error({ err }, "Failed to connect to Redis");
    throw err;
  }
}

export async function disconnectRedis() {
  await redis.quit();
}
