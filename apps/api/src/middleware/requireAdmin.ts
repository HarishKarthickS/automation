import type { FastifyReply, FastifyRequest } from "fastify";
import { getSessionFromRequest } from "../auth/session.js";

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const authContext = await getSessionFromRequest(request);
  if (!authContext) {
    reply.code(401).send({ message: "Unauthorized" });
    return;
  }

  if (authContext.user.suspended) {
    reply.code(403).send({ message: "Account suspended" });
    return;
  }

  if (!authContext.user.isAdmin) {
    reply.code(403).send({ message: "Admin access required" });
    return;
  }

  request.authUser = authContext.user;
  request.authSession = authContext.session;
}
