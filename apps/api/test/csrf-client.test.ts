import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("../src/auth/session.js", () => ({ getSessionFromRequest: vi.fn() }));
import { authRoutes } from "../src/routes/auth.js";
import { csrfPlugin } from "../src/security/csrf.js";
import { apiFetch, ensureCsrfToken, resetCsrfToken } from "../../web/src/lib/api.js";
afterEach(() => { vi.unstubAllGlobals(); resetCsrfToken(); });
it("preserves a valid shared cookie across tabs and recovers once after cookie rotation", async () => {
  const app = Fastify(); app.register(cookie); app.register(csrfPlugin); app.register(authRoutes, { prefix: "/api/v1" });
  const mutated = vi.fn(async () => ({ ok: true })); app.post("/api/v1/probe", mutated);
  let jar = "";
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const res = await app.inject({ method: (init.method ?? "GET") as any, url, headers: { ...(init.headers as any), ...(jar ? { cookie: `csrf_token=${jar}` } : {}) } });
    jar = res.cookies.find((c) => c.name === "csrf_token")?.value ?? jar;
    return new Response(res.body, { status: res.statusCode });
  });
  try {
    const first = await ensureCsrfToken();
    const other = await app.inject({ url: "/api/v1/csrf-token", headers: { cookie: `csrf_token=${jar}` } });
    expect(other.json().csrfToken).toBe(first);
    jar = "a".repeat(32);
    expect(await apiFetch("/probe", { method: "POST" })).toEqual({ ok: true });
    expect(mutated).toHaveBeenCalledTimes(1);
  } finally { await app.close(); }
});
it("coalesces concurrent initial token fetches", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ csrfToken: "token" })));
  vi.stubGlobal("fetch", fetcher);
  expect(await Promise.all([ensureCsrfToken(), ensureCsrfToken()])).toEqual(["token", "token"]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("does not retry authorization failures unrelated to CSRF", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("csrf-token") ? new Response(JSON.stringify({ csrfToken: "token" })) : new Response(JSON.stringify({ message: "Account suspended" }), { status: 403 })));
  await expect(apiFetch("/probe", { method: "POST" })).rejects.toMatchObject({ statusCode: 403 });
  expect(fetch).toHaveBeenCalledTimes(2);
});
