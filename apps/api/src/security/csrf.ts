import crypto from "node:crypto";
import fp from "fastify-plugin";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const pathname = request.url.split("?")[0];
    if (["/api/v1/internal", "/api/v1/auth"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return;
    }

    const existing = request.cookies.csrf_token;

    // The token endpoint owns issuance so its JSON and single cookie always agree.
    if (!existing && pathname !== "/api/v1/csrf-token") {
      const token = crypto.randomBytes(24).toString("base64url");
      reply.setCookie("csrf_token", token, {
        path: "/",
        sameSite: "strict",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production"
      });
    }

    if (SAFE_METHODS.has(request.method)) {
      return;
    }

    const cookieToken = request.cookies.csrf_token;
    const headerToken = request.headers["x-csrf-token"];

    if (!cookieToken || typeof headerToken !== "string" || cookieToken !== headerToken) {
      reply.code(403).send({ message: "Invalid CSRF token" });
    }
  });
});

