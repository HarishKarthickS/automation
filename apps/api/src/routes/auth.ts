import crypto from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { getSessionFromRequest } from "../auth/session.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get("/csrf-token", async (_request, reply) => {
    const token = crypto.randomBytes(24).toString("base64url");
    reply.setCookie("csrf_token", token, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production"
    });

    return { csrfToken: token };
  });

  app.get("/session", async (request, reply) => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      reply.code(200).send({ session: null, user: null });
      return;
    }

    reply.code(200).send(session);
  });
};

