import fp from "fastify-plugin";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const pathname = request.url.split("?")[0];
    if (["/api/v1/internal", "/api/v1/auth"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return;
    }

    if (SAFE_METHODS.has(request.method)) {
      return;
    }

    const cookieToken = request.cookies.csrf_token;
    const headerToken = request.headers["x-csrf-token"];

    if (!cookieToken || typeof headerToken !== "string" || cookieToken !== headerToken) {
      reply.code(403).send({ message: "Invalid CSRF token", code: "CSRF_INVALID" });
    }
  });
});

