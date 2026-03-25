import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../../auth.service";
import { AuthRepository } from "../../auth.repository";
import { AppError } from "@/utils/errors";
import * as crypto from "@/utils/crypto";

type AuthUserRecord = NonNullable<
  Awaited<ReturnType<typeof AuthRepository.findByEmail>>
>;

// Mock do repository e redis
vi.mock("../../auth.repository");
vi.mock("@/lib/redis", () => ({
  redis: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

describe("AuthService", () => {
  const mockUser: AuthUserRecord = {
    id: "user-123",
    email: "test@example.com",
    passwordHash: "hashed-pw",
    type: "client",
    isActive: true,
    isVerified: false,
    name: "Test User",
    phone: "11999999999",
    cpfCnpj: "12345678900",
    avatarUrl: null,
    rating: "0.00",
    totalReviews: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("deve permitir login de cliente no contexto de cliente", async () => {
      vi.mocked(AuthRepository.findByEmail).mockResolvedValue(mockUser);
      vi.spyOn(crypto, "verifyPassword").mockResolvedValue(true);
      vi.spyOn(crypto, "generateAccessToken").mockResolvedValue("access-token");
      vi.spyOn(crypto, "generateRefreshToken").mockResolvedValue("refresh-token");

      const result = await AuthService.login({
        email: "test@example.com",
        password: "password123",
        appContext: "client",
      });

      expect(result.user.type).toBe("client");
      expect(result.tokens.accessToken).toBe("access-token");
    });

    it("deve BLOQUEAR login de cliente tentando acessar o App Pro", async () => {
      vi.mocked(AuthRepository.findByEmail).mockResolvedValue(mockUser);
      vi.spyOn(crypto, "verifyPassword").mockResolvedValue(true);

      const promise = AuthService.login({
        email: "test@example.com",
        password: "password123",
        appContext: "pro",
      });

      await expect(promise).rejects.toThrow(
        new AppError(
          "UNAUTHORIZED_APP_ACCESS",
          "Esta conta não possui perfil profissional. Use o aplicativo MechaGo para clientes.",
          403
        )
      );
    });

    it("deve BLOQUEAR login de profissional tentando acessar o App Cliente", async () => {
      const proUser: AuthUserRecord = { ...mockUser, type: "professional" };
      vi.mocked(AuthRepository.findByEmail).mockResolvedValue(proUser);
      vi.spyOn(crypto, "verifyPassword").mockResolvedValue(true);

      const promise = AuthService.login({
        email: "pro@example.com",
        password: "password123",
        appContext: "client",
      });

      await expect(promise).rejects.toThrow(
        new AppError(
          "UNAUTHORIZED_APP_ACCESS",
          "Esta conta é de profissional. Use o aplicativo MechaGo Pro.",
          403
        )
      );
    });
  });
});
