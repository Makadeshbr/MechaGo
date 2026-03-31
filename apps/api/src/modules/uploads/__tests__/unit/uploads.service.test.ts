import { beforeEach, describe, expect, it, vi } from "vitest";

const { s3SendMock, mkdirMock, writeFileMock } = vi.hoisted(() => ({
  s3SendMock: vi.fn(),
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: s3SendMock })),
  PutObjectCommand: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

import { env } from "../../../../env";
import { uploadsService } from "../../uploads.service";

// JPEG válido: começa com FF D8 FF
const VALID_JPEG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);

// PNG válido: começa com 89 50 4E 47
const VALID_PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// Buffer falso — não corresponde a nenhum formato de imagem
const FAKE_JPEG = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);

describe("UploadsService", () => {
  const originalEnv = { ...env };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(env, originalEnv);
    s3SendMock.mockResolvedValue({});
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  describe("uploadFile — fallback local (sem R2)", () => {
    beforeEach(() => {
      Object.assign(env, {
        R2_ENDPOINT: undefined,
        R2_ACCESS_KEY_ID: undefined,
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET: undefined,
        R2_PUBLIC_URL: undefined,
      });
    });

    it("deve salvar localmente e retornar URL pública", async () => {
      const result = await uploadsService.uploadFile({
        buffer: VALID_JPEG,
        fileName: "diagnostico.jpg",
        contentType: "image/jpeg",
        context: "diagnosis",
      });

      expect(mkdirMock).toHaveBeenCalled();
      expect(writeFileMock).toHaveBeenCalled();
      expect(result.publicUrl).toContain("/uploads/");
      expect(result.fileKey).toMatch(/^diagnosis_\d+_[a-f0-9-]+\.jpg$/);
    });
  });

  describe("uploadFile — R2 (produção)", () => {
    beforeEach(() => {
      Object.assign(env, {
        R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
        R2_ACCESS_KEY_ID: "key-id",
        R2_SECRET_ACCESS_KEY: "secret-key",
        R2_BUCKET: "mechago-uploads",
        R2_PUBLIC_URL: "https://uploads.mechago.com.br",
      });
    });

    it("deve fazer PutObject no R2 e retornar URL pública", async () => {
      const result = await uploadsService.uploadFile({
        buffer: VALID_PNG,
        fileName: "avatar.png",
        contentType: "image/png",
        context: "avatar",
      });

      expect(s3SendMock).toHaveBeenCalledOnce();
      expect(result.publicUrl).toMatch(
        /^https:\/\/uploads\.mechago\.com\.br\/avatar_\d+_[a-f0-9-]+\.png$/,
      );
      expect(mkdirMock).not.toHaveBeenCalled();
    });

    it("deve propagar erro quando o R2 recusar o upload", async () => {
      s3SendMock.mockRejectedValue(new Error("R2 access denied"));

      await expect(
        uploadsService.uploadFile({
          buffer: VALID_JPEG,
          fileName: "photo.jpg",
          contentType: "image/jpeg",
          context: "completion",
        }),
      ).rejects.toThrow("R2 access denied");
    });
  });

  describe("uploadFile — validação de content type", () => {
    it("deve rejeitar tipos de arquivo não permitidos", async () => {
      await expect(
        uploadsService.uploadFile({
          buffer: Buffer.from("exe-binary-padding-"),
          fileName: "malicioso.exe",
          contentType: "application/octet-stream",
          context: "diagnosis",
        }),
      ).rejects.toThrow("não permitido");
    });
  });

  describe("uploadFile — validação de magic bytes", () => {
    it("deve rejeitar arquivo com content-type JPEG mas bytes de ZIP", async () => {
      await expect(
        uploadsService.uploadFile({
          buffer: FAKE_JPEG,
          fileName: "trojan.jpg",
          contentType: "image/jpeg",
          context: "diagnosis",
        }),
      ).rejects.toThrow("não corresponde");
    });

    it("deve rejeitar arquivo com content-type PNG mas bytes de JPEG", async () => {
      await expect(
        uploadsService.uploadFile({
          buffer: VALID_JPEG,
          fileName: "fake.png",
          contentType: "image/png",
          context: "diagnosis",
        }),
      ).rejects.toThrow("não corresponde");
    });

    it("deve aceitar JPEG com magic bytes corretos", async () => {
      Object.assign(env, {
        R2_ENDPOINT: undefined,
        R2_ACCESS_KEY_ID: undefined,
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET: undefined,
        R2_PUBLIC_URL: undefined,
      });

      const result = await uploadsService.uploadFile({
        buffer: VALID_JPEG,
        fileName: "photo.jpg",
        contentType: "image/jpeg",
        context: "diagnosis",
      });

      expect(result.fileKey).toMatch(/\.jpg$/);
    });

    it("deve aceitar PNG com magic bytes corretos", async () => {
      Object.assign(env, {
        R2_ENDPOINT: undefined,
        R2_ACCESS_KEY_ID: undefined,
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET: undefined,
        R2_PUBLIC_URL: undefined,
      });

      const result = await uploadsService.uploadFile({
        buffer: VALID_PNG,
        fileName: "photo.png",
        contentType: "image/png",
        context: "diagnosis",
      });

      expect(result.fileKey).toMatch(/\.png$/);
    });

    it("deve rejeitar buffer muito pequeno (< 8 bytes)", async () => {
      await expect(
        uploadsService.uploadFile({
          buffer: Buffer.from([0xFF, 0xD8]),
          fileName: "tiny.jpg",
          contentType: "image/jpeg",
          context: "diagnosis",
        }),
      ).rejects.toThrow("não corresponde");
    });
  });

  describe("uploadFile — extensão derivada do content-type", () => {
    beforeEach(() => {
      Object.assign(env, {
        R2_ENDPOINT: undefined,
        R2_ACCESS_KEY_ID: undefined,
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET: undefined,
        R2_PUBLIC_URL: undefined,
      });
    });

    it("deve usar .jpg para image/jpeg independente do nome original", async () => {
      const result = await uploadsService.uploadFile({
        buffer: VALID_JPEG,
        fileName: "IMG_20260330_photo.jpeg",
        contentType: "image/jpeg",
        context: "completion",
      });

      expect(result.fileKey).toMatch(/\.jpg$/);
    });

    it("deve usar .png para image/png independente do nome original", async () => {
      const result = await uploadsService.uploadFile({
        buffer: VALID_PNG,
        fileName: "screenshot.PNG",
        contentType: "image/png",
        context: "avatar",
      });

      expect(result.fileKey).toMatch(/\.png$/);
    });
  });
});
