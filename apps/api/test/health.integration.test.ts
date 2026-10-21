import { describe, expect, it, vi } from "vitest";
vi.mock("../src/plugins/rateLimit.js", async () => {
  const { default: fp } = await import("fastify-plugin");
  return { rateLimitPlugin: fp(async () => {}) };
});
import { createApp } from "../src/app.js";

describe("health route", () => {
  it("responds on /health", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");

    await app.close();
  });
});
