import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: {
      id: string;
      email: string;
      name: string;
    };
    authSession?: {
      id: string;
      userId: string;
      expiresAt: Date;
    };
  }
}

