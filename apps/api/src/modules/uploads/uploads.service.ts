import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../env";
import { logger } from "../../middleware/logger.middleware";
import { Errors } from "../../utils/errors";
import type { UploadContext } from "./uploads.schemas";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

// Mapeamento fixo: content-type → extensão de arquivo
const EXTENSION_MAP: Record<AllowedContentType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

// Magic bytes (assinatura binária) dos formatos aceitos
const MAGIC_BYTES: Array<{ type: AllowedContentType; bytes: number[] }> = [
  { type: "image/jpeg", bytes: [0xFF, 0xD8, 0xFF] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4E, 0x47] },
  // WebP: RIFF....WEBP
  { type: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  // HEIC/HEIF: ftyp container — bytes 4-7 são 'ftyp'
  { type: "image/heic", bytes: [] },
  { type: "image/heif", bytes: [] },
];

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * Verifica se os primeiros bytes do buffer correspondem a um formato de imagem conhecido.
 * HEIC/HEIF usam container ISO BMFF ('ftyp' nos bytes 4-7).
 */
function validateMagicBytes(buffer: Buffer, declaredType: string): boolean {
  if (buffer.length < 8) return false;

  // HEIC/HEIF: bytes 4-7 devem ser 'ftyp'
  if (declaredType === "image/heic" || declaredType === "image/heif") {
    const ftypMarker = buffer.subarray(4, 8).toString("ascii");
    return ftypMarker === "ftyp";
  }

  const match = MAGIC_BYTES.find((m) => m.type === declaredType);
  if (!match || match.bytes.length === 0) return true;

  for (let i = 0; i < match.bytes.length; i++) {
    if (buffer[i] !== match.bytes[i]) return false;
  }

  return true;
}

export interface DirectUploadResult {
  publicUrl: string;
  fileKey: string;
}

// Singleton do S3Client — reutiliza conexões TCP/TLS para o R2
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw Errors.internal("Credenciais R2 ausentes — verifique R2_ENDPOINT, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY");
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return r2Client;
}

export class UploadsService {
  private readonly localUploadDir = join(process.cwd(), "uploads");

  /**
   * Upload server-side: recebe o buffer e faz PutObject para R2 ou salva local.
   * Valida content-type na lista de permitidos e verifica magic bytes
   * para impedir que arquivos maliciosos se passem por imagens.
   */
  async uploadFile(params: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
    context: UploadContext;
    baseUrl?: string;
  }): Promise<DirectUploadResult> {
    const contentType = params.contentType as AllowedContentType;

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw Errors.validation(
        `Tipo de arquivo não permitido: ${params.contentType}. Aceitos: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
      );
    }

    if (!validateMagicBytes(params.buffer, contentType)) {
      logger.warn({
        msg: "upload_magic_bytes_mismatch",
        declaredType: params.contentType,
        fileName: params.fileName,
        firstBytes: params.buffer.subarray(0, 8).toString("hex"),
      });
      throw Errors.validation(
        "O conteúdo do arquivo não corresponde ao tipo declarado. Envie uma imagem válida.",
      );
    }

    // Extensão derivada do content-type validado — nunca do nome do arquivo
    const ext = EXTENSION_MAP[contentType];
    const fileKey = `${params.context}_${Date.now()}_${randomUUID()}${ext}`;

    const startTime = Date.now();

    if (this.hasR2Config()) {
      const result = await this.uploadToR2(fileKey, params.buffer, params.contentType);
      logger.info({
        msg: "upload_success",
        storage: "r2",
        fileKey,
        context: params.context,
        contentType: params.contentType,
        sizeBytes: params.buffer.length,
        durationMs: Date.now() - startTime,
      });
      return result;
    }

    const result = await this.saveLocally(fileKey, params.buffer, params.baseUrl);
    logger.info({
      msg: "upload_success",
      storage: "local",
      fileKey,
      context: params.context,
      contentType: params.contentType,
      sizeBytes: params.buffer.length,
      durationMs: Date.now() - startTime,
    });
    return result;
  }

  private async uploadToR2(
    fileKey: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<DirectUploadResult> {
    if (!env.R2_BUCKET) {
      throw Errors.internal("R2_BUCKET não configurada");
    }

    const client = getR2Client();

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
