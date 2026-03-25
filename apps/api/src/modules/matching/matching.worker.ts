import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { logger } from "@/middleware/logger.middleware";
import { MATCHING_QUEUE_NAME, scheduleMatchingTimeout } from "./matching.queue";
import { MatchingService } from "./matching.service";

const processJob = async (job: Job) => {
  const { requestId } = job.data;

  switch (job.name) {
    case "processMatching":
      logger.info({ requestId }, "Processing matching job");
      await MatchingService.processMatchingJob(requestId);
      // Agenda fallback de 3 minutos
      await scheduleMatchingTimeout(requestId, 180000);
      break;

    case "matchingTimeout":
      logger.info({ requestId }, "Processing matching timeout");
      await MatchingService.markAsWaiting(requestId);
      break;

    default:
      logger.warn({ jobName: job.name }, "Unknown job name in matching worker");
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
