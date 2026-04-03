import { serve } from "@hono/node-server";
import { env } from "@/env";
import { createApp } from "@/app";
import { logger } from "@/middleware/logger.middleware";
import { initSocketIO } from "@/socket";
import "@/modules/matching/matching.worker"; // Inicia BullMQ worker

const app = createApp();

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
    hostname: "0.0.0.0", // OBRIGATÓRIO para Railway/Docker
  },
  (info) => {
    logger.info(`MechaGo API running on http://0.0.0.0:${info.port}`);
    logger.info(`Docs: http://localhost:${info.port}/docs`);
    logger.info(`Health: http://localhost:${info.port}/health`);
  },
);

initSocketIO(server as any);
