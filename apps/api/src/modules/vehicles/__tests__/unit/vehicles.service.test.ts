import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do repository antes de importar o service
vi.mock("../../vehicles.repository", () => ({
  VehiclesRepository: {
    findById: vi.fn(),
    findByPlate: vi.fn(),
    findByUserId: vi.fn(),
    countByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hasBlockingServiceRequests: vi.fn(),
    cancelPreMatchServiceRequests: vi.fn(),
    getDeletionImpactCounts: vi.fn(),
  },
}));

import { VehiclesService } from "../../vehicles.service";
import { VehiclesRepository } from "../../vehicles.repository";

const USER_ID = "user-uuid-123";

const mockVehicle = {
  id: "vehicle-uuid-1",
  userId: USER_ID,
  type: "car" as const,
  plate: "ABC-1234",
  brand: "Honda",
  model: "Civic",
  year: 2019,
  color: "Preto",
  createdAt: new Date("2026-01-15"),
  deletedAt: null,
};

describe("VehiclesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: sem solicitações ativas (cenário mais comum)
    vi.mocked(VehiclesRepository.hasBlockingServiceRequests).mockResolvedValue(
      false,
    );
    vi.mocked(VehiclesRepository.getDeletionImpactCounts).mockResolvedValue({
      pendingRequestCount: 0,
      blockingRequestCount: 0,
    });
  });

  describe("create", () => {
    it("deve cadastrar veículo com sucesso", async () => {
      vi.mocked(VehiclesRepository.countByUserId).mockResolvedValue(0);
      vi.mocked(VehiclesRepository.findByPlate).mockResolvedValue(undefined);
      vi.mocked(VehiclesRepository.create).mockResolvedValue(mockVehicle);

      const vehicle = await VehiclesService.create(USER_ID, {
        type: "car",
        plate: "ABC-1234",
        brand: "Honda",
        model: "Civic",
        year: 2019,
        color: "Preto",
      });

      expect(vehicle.id).toBe("vehicle-uuid-1");
      expect(vehicle.plate).toBe("ABC-1234");
      expect(VehiclesRepository.create).toHaveBeenCalledOnce();
    });

    it("deve rejeitar quando usuário atinge limite de 5 veículos", async () => {
      vi.mocked(VehiclesRepository.countByUserId).mockResolvedValue(5);

      await expect(
        VehiclesService.create(USER_ID, {
          type: "car",
          plate: "XYZ-9999",
          brand: "Toyota",
          model: "Corolla",
          year: 2022,
        }),
      ).rejects.toThrow("Limite de 5 veículos atingido");

      // Não deve nem verificar placa se já atingiu o limite
      expect(VehiclesRepository.findByPlate).not.toHaveBeenCalled();
    });

    it("deve rejeitar placa duplicada no sistema", async () => {
      vi.mocked(VehiclesRepository.countByUserId).mockResolvedValue(1);
      vi.mocked(VehiclesRepository.findByPlate).mockResolvedValue(mockVehicle);

      await expect(
        VehiclesService.create(USER_ID, {
          type: "moto",
          plate: "ABC-1234",
          brand: "Honda",
          model: "CB 300",
          year: 2023,
        }),
      ).rejects.toThrow("Esta placa já está cadastrada no sistema");
    });

    it("deve aceitar cadastro com 4 veículos existentes (abaixo do limite)", async () => {
      vi.mocked(VehiclesRepository.countByUserId).mockResolvedValue(4);
      vi.mocked(VehiclesRepository.findByPlate).mockResolvedValue(undefined);
      vi.mocked(VehiclesRepository.create).mockResolvedValue({
        ...mockVehicle,
        id: "vehicle-uuid-5",
        plate: "NEW-1234",
      });

      const vehicle = await VehiclesService.create(USER_ID, {
        type: "suv",
        plate: "NEW-1234",
        brand: "Jeep",
        model: "Renegade",
        year: 2024,
      });

      expect(vehicle.id).toBe("vehicle-uuid-5");
    });

    it("deve permitir cadastro com placa de veículo soft-deleted", async () => {
      // findByPlate filtra por isNull(deletedAt), então retorna undefined
      // para placas de veículos excluídos — re-cadastro é legítimo
      vi.mocked(VehiclesRepository.countByUserId).mockResolvedValue(0);
      vi.mocked(VehiclesRepository.findByPlate).mockResolvedValue(undefined);
      vi.mocked(VehiclesRepository.create).mockResolvedValue({
        ...mockVehicle,
        id: "vehicle-uuid-reused",
        plate: "OLD-1111",
      });

      const vehicle = await VehiclesService.create(USER_ID, {
        type: "car",
        plate: "OLD-1111",
        brand: "Fiat",
        model: "Uno",
        year: 2015,
      });

      expect(vehicle.id).toBe("vehicle-uuid-reused");
      expect(vehicle.plate).toBe("OLD-1111");
      expect(VehiclesRepository.create).toHaveBeenCalledOnce();
    });
  });

  describe("listByUser", () => {
    it("deve retornar lista de veículos do usuário", async () => {
      vi.mocked(VehiclesRepository.findByUserId).mockResolvedValue([
        mockVehicle,
        { ...mockVehicle, id: "vehicle-uuid-2", plate: "DEF-5678" },
      ]);

      const vehicles = await VehiclesService.listByUser(USER_ID);

      expect(vehicles).toHaveLength(2);
      expect(vehicles[0].plate).toBe("ABC-1234");
      expect(vehicles[1].plate).toBe("DEF-5678");
    });

    it("deve retornar lista vazia se usuário não tem veículos", async () => {
      vi.mocked(VehiclesRepository.findByUserId).mockResolvedValue([]);

      const vehicles = await VehiclesService.listByUser(USER_ID);

      expect(vehicles).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("deve atualizar veículo do usuário", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(VehiclesRepository.update).mockResolvedValue({
        ...mockVehicle,
        color: "Branco",
      });

      const vehicle = await VehiclesService.update(USER_ID, "vehicle-uuid-1", {
        color: "Branco",
      });

      expect(vehicle.color).toBe("Branco");
    });

    it("deve retornar veículo inalterado quando nenhum campo é enviado", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue(mockVehicle);

      const vehicle = await VehiclesService.update(
        USER_ID,
        "vehicle-uuid-1",
        {},
      );

      // Quando nenhum campo é alterado, retorna os dados atuais sem chamar update
      expect(vehicle.id).toBe("vehicle-uuid-1");
      expect(vehicle.color).toBe("Preto");
      expect(VehiclesRepository.update).not.toHaveBeenCalled();
    });

    it("deve rejeitar update de veículo inexistente", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue(undefined);

      await expect(
        VehiclesService.update(USER_ID, "nonexistent", { color: "Azul" }),
      ).rejects.toThrow("Veículo não encontrado");
    });

    it("deve rejeitar update de veículo de outro usuário (autorização)", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue({
        ...mockVehicle,
        userId: "another-user-uuid",
      });

      await expect(
        VehiclesService.update(USER_ID, "vehicle-uuid-1", { color: "Azul" }),
      ).rejects.toThrow("Acesso negado");
    });
  });

  describe("delete", () => {
    it("deve deletar veículo do usuário sem solicitações ativas", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(VehiclesRepository.hasBlockingServiceRequests).mockResolvedValue(
        false,
      );

      await VehiclesService.delete(USER_ID, "vehicle-uuid-1");

      expect(
        VehiclesRepository.hasBlockingServiceRequests,
      ).toHaveBeenCalledWith(
        "vehicle-uuid-1",
      );
      expect(
        VehiclesRepository.cancelPreMatchServiceRequests,
      ).toHaveBeenCalledWith("vehicle-uuid-1");
      expect(VehiclesRepository.delete).toHaveBeenCalledWith("vehicle-uuid-1");
    });

    it("deve rejeitar delete de veículo com solicitação ativa", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(VehiclesRepository.hasBlockingServiceRequests).mockResolvedValue(
        true,
      );

      await expect(
        VehiclesService.delete(USER_ID, "vehicle-uuid-1"),
      ).rejects.toThrow(
        "Não é possível remover veículo com solicitação ativa",
      );

      // Não deve chamar delete se existe solicitação ativa
      expect(
        VehiclesRepository.cancelPreMatchServiceRequests,
      ).not.toHaveBeenCalled();
      expect(VehiclesRepository.delete).not.toHaveBeenCalled();
    });

    it("deve rejeitar delete de veículo inexistente", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue(undefined);

      await expect(
        VehiclesService.delete(USER_ID, "nonexistent"),
      ).rejects.toThrow("Veículo não encontrado");
    });

    it("deve rejeitar delete de veículo de outro usuário (autorização)", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue({
        ...mockVehicle,
        userId: "another-user-uuid",
      });

      await expect(
        VehiclesService.delete(USER_ID, "vehicle-uuid-1"),
      ).rejects.toThrow("Acesso negado");
    });
  });

  describe("getDeletionImpact", () => {
    it("deve permitir exclusao simples quando nao ha solicitacoes relacionadas", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(VehiclesRepository.getDeletionImpactCounts).mockResolvedValue({
        pendingRequestCount: 0,
        blockingRequestCount: 0,
      });

      const impact = await VehiclesService.getDeletionImpact(
        USER_ID,
        "vehicle-uuid-1",
      );

      expect(impact.canDelete).toBe(true);
      expect(impact.willCancelPendingRequests).toBe(false);
      expect(impact.message).toContain("pode ser removido");
    });

    it("deve avisar que solicitacoes pendentes serao canceladas automaticamente", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(VehiclesRepository.getDeletionImpactCounts).mockResolvedValue({
        pendingRequestCount: 1,
        blockingRequestCount: 0,
      });

      const impact = await VehiclesService.getDeletionImpact(
        USER_ID,
        "vehicle-uuid-1",
      );

      expect(impact.canDelete).toBe(true);
      expect(impact.willCancelPendingRequests).toBe(true);
      expect(impact.pendingRequestCount).toBe(1);
    });

    it("deve bloquear exclusao quando existe atendimento em andamento", async () => {
      vi.mocked(VehiclesRepository.findById).mockResolvedValue(mockVehicle);
      vi.mocked(VehiclesRepository.getDeletionImpactCounts).mockResolvedValue({
        pendingRequestCount: 0,
        blockingRequestCount: 1,
      });

      const impact = await VehiclesService.getDeletionImpact(
        USER_ID,
        "vehicle-uuid-1",
      );

      expect(impact.canDelete).toBe(false);
      expect(impact.blockingRequestCount).toBe(1);
      expect(impact.message).toContain("atendimento em andamento");
    });
  });
});

