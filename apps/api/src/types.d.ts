import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: {
      id: string;
      email: string;
      name: string;
      role: "user" | "admin";
      suspended: boolean;
      isAdmin: boolean;
    };
    authSession?: {
      id: string;
      userId: string;
      expiresAt: Date;
    };
  }
}

