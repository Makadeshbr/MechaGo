import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { apiReference } from "@scalar/hono-api-reference";
import { loggerMiddleware } from "@/middleware/logger.middleware";
import { errorHandler } from "@/middleware/error-handler";
import { env } from "@/env";
import authRoutes from "@/modules/auth/auth.routes";
import usersRoutes from "@/modules/users/users.routes";
import vehiclesRoutes from "@/modules/vehicles/vehicles.routes";
import serviceRequestsRoutes from "@/modules/service-requests/service-requests.routes";
import professionalRoutes from "@/modules/professionals/professionals.routes";
import { uploadsApp } from "@/modules/uploads/uploads.routes";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

// Regex para prevenir path traversal em nomes de arquivo
const SAFE_FILENAME = /^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$/;

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export function createApp() {
  const app = new OpenAPIHono();
  const allowedOrigins = env.API_CORS_ORIGIN.split(",").map((origin) => origin.trim());

  // Middleware global
  app.use(
    "*",
    cors({
      origin: allowedOrigins,
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
  app.route("/api/v1/uploads", uploadsApp);

  // Servir arquivos de upload local — apenas quando R2 NÃO está configurado (dev/MVP).
  // Em produção, R2 Public URL serve os arquivos diretamente via CDN.
  if (!env.R2_PUBLIC_URL) {
    app.get("/uploads/:filename", async (c) => {
      const filename = c.req.param("filename");

      if (!SAFE_FILENAME.test(filename)) {
        return c.json({ error: "Invalid filename" }, 400);
      }

      const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
      const contentType = MIME_TYPES[ext];
      if (!contentType) {
        return c.json({ error: "Unsupported file type" }, 400);
      }

      const filePath = join(process.cwd(), "uploads", filename);

      try {
        await access(filePath);
        const buffer = await readFile(filePath);
        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
            "X-Frame-Options": "DENY",
          },
        });
      } catch {
        return c.json({ error: "File not found" }, 404);
      }
    });
  }

  return app;
}
