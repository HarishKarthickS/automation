import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/client.js";
import { assertSchemaReady, migrateDatabase } from "./db/readiness.js";
import { shutdownQueue, startDueAutomationsWorker } from "./queue/redisQueue.js";

const app = createApp();

async function ensureDatabaseReady() {
  if (env.autoMigrate) await migrateDatabase();
  await assertSchemaReady();
}

async function start() {
  try {
    await ensureDatabaseReady();

    await app.listen({
      port: env.PORT,
      host: "0.0.0.0"
    });

    await startDueAutomationsWorker();
    app.log.info(`API listening on port ${env.PORT}`);
  } catch (error) {
    app.log.error(error, "Failed to start API");
    process.exit(1);
  }
}

start();

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  const deadline = setTimeout(() => process.exit(1), 20_000); deadline.unref();
  await shutdownQueue();
  await app.close();
  await pool.end();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("unhandledRejection", async (reason) => {
  app.log.error({ err: reason }, "Unhandled promise rejection");
  await shutdown();
});

process.on("uncaughtException", async (error) => {
  app.log.error({ err: error }, "Uncaught exception");
  await shutdown();
});

