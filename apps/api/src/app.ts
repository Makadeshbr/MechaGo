import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { apiReference } from "@scalar/hono-api-reference";
import { loggerMiddleware } from "@/middleware/logger.middleware";
import { errorHandler } from "@/middleware/error-handler";
import authRoutes from "@/modules/auth/auth.routes";
import usersRoutes from "@/modules/users/users.routes";
import vehiclesRoutes from "@/modules/vehicles/vehicles.routes";
import serviceRequestsRoutes from "@/modules/service-requests/service-requests.routes";
import professionalRoutes from "@/modules/professionals/professionals.routes";

export function createApp() {
  const app = new OpenAPIHono();

  // Middleware global
  app.use(
    "*",
    cors({
      origin: ["http://localhost:8081"], // Expo dev server
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );
  app.use("*", loggerMiddleware);
  app.onError(errorHandler);

  // Health check — Railway usa para saber se o container está saudável
  app.get("/health", (c) =>
    c.json({ status: "ok", timestamp: new Date().toISOString() }),
  );
  app.get("/ready", (c) =>
    c.json({ status: "ready", timestamp: new Date().toISOString() }),
  );

  // OpenAPI spec
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "MechaGo API",
      version: "1.0.0",
      description: "API de socorro automotivo — Escopo dual urbano + rodovia",
    },
  });

  // Scalar UI para documentação interativa
  app.get(
    "/docs",
    apiReference({
      theme: "kepler",
      spec: { url: "/openapi.json" },
    }),
  );

  // Módulos
  app.route("/api/v1/auth", authRoutes);
  app.route("/api/v1/users", usersRoutes);
  app.route("/api/v1/vehicles", vehiclesRoutes);
  app.route("/api/v1/service-requests", serviceRequestsRoutes);
  app.route("/api/v1/professionals", professionalRoutes);

  return app;
}
