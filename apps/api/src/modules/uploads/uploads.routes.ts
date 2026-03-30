import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { authMiddleware } from "../../middleware/auth.middleware";
import { uploadsService } from "./uploads.service";
import {
  presignedUrlRequestSchema,
  presignedUrlResponseSchema,
  uploadContextSchema,
} from "./uploads.schemas";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB — usado no fallback local

// Rota principal: emite presigned URL para upload direto ao R2 pelo cliente
const presignedUrlRoute = createRoute({
  method: "post",
  path: "/presigned-url",
  tags: ["Uploads"],
  summary: "Gera presigned URL para upload direto ao R2",
  description:
    "Retorna uma URL temporária (15 min) para o cliente fazer PUT diretamente no " +
    "Cloudflare R2, sem passar o arquivo pelo servidor. Elimina overhead de memória " +
    "e banda na Railway. Em dev/MVP sem R2, retorna 503.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: presignedUrlRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: presignedUrlResponseSchema,
        },
      },
      description: "Presigned URL gerada com sucesso",
    },
    400: { description: "Dados inválidos" },
    401: { description: "Não autenticado" },
    422: { description: "Tipo de arquivo não permitido" },
    503: { description: "R2 não configurado neste ambiente" },
  },
  middleware: [authMiddleware] as const,
});

// Rota de fallback: aceita multipart e salva localmente (dev/MVP sem R2)
const localUploadRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Uploads"],
  summary: "Upload local (fallback dev/MVP — sem R2)",
  description:
    "Recebe o arquivo via multipart/form-data e salva localmente. " +
    "Usar apenas em desenvolvimento. Em produção, usar /presigned-url.",
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
    503: { description: "Use /presigned-url em produção com R2 configurado" },
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

// Endpoint principal — presigned URL para upload direto ao R2
uploadsApp.openapi(presignedUrlRoute, async (c) => {
  if (!uploadsService.hasR2Config()) {
    return c.json(
      { error: "R2 não configurado. Use o endpoint /uploads (multipart) em desenvolvimento." },
      503,
    );
  }

  const input = c.req.valid("json");
  const result = await uploadsService.getPresignedUrl(input);
  return c.json(result, 200);
});

// Endpoint de fallback local — apenas quando R2 não está configurado
uploadsApp.openapi(localUploadRoute, async (c) => {
  if (uploadsService.hasR2Config()) {
    return c.json(
      { error: "R2 está configurado. Use POST /uploads/presigned-url para upload direto." },
      503,
    );
  }

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
