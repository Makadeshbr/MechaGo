import { serve } from "@hono/node-server";
import { env } from "@/env";
import { createApp } from "@/app";
import { logger } from "@/middleware/logger.middleware";

const app = createApp();

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info(`MechaGo API running on http://localhost:${info.port}`);
    logger.info(`Docs: http://localhost:${info.port}/docs`);
    logger.info(`Health: http://localhost:${info.port}/health`);
  },
);
