import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  session: vi.fn(), owner: vi.fn(), upsert: vi.fn(), list: vi.fn(), remove: vi.fn()
}));
vi.mock("../src/auth/betterAuth.js", () => ({ auth: { api: { getSession: deps.session }, handler: vi.fn() } }));
vi.mock("../src/services/automations.service.js", () => ({ getAutomationById: deps.owner }));
vi.mock("../src/services/secrets.service.js", () => ({ upsertSecret: deps.upsert, listSecretKeys: deps.list, deleteSecret: deps.remove }));
vi.mock("../src/services/onboarding.service.js", () => ({ setOnboardingStepCompleted: vi.fn() }));
vi.mock("../src/services/product-events.service.js", () => ({ trackProductEvent: vi.fn() }));
// Rate limiting has its own Redis dependency; this suite tests route guards/DTOs.
vi.mock("../src/plugins/rateLimit.js", async () => {
  const { default: fp } = await import("fastify-plugin");
  return { rateLimitPlugin: fp(async () => {}) };
});

import { createApp } from "../src/app.js";
import { HttpError } from "../src/utils/errors.js";
const app = createApp();
const id = "00000000-0000-4000-8000-000000000001";
const url = `/api/v1/automations/${id}/secrets`;
const headers = { cookie: "csrf_token=t", "x-csrf-token": "t" };
const row = { id: "secret-id", key: "API_KEY", createdAt: new Date(), updatedAt: new Date(), value: "plaintext", ciphertext: "encrypted", iv: "iv", authTag: "tag" };

beforeEach(() => {
  vi.resetAllMocks();
  deps.session.mockResolvedValue({ user: { id: "owner", email: "owner@example.com", name: "Owner" }, session: { id: "s", userId: "owner", expiresAt: "2099-01-01" } });
  deps.owner.mockResolvedValue({ id });
  deps.upsert.mockResolvedValue(row);
  deps.list.mockResolvedValue([row]);
});
afterAll(() => app.close());

describe("secret routes (persistence and auth provider mocked)", () => {
  it.each(["GET", "POST", "DELETE"] as const)("requires authentication for %s", async (method) => {
    deps.session.mockResolvedValue(null);
    const response = await app.inject({ method, url: method === "DELETE" ? `${url}/API_KEY` : url, headers });
    expect(response.statusCode).toBe(401);
    expect(deps.owner).not.toHaveBeenCalled();
  });

  it.each(["GET", "POST", "DELETE"] as const)("checks ownership before %s secret access", async (method) => {
    deps.owner.mockRejectedValue(new HttpError(404, "Automation not found"));
    const response = await app.inject({ method, url: method === "DELETE" ? `${url}/API_KEY` : url, headers,
      ...(method === "POST" ? { payload: { key: "API_KEY", value: "plaintext" } } : {}) });
    expect(response.statusCode).toBe(404);
    expect(deps.owner).toHaveBeenCalledWith("owner", id);
    expect(deps.upsert).not.toHaveBeenCalled();
    expect(deps.list).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it("upserts and lists only metadata, never plaintext or encrypted material", async () => {
    const created = await app.inject({ method: "POST", url, headers, payload: { key: "API_KEY", value: "plaintext" } });
    expect(created.statusCode).toBe(201);
    expect(deps.upsert).toHaveBeenCalledWith(id, { key: "API_KEY", value: "plaintext" });
    const listed = await app.inject({ url });
    expect(listed.statusCode).toBe(200);
    const metadata = { id: row.id, key: row.key, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
    expect(created.json()).toEqual({ secret: metadata });
    expect(listed.json()).toEqual({ items: [metadata] });
  });

  it("deletes the requested key for the owned automation", async () => {
    const response = await app.inject({ method: "DELETE", url: `${url}/API_KEY`, headers });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    expect(deps.remove).toHaveBeenCalledWith(id, "API_KEY");
  });

  it("rejects invalid payloads before storage", async () => {
    const response = await app.inject({ method: "POST", url, headers, payload: { key: "", value: "x" } });
    expect(response.statusCode).toBe(400);
    expect(deps.upsert).not.toHaveBeenCalled();
  });

  it.each(["POST", "DELETE"] as const)("requires a CSRF pair for %s", async (method) => {
    const response = await app.inject({ method, url: method === "DELETE" ? `${url}/API_KEY` : url });
    expect(response.statusCode).toBe(403);
    expect(deps.owner).not.toHaveBeenCalled();
  });
});
