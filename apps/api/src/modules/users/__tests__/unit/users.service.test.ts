import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do repository antes de importar o service
vi.mock("../../users.repository", () => ({
  UsersRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

import { UsersService } from "../../users.service";
import { UsersRepository } from "../../users.repository";

const mockUser = {
  id: "user-uuid-123",
  name: "João Silva",
  email: "joao@email.com",
  phone: "(11) 99999-9999",
  type: "client" as const,
  passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$secret-hash-that-must-never-leak",
  avatarUrl: null,
  cpfCnpj: "123.456.789-00",
  rating: "4.50",
  totalReviews: 10,
  isActive: true,
  isVerified: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("UsersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("deve retornar perfil do usuário sem passwordHash", async () => {
      vi.mocked(UsersRepository.findById).mockResolvedValue(mockUser);

      const profile = await UsersService.getProfile("user-uuid-123");

      expect(profile.id).toBe("user-uuid-123");
      expect(profile.name).toBe("João Silva");
      expect(profile.email).toBe("joao@email.com");
      // passwordHash NUNCA deve aparecer na resposta
      expect(profile).not.toHaveProperty("passwordHash");
      expect(JSON.stringify(profile)).not.toContain("argon2");
    });

    it("deve lançar erro para usuário inexistente (token órfão)", async () => {
      vi.mocked(UsersRepository.findById).mockResolvedValue(undefined);

      await expect(
        UsersService.getProfile("nonexistent-uuid"),
      ).rejects.toThrow("Usuário não encontrado");
    });

    it("deve retornar createdAt como ISO string", async () => {
      vi.mocked(UsersRepository.findById).mockResolvedValue(mockUser);

      const profile = await UsersService.getProfile("user-uuid-123");

      expect(profile.createdAt).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  describe("updateProfile", () => {
    it("deve atualizar nome do usuário", async () => {
      vi.mocked(UsersRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(UsersRepository.update).mockResolvedValue({
        ...mockUser,
        name: "João Santos",
      });

      const profile = await UsersService.updateProfile("user-uuid-123", {
        name: "João Santos",
      });

      expect(profile.name).toBe("João Santos");
      expect(UsersRepository.update).toHaveBeenCalledWith("user-uuid-123", {
        name: "João Santos",
      });
    });

    it("deve retornar perfil sem passwordHash após update", async () => {
      vi.mocked(UsersRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(UsersRepository.update).mockResolvedValue({
        ...mockUser,
        name: "Novo Nome",
      });

      const profile = await UsersService.updateProfile("user-uuid-123", {
        name: "Novo Nome",
      });

      expect(profile).not.toHaveProperty("passwordHash");
    });

    it("deve lançar erro para usuário inexistente no update", async () => {
      vi.mocked(UsersRepository.findById).mockResolvedValue(undefined);

      await expect(
        UsersService.updateProfile("nonexistent-uuid", { name: "Teste" }),
      ).rejects.toThrow("Usuário não encontrado");
    });

    it("deve retornar perfil atual se nenhum campo foi enviado", async () => {
      vi.mocked(UsersRepository.findById).mockResolvedValue(mockUser);

      const profile = await UsersService.updateProfile("user-uuid-123", {});

      expect(profile.name).toBe("João Silva");
      expect(UsersRepository.update).not.toHaveBeenCalled();
    });
  });
});
