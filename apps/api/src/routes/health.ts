import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => ({
    status: "ok",
    uptime: process.uptime()
  }));

  app.get("/health", async () => ({
    status: "ok",
    uptime: process.uptime()
  }));

  app.get("/heath", async () => ({
    status: "ok",
    uptime: process.uptime()
  }));

  app.get("/ready", async () => ({
    status: "ready"
  }));
};

