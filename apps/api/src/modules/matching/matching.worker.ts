import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { logger } from "@/middleware/logger.middleware";
import { ACCEPT_TIMEOUT_MS } from "@mechago/shared";
import { MATCHING_QUEUE_NAME, scheduleMatchingTimeout } from "./matching.queue";
import { MatchingService } from "./matching.service";

const processJob = async (job: Job) => {
  const { requestId } = job.data;

  try {
    switch (job.name) {
      case "processMatching": {
        logger.info({ requestId }, "Processing matching job");
        const result = await MatchingService.processMatchingJob(requestId);

        // Só agenda timeout se profissionais foram notificados (status ainda é matching)
        if (result === "notified") {
          await scheduleMatchingTimeout(requestId, ACCEPT_TIMEOUT_MS);
        }
        break;
      }

      case "matchingTimeout":
        logger.info({ requestId }, "Processing matching timeout");
        await MatchingService.markAsWaiting(requestId);
        break;

      default:
        logger.warn({ jobName: job.name }, "Unknown job name in matching worker");
    }
  } catch (err) {
    logger.error(
      { requestId, jobName: job.name, error: err instanceof Error ? err.message : "Unknown error" },
      "Matching job processing failed",
    );
    throw err;
  }
};

export const matchingWorker = new Worker(MATCHING_QUEUE_NAME, processJob, {
  connection: redis,
  concurrency: 5,
});

matchingWorker.on("completed", (job) => {
  logger.info({ jobId: job.id, name: job.name }, "Matching job completed");
});

matchingWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, name: job?.name, error: err.message }, "Matching job failed");
});
