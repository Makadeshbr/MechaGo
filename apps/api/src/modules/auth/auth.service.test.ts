import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
} from "@/utils/crypto";

describe("Crypto Utils", () => {
  describe("Password hashing", () => {
    it("deve gerar hash diferente da senha original", async () => {
      const hash = await hashPassword("MinhaSenha123");
      expect(hash).not.toBe("MinhaSenha123");
      expect(hash.startsWith("$argon2")).toBe(true);
    });

    it("deve verificar senha correta", async () => {
      const hash = await hashPassword("MinhaSenha123");
      const valid = await verifyPassword(hash, "MinhaSenha123");
      expect(valid).toBe(true);
    });

    it("deve rejeitar senha incorreta", async () => {
      const hash = await hashPassword("MinhaSenha123");
      const valid = await verifyPassword(hash, "SenhaErrada");
      expect(valid).toBe(false);
    });
  });

  describe("JWT", () => {
    it("deve gerar e verificar access token", async () => {
      const payload = { userId: "test-uuid", type: "client" as const };
      const token = await generateAccessToken(payload);

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const verified = await verifyAccessToken(token);
      expect(verified.userId).toBe("test-uuid");
      expect(verified.type).toBe("client");
    });

    it("deve rejeitar token inválido", async () => {
      await expect(verifyAccessToken("invalid-token")).rejects.toThrow();
    });
  });
});
