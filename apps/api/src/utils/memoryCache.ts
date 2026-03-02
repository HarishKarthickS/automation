import { redis } from "../db/redis.js";

const DEFAULT_TTL_SECONDS = 60;

export async function getCachedAsync<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error("Redis set error:", err);
  }
}

export async function invalidateByPrefix(prefix: string): Promise<void> {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error("Redis invalidate error:", err);
  }
}

export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error("Redis invalidate error:", err);
  }
}
