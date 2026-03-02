import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { env } from "../config/env.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications
    }
  }),
  baseURL: `${env.BETTER_AUTH_URL}/api/v1/auth`,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.corsOrigins,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 10,
    maxPasswordLength: 128
  },
  advanced: {
    cookiePrefix: "caas",
    defaultCookieAttributes: {
      secure: env.isProd,
      sameSite: env.isProd ? "none" : "lax",
      httpOnly: true,
      path: "/"
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24
  }
});

