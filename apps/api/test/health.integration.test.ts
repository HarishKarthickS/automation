import { describe, expect, it } from "vitest";

describe("health route", () => {
  it("responds on /health", async () => {
    const { createApp } = await import("../src/app.js");
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
