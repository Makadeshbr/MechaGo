import { MiddlewareHandler } from "hono";
import pino from "pino";
import { env } from "@/env";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

// Middleware que loga cada request com timing
export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  // Injeta requestId no context para rastreabilidade
  c.set("requestId", requestId);

  logger.info(
    {
      requestId,
      method: c.req.method,
      path: c.req.path,
      userAgent: c.req.header("user-agent"),
    },
    "Request started",
  );

  await next();

  const duration = Date.now() - start;

  logger.info(
    {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration: `${duration}ms`,
    },
    "Request completed",
  );
};
