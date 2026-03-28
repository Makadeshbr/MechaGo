import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../env";
import { Errors } from "../../utils/errors";
import type {
  PresignedUrlResponse,
  UploadContext,
} from "./uploads.schemas";

const PRESIGNED_URL_EXPIRES_IN_SECONDS = 15 * 60;
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

export class UploadsService {
  private readonly localUploadDir = join(process.cwd(), "uploads");

  /**
   * Generate a presigned URL for file upload.
   *
   * Strategy:
   *   - If R2 env vars are configured → return R2 presigned URL (production)
   *   - Otherwise → return local upload URL with fallback (MVP/dev)
   */
  async getPresignedUrl(params: {
    fileName: string;
    contentType: string;
    context: UploadContext;
    baseUrl?: string;
  }): Promise<PresignedUrlResponse> {
    if (!ALLOWED_CONTENT_TYPES.includes(params.contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
      throw Errors.validation(
        `Content type '${params.contentType}' not allowed. Accepted: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
      );
    }

    const ext = this.getExtension(params.fileName, params.contentType);
    const fileKey = `${params.context}_${Date.now()}_${randomUUID()}${ext}`;

    if (this.hasR2Config()) {
      return this.getR2PresignedUrl(fileKey, params.contentType);
    }

    return this.getLocalUploadUrl(fileKey, params.baseUrl);
  }

  /**
   * Local fallback: returns a POST endpoint URL.
   * The client uploads via multipart/form-data to this URL.
   */
  private async getLocalUploadUrl(
    fileKey: string,
    baseUrl?: string,
  ): Promise<PresignedUrlResponse> {
    await mkdir(this.localUploadDir, { recursive: true });

    const resolvedBaseUrl = trimTrailingSlash(baseUrl ?? env.API_URL ?? "http://localhost:3000");
    const uploadUrl = `${resolvedBaseUrl}/api/v1/uploads/local/${fileKey}`;
    const publicUrl = `${resolvedBaseUrl}/uploads/${fileKey}`;

    return {
      uploadUrl,
      fileKey,
      publicUrl,
      expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
    };
  }

  /**
   * R2 presigned URL (production).
   * Uses AWS S3-compatible presigned PUT URL.
   */
  private async getR2PresignedUrl(
    fileKey: string,
    contentType: string,
  ): Promise<PresignedUrlResponse> {
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

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: fileKey,
        ContentType: contentType,
      }),
      { expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS },
    );

    return {
      uploadUrl,
      fileKey,
      publicUrl: this.buildR2PublicUrl(fileKey),
      expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
    };
  }

  /**
   * Save a file locally (used by the local upload endpoint).
   */
  async saveLocalFile(fileKey: string, buffer: Buffer): Promise<string> {
    return this.saveLocalFileWithBaseUrl(fileKey, buffer);
  }

  async saveLocalFileWithBaseUrl(
    fileKey: string,
    buffer: Buffer,
    baseUrl?: string,
  ): Promise<string> {
    await mkdir(this.localUploadDir, { recursive: true });
    const filePath = join(this.localUploadDir, fileKey);
    await writeFile(filePath, buffer);

    const resolvedBaseUrl = trimTrailingSlash(
      baseUrl ?? env.API_URL ?? "http://localhost:3000",
    );
    return `${resolvedBaseUrl}/uploads/${fileKey}`;
  }

  private getExtension(fileName: string, contentType: string): string {
    const sanitizedFileName = fileName.trim().toLowerCase();
    const lastDotIndex = sanitizedFileName.lastIndexOf(".");
    if (lastDotIndex > -1) {
      const extensionFromName = sanitizedFileName.slice(lastDotIndex);
      if (/^\.[a-z0-9]+$/.test(extensionFromName)) {
        return extensionFromName;
      }
    }

    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/heic": ".heic",
      "image/heif": ".heif",
    };
    return map[contentType] || ".jpg";
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
      throw Errors.internal(
        "R2 public URL configuration missing. Configure R2_PUBLIC_URL to serve uploaded files.",
      );
    }

    return `${trimTrailingSlash(env.R2_PUBLIC_URL)}/${fileKey}`;
  }
}

export const uploadsService = new UploadsService();
