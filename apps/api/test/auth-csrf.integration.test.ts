import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("../src/auth/betterAuth.js", () => ({ auth: { api: provider } }));

import { authRoutes } from "../src/routes/auth.js";
import { csrfPlugin } from "../src/security/csrf.js";
import { requireAuth } from "../src/middleware/requireAuth.js";

const app = Fastify();
app.register(cookie);
app.register(csrfPlugin);
app.register(authRoutes, { prefix: "/api/v1" });
app.post("/api/v1/protected", { preHandler: requireAuth }, async (request) => ({ user: request.authUser }));
app.post("/api/v1/auth-lookalike", async () => ({ ok: true }));
app.post("/api/v1/internal-lookalike", async () => ({ ok: true }));

const user = { id: "owner", email: "owner@example.com", name: "Owner", suspended: false };
beforeEach(() => {
  provider.getSession.mockReset();
  provider.getSession.mockResolvedValue(null);
});
afterEach(() => vi.restoreAllMocks());

describe("session and CSRF HTTP flow (auth provider mocked)", () => {
  it("returns a null session for anonymous requests", async () => {
    const response = await app.inject("/api/v1/session");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ session: null, user: null });
  });

  it("forwards session cookies to the provider and returns the mapped user", async () => {
    provider.getSession.mockResolvedValue({ user, session: { id: "session", userId: user.id, expiresAt: "2099-01-01" } });
    const response = await app.inject({ url: "/api/v1/session", headers: { cookie: "caas.session_token=session-flow" } });
    expect(response.json().user).toMatchObject({ id: user.id, role: "user", isAdmin: false });
    expect(provider.getSession.mock.calls[0][0].headers.get("cookie")).toContain("session-flow");
  });

  it("issues a token that authorizes a mutation only with a valid session", async () => {
    const tokenResponse = await app.inject("/api/v1/csrf-token");
    const token = tokenResponse.json().csrfToken;
    expect(token).toMatch(/^[\w-]{32}$/);
    expect(tokenResponse.cookies.filter((item) => item.name === "csrf_token")).toHaveLength(1);
    expect(tokenResponse.cookies.find((item) => item.name === "csrf_token")?.value).toBe(token);
    const headers = { cookie: `csrf_token=${token}`, "x-csrf-token": token };
    expect((await app.inject({ method: "POST", url: "/api/v1/protected", headers })).statusCode).toBe(401);
    provider.getSession.mockResolvedValue({ user, session: { id: "session", userId: user.id, expiresAt: "2099-01-01" } });
    const response = await app.inject({ method: "POST", url: "/api/v1/protected", headers });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.id).toBe(user.id);
  });

  it.each([
    {},
    { cookie: "csrf_token=expected" },
    { "x-csrf-token": "expected" },
    { cookie: "csrf_token=expected", "x-csrf-token": "wrong" }
  ])("rejects absent or mismatched token pairs: %j", async (headers) => {
    const response = await app.inject({ method: "POST", url: "/api/v1/protected", headers });
    expect(response.statusCode).toBe(403);
    expect(provider.getSession).not.toHaveBeenCalled();
  });

  it("blocks suspended users even with a valid CSRF pair", async () => {
    provider.getSession.mockResolvedValue({ user: { ...user, suspended: true }, session: { id: "s", userId: user.id, expiresAt: "2099-01-01" } });
    const response = await app.inject({ method: "POST", url: "/api/v1/protected", headers: { cookie: "csrf_token=t", "x-csrf-token": "t" } });
    expect(response.statusCode).toBe(403);
    expect(response.json().message).toBe("Account suspended");
  });

  it.each(["auth-lookalike", "internal-lookalike"])("does not exempt prefix lookalikes: %s", async (path) => {
    expect((await app.inject({ method: "POST", url: `/api/v1/${path}` })).statusCode).toBe(403);
  });
});

import { afterAll } from "vitest";
afterAll(() => app.close());
