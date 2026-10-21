import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { db, pool } from "./db/client.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { shutdownQueue, startDueAutomationsWorker } from "./queue/redisQueue.js";

const app = createApp();

async function ensureDatabaseReady() {
  if (env.autoMigrate) {
    app.log.info("AUTO_MIGRATE=true, applying database migrations");
    const migrationLock = await pool.connect();
    try {
      await migrationLock.query("select pg_advisory_lock(7081342)");
      await migrate(db, { migrationsFolder: "./drizzle" });
    } finally {
      await migrationLock.query("select pg_advisory_unlock(7081342)");
      migrationLock.release();
    }
  }

  const result = await pool.query<{ relation: string | null }>(
    `select to_regclass('public."user"') as relation`
  );
  const exists = result.rows[0]?.relation;

  if (!exists) {
    throw new Error(
      'Database schema is missing. Run "corepack pnpm --filter @automation/api db:migrate" or set AUTO_MIGRATE=true.'
    );
  }
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

const shutdown = async () => {
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

