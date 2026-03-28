import { z } from "@hono/zod-openapi";

const imageContentTypeSchema = z
  .string()
  .regex(
    /^image\/(jpeg|png|webp|heic|heif)$/,
    "Tipo de arquivo inválido. Envie JPEG, PNG, WebP, HEIC ou HEIF.",
  );

const fileNameSchema = z
  .string()
  .trim()
  .min(1, "Nome do arquivo é obrigatório")
  .max(255, "Nome do arquivo deve ter no máximo 255 caracteres")
  .regex(
    /^[^\\/:*?"<>|]+$/,
    "Nome do arquivo possui caracteres inválidos",
  );

export const uploadContextSchema = z.enum(["diagnosis", "completion", "avatar"]);

export const presignedUrlRequestSchema = z
  .object({
    fileName: fileNameSchema.optional(),
    filename: fileNameSchema.optional(),
    contentType: imageContentTypeSchema,
    context: uploadContextSchema,
  })
  .superRefine((input, ctx) => {
    if (!input.fileName && !input.filename) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nome do arquivo é obrigatório",
        path: ["fileName"],
      });
    }
  })
  .transform(({ fileName, filename, ...rest }) => ({
    ...rest,
    fileName: fileName ?? filename ?? "",
  }));

export const presignedUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileKey: z.string(),
  publicUrl: z.string().url(),
  expiresIn: z.number().int().positive(),
});

export const localUploadParamsSchema = z.object({
  fileKey: z
    .string()
    .regex(
      /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/,
      "fileKey deve ser alfanumérico com uma única extensão",
    ),
});

export const localUploadResponseSchema = z.object({
  publicUrl: z.string().url(),
});

export type PresignedUrlRequest = z.infer<typeof presignedUrlRequestSchema>;
export type PresignedUrlResponse = z.infer<typeof presignedUrlResponseSchema>;
export type UploadContext = z.infer<typeof uploadContextSchema>;
