import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "../../middleware/auth.middleware";
import { uploadsService } from "./uploads.service";
import {
  localUploadParamsSchema,
  localUploadResponseSchema,
  presignedUrlRequestSchema,
  presignedUrlResponseSchema,
} from "./uploads.schemas";

const getPresignedUrlRoute = createRoute({
  method: "post",
  path: "/presigned-url",
  tags: ["Uploads"],
  summary: "Get presigned URL for file upload",
  description:
    "Returns a presigned URL for uploading a file. Uses R2 in production, local fallback in dev.",
  request: { body: { content: { "application/json": { schema: presignedUrlRequestSchema } } } },
  responses: {
    200: {
      content: { "application/json": { schema: presignedUrlResponseSchema } },
      description: "Presigned URL generated successfully",
    },
    401: { description: "Unauthorized" },
    422: { description: "Validation error" },
  },
  middleware: [authMiddleware] as const,
});

// Limite de 10MB para uploads
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const localUploadRoute = createRoute({
  method: "post",
  path: "/local/:fileKey",
  tags: ["Uploads"],
  summary: "Upload file to local storage (MVP fallback)",
  description:
    "Accepts multipart/form-data file upload and saves to local disk. Used when R2 is not configured.",
  request: {
    params: localUploadParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: localUploadResponseSchema,
        },
      },
      description: "File uploaded successfully",
    },
    400: { description: "No file provided" },
    401: { description: "Unauthorized" },
    413: { description: "File too large" },
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

uploadsApp.openapi(getPresignedUrlRoute, async (c) => {
  const body = c.req.valid("json");
  const baseUrl = getBaseUrl(
    c.req.url,
    c.req.header("x-forwarded-host"),
    c.req.header("x-forwarded-proto"),
  );

  const result = await uploadsService.getPresignedUrl({
    ...body,
    baseUrl,
  });
  return c.json(result, 200);
});

uploadsApp.openapi(localUploadRoute, async (c) => {
  const { fileKey } = c.req.valid("param");
  const baseUrl = getBaseUrl(
    c.req.url,
    c.req.header("x-forwarded-host"),
    c.req.header("x-forwarded-proto"),
  );

  const contentType = c.req.header("content-type") || "";

  let buffer: Buffer;

  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    buffer = Buffer.from(await file.arrayBuffer());
  } else {
    // Raw binary upload
    buffer = Buffer.from(await c.req.arrayBuffer());
  }

  if (buffer.length === 0) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (buffer.length > MAX_UPLOAD_SIZE) {
    return c.json({ error: "File too large. Maximum size is 10MB" }, 413);
  }

  const publicUrl = await uploadsService.saveLocalFileWithBaseUrl(
    fileKey,
    buffer,
    baseUrl,
  );
  return c.json({ publicUrl }, 200);
});
