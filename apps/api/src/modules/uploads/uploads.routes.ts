import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { authMiddleware } from "../../middleware/auth.middleware";
import { uploadsService } from "./uploads.service";
import { uploadContextSchema } from "./uploads.schemas";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

const uploadRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Uploads"],
  summary: "Upload de arquivo (foto de diagnóstico, conclusão ou avatar)",
  description:
    "Recebe o arquivo via multipart/form-data e faz o upload para R2 (produção) ou " +
    "armazenamento local (MVP). Retorna a URL pública do arquivo.",
  request: {
    body: {
      content: { "multipart/form-data": { schema: z.object({ file: z.any() }) } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ publicUrl: z.string().url(), fileKey: z.string() }),
        },
      },
      description: "Upload realizado com sucesso",
    },
    400: { description: "Arquivo ausente ou inválido" },
    401: { description: "Não autenticado" },
    413: { description: "Arquivo muito grande (máx 10MB)" },
    422: { description: "Tipo de arquivo não permitido" },
  },
  middleware: [authMiddleware] as const,
});

export const uploadsApp = new OpenAPIHono();

function getBaseUrl(requestUrl: string, forwardedHost?: string, forwardedProto?: string) {
  const parsedUrl = new URL(requestUrl);
  if (forwardedHost) {
    return `${forwardedProto ?? parsedUrl.protocol.replace(":", "")}://${forwardedHost}`;
  }
  return parsedUrl.origin;
}

uploadsApp.openapi(uploadRoute, async (c) => {
  const baseUrl = getBaseUrl(
    c.req.url,
    c.req.header("x-forwarded-host"),
    c.req.header("x-forwarded-proto"),
  );

  const contextParam = c.req.query("context");
  const contextResult = uploadContextSchema.safeParse(contextParam ?? "diagnosis");
  const context = contextResult.success ? contextResult.data : ("diagnosis" as const);

  const body = await c.req.parseBody();
  const file = body.file;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "Arquivo ausente. Envie o campo 'file' como multipart/form-data." }, 400);
  }

  if (file.size === 0) {
    return c.json({ error: "Arquivo vazio." }, 400);
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return c.json({ error: "Arquivo muito grande. Limite de 10MB." }, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";

  const result = await uploadsService.uploadFile({
    buffer,
    fileName: file.name || `upload_${Date.now()}.jpg`,
    contentType,
    context,
    baseUrl,
  });

  return c.json(result, 200);
});
