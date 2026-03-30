import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../env";
import { Errors } from "../../utils/errors";
import type { UploadContext } from "./uploads.schemas";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export interface DirectUploadResult {
  publicUrl: string;
  fileKey: string;
}

export class UploadsService {
  private readonly localUploadDir = join(process.cwd(), "uploads");

  /**
   * Recebe o buffer do arquivo e faz upload server-side para o R2.
   *
   * Upload server-side é o padrão correto para mobile: o cliente envia multipart
   * para o backend, que faz PutObject para o R2. Elimina toda a complexidade de
   * presigned URL (headers de assinatura, CORS, incompatibilidade com expo-file-system).
   */
  async uploadFile(params: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
    context: UploadContext;
    baseUrl?: string;
  }): Promise<DirectUploadResult> {
    if (!ALLOWED_CONTENT_TYPES.includes(params.contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
      throw Errors.validation(
        `Tipo de arquivo não permitido: ${params.contentType}. Aceitos: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
      );
    }

    const ext = this.getExtension(params.fileName, params.contentType);
    const fileKey = `${params.context}_${Date.now()}_${randomUUID()}${ext}`;

    if (this.hasR2Config()) {
      return this.uploadToR2(fileKey, params.buffer, params.contentType);
    }

    return this.saveLocally(fileKey, params.buffer, params.baseUrl);
  }

  /**
   * Upload direto para o R2 via SDK server-side (PutObjectCommand).
   * O Railway faz o PUT — sem presigned URL, sem problemas de headers móveis.
   */
  private async uploadToR2(
    fileKey: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<DirectUploadResult> {
    if (!env.R2_BUCKET || !env.R2_ENDPOINT) {
      throw Errors.internal("R2 configuration missing bucket or endpoint");
    }

    const client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: fileKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return {
      publicUrl: this.buildR2PublicUrl(fileKey),
      fileKey,
    };
  }

  private async saveLocally(
    fileKey: string,
    buffer: Buffer,
    baseUrl?: string,
  ): Promise<DirectUploadResult> {
    await mkdir(this.localUploadDir, { recursive: true });
    const filePath = join(this.localUploadDir, fileKey);
    await writeFile(filePath, buffer);

    const resolvedBaseUrl = trimTrailingSlash(
      baseUrl ?? env.API_URL ?? "http://localhost:3000",
    );

    return {
      publicUrl: `${resolvedBaseUrl}/uploads/${fileKey}`,
      fileKey,
    };
  }

  private getExtension(fileName: string, contentType: string): string {
    const sanitizedFileName = fileName.trim().toLowerCase();
    const lastDotIndex = sanitizedFileName.lastIndexOf(".");
    if (lastDotIndex > -1) {
      const ext = sanitizedFileName.slice(lastDotIndex);
      if (/^\.[a-z0-9]+$/.test(ext)) return ext;
    }

    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/heic": ".heic",
      "image/heif": ".heif",
    };
    return map[contentType] ?? ".jpg";
  }

  hasR2Config(): boolean {
    return Boolean(
      env.R2_ENDPOINT &&
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        env.R2_BUCKET &&
        env.R2_PUBLIC_URL,
    );
  }

  private buildR2PublicUrl(fileKey: string): string {
    if (!env.R2_PUBLIC_URL) {
      throw Errors.internal("R2_PUBLIC_URL não configurada.");
    }
    return `${trimTrailingSlash(env.R2_PUBLIC_URL)}/${fileKey}`;
  }
}

export const uploadsService = new UploadsService();
