import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSignedUrlMock, mkdirMock, writeFileMock } = vi.hoisted(() => ({
  getSignedUrlMock: vi.fn(),
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
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
    getSignedUrlMock.mockResolvedValue("https://uploads.example.com/signed-put-url");
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  describe("getPresignedUrl", () => {
    it("deve gerar upload local com contexto e expiração", async () => {
      const result = await uploadsService.getPresignedUrl({
        fileName: "diagnostico.jpg",
        contentType: "image/jpeg",
        context: "diagnosis",
      });

      expect(result.uploadUrl).toContain("/api/v1/uploads/local/");
      expect(result.publicUrl).toContain("/uploads/");
      expect(result.fileKey).toMatch(/^diagnosis_\d+_[a-f0-9-]+\.jpg$/);
      expect(result.expiresIn).toBe(900);
    });

    it("deve usar R2 quando a configuração estiver completa", async () => {
      Object.assign(env, {
        R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
        R2_ACCESS_KEY_ID: "key-id",
        R2_SECRET_ACCESS_KEY: "secret-key",
        R2_BUCKET: "mechago-uploads",
        R2_PUBLIC_URL: "https://uploads.mechago.com.br",
      });

      const result = await uploadsService.getPresignedUrl({
        fileName: "avatar.png",
        contentType: "image/png",
        context: "avatar",
      });

      expect(getSignedUrlMock).toHaveBeenCalledOnce();
      expect(result.uploadUrl).toBe("https://uploads.example.com/signed-put-url");
      expect(result.publicUrl).toMatch(
        /^https:\/\/uploads\.mechago\.com\.br\/avatar_\d+_[a-f0-9-]+\.png$/,
      );
    });

    it("deve cair para upload local quando faltar R2_PUBLIC_URL", async () => {
      Object.assign(env, {
        R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
        R2_ACCESS_KEY_ID: "key-id",
        R2_SECRET_ACCESS_KEY: "secret-key",
        R2_BUCKET: "mechago-uploads",
        R2_PUBLIC_URL: undefined,
      });

      const result = await uploadsService.getPresignedUrl({
        fileName: "diagnostico.jpg",
        contentType: "image/jpeg",
        context: "diagnosis",
      });

      expect(getSignedUrlMock).not.toHaveBeenCalled();
      expect(result.uploadUrl).toContain("/api/v1/uploads/local/");
      expect(result.publicUrl).toContain("/uploads/");
    });

    it("deve rejeitar content type inválido", async () => {
      await expect(
        uploadsService.getPresignedUrl({
          fileName: "malicioso.exe",
          contentType: "application/octet-stream",
          context: "diagnosis",
        }),
      ).rejects.toThrow("Content type 'application/octet-stream' not allowed");
    });
  });

  describe("saveLocalFile", () => {
    it("deve persistir arquivo e retornar URL pública", async () => {
      const publicUrl = await uploadsService.saveLocalFileWithBaseUrl(
        "completion_123_photo.jpg",
        Buffer.from("image-binary"),
        "https://api.mechago.com.br",
      );

      expect(mkdirMock).toHaveBeenCalled();
      expect(writeFileMock).toHaveBeenCalled();
      expect(publicUrl).toBe(
        "https://api.mechago.com.br/uploads/completion_123_photo.jpg",
      );
    });
  });
});
