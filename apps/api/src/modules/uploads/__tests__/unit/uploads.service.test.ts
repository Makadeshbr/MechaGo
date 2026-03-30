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
    it("deve salvar localmente e retornar URL pública quando R2 não configurado", async () => {
      Object.assign(env, {
        R2_ENDPOINT: undefined,
        R2_ACCESS_KEY_ID: undefined,
        R2_SECRET_ACCESS_KEY: undefined,
        R2_BUCKET: undefined,
        R2_PUBLIC_URL: undefined,
      });

      const result = await uploadsService.uploadFile({
        buffer: Buffer.from("image-binary"),
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
        buffer: Buffer.from("image-binary"),
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
          buffer: Buffer.from("img"),
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
          buffer: Buffer.from("exe-binary"),
          fileName: "malicioso.exe",
          contentType: "application/octet-stream",
          context: "diagnosis",
        }),
      ).rejects.toThrow("não permitido");
    });
  });
});
