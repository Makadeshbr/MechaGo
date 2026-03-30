import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../env";
import { Errors } from "../../utils/errors";
import type { PresignedUrlRequest, PresignedUrlResponse, UploadContext } from "./uploads.schemas";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

// URL presigned expira em 15 minutos — tempo suficiente para o cliente fazer o PUT
const PRESIGNED_URL_EXPIRES_IN = 900;

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT!,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export interface DirectUploadResult {
  publicUrl: string;
  fileKey: string;
}

export class UploadsService {
  private readonly localUploadDir = join(process.cwd(), "uploads");

  /**
   * Gera uma presigned URL para upload direto do cliente para o R2.
   *
   * A URL tem validade de 15 minutos. O content-type é marcado como unsignable
   * para evitar incompatibilidade de headers entre o AWS SDK e o cliente móvel,
   * que é o principal vetor de 403 com presigned URLs em React Native.
   */
  async getPresignedUrl(params: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    if (!this.hasR2Config()) {
      throw Errors.internal("R2 não configurado — presigned URL indisponível");
    }

    if (!ALLOWED_CONTENT_TYPES.includes(params.contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
      throw Errors.validation(
        `Tipo de arquivo não permitido: ${params.contentType}. Aceitos: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
      );
    }

    const ext = this.getExtension(params.fileName, params.contentType);
    const fileKey = `${params.context}_${Date.now()}_${randomUUID()}${ext}`;

    const client = buildR2Client();

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: fileKey,
      ContentType: params.contentType,
    });

    // unsignableHeaders exclui content-type da assinatura — o cliente pode
    // enviar o header sem quebrar a verificação de assinatura do R2
    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
      unhoistableHeaders: new Set(["content-type", "x-amz-content-sha256"]),
      unsignableHeaders: new Set(["content-type"]),
    });

    return {
      uploadUrl,
      fileKey,
      publicUrl: this.buildR2PublicUrl(fileKey),
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
    };
  }

  /**
   * Upload server-side para fallback local (dev/MVP sem R2).
   * Em produção, o cliente usa presigned URL e faz PUT direto no R2.
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

    return this.saveLocally(fileKey, params.buffer, params.baseUrl);
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
