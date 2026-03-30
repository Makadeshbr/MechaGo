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
   * Recebe o buffer do arquivo já lido pelo handler da rota e faz o upload
   * para R2 (se configurado) ou salva localmente (fallback MVP).
   *
   * Abandonamos o fluxo de presigned URL porque o AWS SDK v3 adiciona headers
   * à assinatura (x-amz-content-sha256, etc.) que clientes móveis nativos não
   * enviam de forma confiável, gerando 403 no R2.
   *
   * Com o upload server-side, o Railway faz o PUT para o R2 — sem problemas
   * de assinatura nem de Content-Type no lado do cliente.
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
   * Upload para Cloudflare R2 via AWS SDK (server-side).
   * O Railway faz o PutObject diretamente — sem presigned URL, sem problemas de CORS/headers.
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

  /**
   * Fallback local para MVP sem R2 configurado.
   */
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

  private hasR2Config(): boolean {
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
