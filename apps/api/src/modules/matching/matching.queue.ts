import { Queue } from "bullmq";
import { redis } from "@/lib/redis";
import { ACCEPT_TIMEOUT_MS } from "@mechago/shared";

export const MATCHING_QUEUE_NAME = "matchingQueue";

export const matchingQueue = new Queue(MATCHING_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 5000,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export const scheduleMatchingJob = async (requestId: string) => {
  return matchingQueue.add("processMatching", { requestId });
};

export const scheduleMatchingTimeout = async (requestId: string, delayMs: number = ACCEPT_TIMEOUT_MS) => {
  return matchingQueue.add("matchingTimeout", { requestId }, { delay: delayMs });
};
