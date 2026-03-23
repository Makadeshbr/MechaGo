import Redis from "ioredis";
import { env } from "@/env";
import { logger } from "@/middleware/logger.middleware";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    // Retry com backoff exponencial, máximo 3 segundos
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error({ error: err.message }, "Redis error"));
