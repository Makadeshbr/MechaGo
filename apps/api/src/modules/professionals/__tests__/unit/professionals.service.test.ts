import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { registerProfessionalSchema } from "../../professionals.schemas";

// Mock do repository antes de importar o service
vi.mock("../../professionals.repository", () => ({
  ProfessionalsRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import { ProfessionalsService } from "../../professionals.service";
import { ProfessionalsRepository } from "../../professionals.repository";

const USER_ID = "user-uuid-pro-123";

const mockProfessional = {
  id: "professional-uuid-1",
  userId: USER_ID,
  type: "mechanic_mobile" as const,
  specialties: ["car_general"] as ("car_general" | "moto" | "diesel_truck" | "electronic_injection" | "suspension" | "brakes" | "air_conditioning" | "transmission")[],
  vehicleTypesServed: ["car"] as ("car" | "moto" | "suv" | "truck")[],
  hasWorkshop: false,
  scheduleType: "24h" as const,
  radiusKm: 10,
  latitude: null,
  longitude: null,
  isOnline: false,
  isFounder: false,
  commissionRate: "0.15",
  totalEarnings: "0",
  acceptanceRate: "0",
  cancellationsThisMonth: 0,
  customSchedule: null,
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date("2026-01-15"),
};

describe("ProfessionalsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== register ====================
  describe("register", () => {
    it("deve criar profissional com dados válidos", async () => {
      vi.mocked(ProfessionalsRepository.findByUserId).mockResolvedValue(undefined);
      vi.mocked(ProfessionalsRepository.create).mockResolvedValue(mockProfessional);

      const result = await ProfessionalsService.register(USER_ID, {
        type: "mechanic_mobile",
        specialties: ["car_general"],
        vehicleTypesServed: ["car"],
        radiusKm: 10,
        scheduleType: "24h",
      });

      expect(result.id).toBe("professional-uuid-1");
      expect(result.userId).toBe(USER_ID);
      expect(ProfessionalsRepository.create).toHaveBeenCalledOnce();
    });

    it("deve rejeitar cadastro duplicado para o mesmo usuário", async () => {
      vi.mocked(ProfessionalsRepository.findByUserId).mockResolvedValue(
        mockProfessional,
      );

      await expect(
        ProfessionalsService.register(USER_ID, {
          type: "mechanic_mobile",
          specialties: ["car_general"],
          vehicleTypesServed: ["car"],
          radiusKm: 10,
          scheduleType: "24h",
        }),
      ).rejects.toThrow("Este usuário já possui um perfil profissional");

      // Não deve inserir se perfil já existe
      expect(ProfessionalsRepository.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar raio menor que 3 km (validado pelo schema Zod)", () => {
      // Regra de negócio — raio mínimo é 3 km (schema.min(3))
      // O service não precisa checar manualmente — o Zod garante na rota
      const result = registerProfessionalSchema.safeParse({
        type: "mechanic_mobile",
        specialties: ["car_general"],
        vehicleTypesServed: ["car"],
        radiusKm: 2, // menor que o mínimo de 3
        scheduleType: "24h",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const radiusError = result.error.issues.find((i: z.ZodIssue) =>
          i.path.includes("radiusKm"),
        );
        expect(radiusError).toBeDefined();
        expect(radiusError?.message).toContain("mínimo é 3");
      }
    });

    it("deve rejeitar raio maior que 100 km (validado pelo schema Zod)", () => {
      const result = registerProfessionalSchema.safeParse({
        type: "mechanic_mobile",
        specialties: ["car_general"],
        vehicleTypesServed: ["car"],
        radiusKm: 101,
        scheduleType: "24h",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const radiusError = result.error.issues.find((i: z.ZodIssue) =>
          i.path.includes("radiusKm"),
        );
        expect(radiusError).toBeDefined();
      }
    });
  });

  // ==================== goOnline ====================
  describe("goOnline", () => {
    it("deve atualizar isOnline e location com sucesso", async () => {
      vi.mocked(ProfessionalsRepository.findByUserId).mockResolvedValue(
        mockProfessional,
      );
      vi.mocked(ProfessionalsRepository.update).mockResolvedValue({
        ...mockProfessional,
        isOnline: true,
        latitude: "-23.5489",
        longitude: "-46.6388",
      });

      const result = await ProfessionalsService.goOnline(USER_ID, {
        latitude: -23.5489,
        longitude: -46.6388,
      });

      expect(result.isOnline).toBe(true);
      expect(result.latitude).toBe("-23.5489");
      expect(ProfessionalsRepository.update).toHaveBeenCalledWith(
        "professional-uuid-1",
        expect.objectContaining({
          isOnline: true,
          latitude: "-23.5489",
          longitude: "-46.6388",
        }),
      );
    });

    it("deve rejeitar goOnline se perfil profissional não existe", async () => {
      vi.mocked(ProfessionalsRepository.findByUserId).mockResolvedValue(undefined);

      await expect(
        ProfessionalsService.goOnline(USER_ID, {
          latitude: -23.5489,
          longitude: -46.6388,
        }),
      ).rejects.toThrow("Perfil profissional não encontrado");
    });
  });

  // ==================== goOffline ====================
  describe("goOffline", () => {
    it("deve setar isOnline = false", async () => {
      vi.mocked(ProfessionalsRepository.findByUserId).mockResolvedValue({
        ...mockProfessional,
        isOnline: true,
      });
      vi.mocked(ProfessionalsRepository.update).mockResolvedValue({
        ...mockProfessional,
        isOnline: false,
      });

      const result = await ProfessionalsService.goOffline(USER_ID);

      expect(result.isOnline).toBe(false);
      expect(ProfessionalsRepository.update).toHaveBeenCalledWith(
        "professional-uuid-1",
        { isOnline: false },
      );
    });

    it("deve rejeitar goOffline se perfil não existe", async () => {
      vi.mocked(ProfessionalsRepository.findByUserId).mockResolvedValue(undefined);

      await expect(ProfessionalsService.goOffline(USER_ID)).rejects.toThrow(
        "Perfil profissional não encontrado",
      );
    });
  });

  // ==================== getStats ====================
  describe("getStats", () => {
    it("deve retornar estatísticas zeradas para profissional novo", async () => {
      vi.mocked(ProfessionalsRepository.findByUserId).mockResolvedValue(
        mockProfessional,
      );

      const stats = await ProfessionalsService.getStats(USER_ID);

      expect(stats.totalEarnings).toBe("0");
      expect(stats.acceptanceRate).toBe("0");
      expect(stats.cancellationsThisMonth).toBe(0);
      expect(stats.isOnline).toBe(false);
    });

    it("deve rejeitar getStats se perfil não existe", async () => {
      vi.mocked(ProfessionalsRepository.findByUserId).mockResolvedValue(undefined);

      await expect(ProfessionalsService.getStats(USER_ID)).rejects.toThrow(
        "Perfil profissional não encontrado",
      );
    });
  });
});
