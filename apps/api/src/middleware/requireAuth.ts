import type { FastifyReply, FastifyRequest } from "fastify";
import { getSessionFromRequest } from "../auth/session.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authContext = await getSessionFromRequest(request);
  if (!authContext) {
    reply.code(401).send({ message: "Unauthorized" });
    return;
  }

  request.authUser = authContext.user;
  request.authSession = authContext.session;
}

