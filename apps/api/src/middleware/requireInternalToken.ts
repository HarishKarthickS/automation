import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

export async function requireInternalToken(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.code(401).send({ message: "Missing internal token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const expected = Buffer.from(env.INTERNAL_CRON_TOKEN, "utf8");
  const actual = Buffer.from(token, "utf8");
  const valid =
    actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  if (!valid) {
    reply.code(403).send({ message: "Invalid internal token" });
    return;
  }
}

