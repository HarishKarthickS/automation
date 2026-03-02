import crypto from "node:crypto";
import fp from "fastify-plugin";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/api/v1/internal") || request.url.startsWith("/api/v1/auth")) {
      return;
    }

    const existing = request.cookies.csrf_token;

    if (!existing) {
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

