import crypto from "node:crypto";
import type { Redis } from "ioredis";
import { env } from "../config/env.js";
import { redis } from "../db/redis.js";
import { runDueAutomations } from "../scheduler/runDueAutomations.js";
import { logger } from "../utils/logger.js";

interface QueueJobPayload {
  jobId: string;
  triggeredAt: string;
}

const queueName = env.REDIS_DUE_QUEUE;
let workerClient: Redis | null = null;
let workerStarted = false;
let workerStopping = false;
let workerLoopPromise: Promise<void> | null = null;

async function workerLoop(client: Redis) {
  while (!workerStopping) {
    try {
      const result = await client.brpop(queueName, 5);
      if (!result) {
        continue;
      }

      const payloadRaw = result[1];
      let jobId = "unknown";
      try {
        const payload = JSON.parse(payloadRaw) as QueueJobPayload;
        jobId = payload.jobId;
      } catch {
        jobId = "unknown";
      }

      logger.info({ jobId, queue: queueName }, "Redis due automation job started");
      await runDueAutomations();
      logger.info({ jobId, queue: queueName }, "Redis due automation job completed");
    } catch (error) {
      if (workerStopping) {
        break;
      }
      logger.error({ err: error, queue: queueName }, "Redis due automation worker error");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export async function enqueueDueAutomationsJob() {
  const jobId = crypto.randomUUID();
  const payload: QueueJobPayload = {
    jobId,
    triggeredAt: new Date().toISOString()
  };

  try {
    await redis.lpush(queueName, JSON.stringify(payload));
    return {
      initiated: true,
      mode: "redis" as const,
      jobId
    };
  } catch (error) {
    logger.error({ err: error, jobId, queue: queueName }, "Redis enqueue failed, using async fallback");
    setImmediate(() => {
      runDueAutomations().catch((runError) => {
        logger.error({ err: runError, jobId }, "Async fallback due automation run failed");
      });
    });

    return {
      initiated: true,
      mode: "fallback" as const,
      jobId
    };
  }
}

export async function startDueAutomationsWorker() {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  workerStopping = false;

  try {
    workerClient = redis.duplicate({
      lazyConnect: true,
      connectTimeout: 10000
    });
    await workerClient.connect();

    workerLoopPromise = workerLoop(workerClient).catch((error) => {
      logger.error({ err: error }, "Redis due automation worker loop crashed");
    });

    logger.info({ queue: queueName }, "Redis due automation worker started");
  } catch (error) {
    workerStarted = false;
    logger.error({ err: error }, "Failed to start Redis due automation worker");
  }
}

export async function shutdownQueue() {
  workerStopping = true;

  if (workerLoopPromise) {
    await workerLoopPromise;
    workerLoopPromise = null;
  }

  if (workerClient) {
    await workerClient.quit();
    workerClient = null;
  }

  workerStarted = false;
}

