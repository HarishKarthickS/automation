import fp from "fastify-plugin";
import cors from "@fastify/cors";
import { env } from "../config/env.js";

export const corsPlugin = fp(async (app) => {
  await app.register(cors, {
    delegator(request, callback) {
      if (request.url.startsWith("/api/v1/internal/run-due-automations")) {
        callback(null, {
          origin: true,
          credentials: false,
          methods: ["POST", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization"]
        });
        return;
      }

      callback(null, {
        origin(origin, originCallback) {
          if (!origin) {
            originCallback(null, true);
            return;
          }

          if (env.corsOrigins.includes(origin)) {
            originCallback(null, true);
            return;
          }

          app.log.warn({ origin }, "Blocked CORS origin");
          originCallback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"]
      });
    }
  });
});

