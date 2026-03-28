import { describe, it, expect, vi, beforeEach } from "vitest";
import { MatchingService } from "./matching.service";
import { db } from "@/db";
import { AppError } from "@/utils/errors";

const notifyClientStatusUpdateMock = vi.fn();
const notifyProfessionalsMock = vi.fn();
const notifyRequestClaimedMock = vi.fn();

vi.mock("../notifications/notifications.service", () => ({
  NotificationsService: {
    notifyClientStatusUpdate: notifyClientStatusUpdateMock,
    notifyProfessionals: notifyProfessionalsMock,
    notifyRequestClaimed: notifyRequestClaimedMock,
  },
}));

vi.mock("@/db", () => ({
  db: {
    execute: vi.fn(),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => [{ id: "request-123", status: "waiting_queue" }]),
        })),
      })),
    })),
  },
}));

// Mock dos repositories
vi.mock("../service-requests/service-requests.repository", () => ({
  ServiceRequestsRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../professionals/professionals.repository", () => ({
  ProfessionalsRepository: {
    findByUserId: vi.fn(),
  },
}));

vi.mock("../vehicles/vehicles.repository", () => ({
  VehiclesRepository: {
    findById: vi.fn(),
  },
}));

import { ServiceRequestsRepository } from "../service-requests/service-requests.repository";
import { ProfessionalsRepository } from "../professionals/professionals.repository";
import { VehiclesRepository } from "../vehicles/vehicles.repository";

describe("MatchingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyClientStatusUpdateMock.mockResolvedValue(undefined);
    notifyProfessionalsMock.mockResolvedValue(undefined);
    notifyRequestClaimedMock.mockResolvedValue(undefined);
  });

  describe("findNearbyProfessionals", () => {
    it("deve encontrar profissionais dentro do raio", async () => {
      const mockResult = [{
        id: "prof-1",
        user_id: "user-1",
        name: "Carlos",
        rating: "4.8",
        distance_meters: 2500,
      }];
      (db.execute as any).mockResolvedValue(mockResult);

      const result = await MatchingService.findNearbyProfessionals({
        lat: -23.5505,
        lng: -46.6333,
        radiusMeters: 5000,
        vehicleType: "car",
      });

      expect(db.execute).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].distance_meters).toBe(2500);
      
      const sqlObj = (db.execute as any).mock.calls[0][0];
      const sqlStr = JSON.stringify(sqlObj.queryChunks).toLowerCase();
      expect(sqlStr).toContain("st_distance");
      expect(sqlStr).toContain("st_dwithin");
    });

    it("deve filtrar por vehicleType", async () => {
      (db.execute as any).mockResolvedValue([]);
      await MatchingService.findNearbyProfessionals({
        lat: 0, lng: 0, radiusMeters: 5000, vehicleType: "moto",
      });
      const sqlObj = (db.execute as any).mock.calls[0][0];
      const sqlStr = JSON.stringify(sqlObj.queryChunks).toLowerCase();
      expect(sqlStr).toContain("= any(p.vehicle_types_served)");
    });

    it("deve excluir profissionais offline", async () => {
      (db.execute as any).mockResolvedValue([]);
      await MatchingService.findNearbyProfessionals({
        lat: 0, lng: 0, radiusMeters: 5000, vehicleType: "car",
      });
      const sqlObj = (db.execute as any).mock.calls[0][0];
      const sqlStr = JSON.stringify(sqlObj.queryChunks).toLowerCase();
      expect(sqlStr).toContain("p.is_online = true");
    });

    it("deve ordenar por rating DESC e distancia ASC", async () => {
      (db.execute as any).mockResolvedValue([]);
      await MatchingService.findNearbyProfessionals({
        lat: 0, lng: 0, radiusMeters: 5000, vehicleType: "car",
      });
      const sqlObj = (db.execute as any).mock.calls[0][0];
      const sqlStr = JSON.stringify(sqlObj.queryChunks).toLowerCase();
      expect(sqlStr).toContain("order by u.rating desc, distance_meters asc");
    });

    it("deve limitar a 10 resultados", async () => {
      (db.execute as any).mockResolvedValue([]);
      await MatchingService.findNearbyProfessionals({
        lat: 0, lng: 0, radiusMeters: 5000, vehicleType: "car",
      });
      const sqlObj = (db.execute as any).mock.calls[0][0];
      const sqlStr = JSON.stringify(sqlObj.queryChunks).toLowerCase();
      expect(sqlStr).toContain("limit 10");
    });

    it("deve retornar array vazio se nenhum profissional no raio", async () => {
      (db.execute as any).mockResolvedValue([]);
      const result = await MatchingService.findNearbyProfessionals({
        lat: 0, lng: 0, radiusMeters: 5000, vehicleType: "car",
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("processMatchingJob", () => {
    const mockMatchingRequest = {
      id: "req-1",
      status: "matching",
      vehicleId: "veh-1",
      clientLatitude: "-23.5505",
      clientLongitude: "-46.6333",
      context: "urban",
      problemType: "battery",
      estimatedPrice: "115.00",
      createdAt: new Date("2026-03-01T10:00:00Z"),
    };
    const mockVehicle = {
      id: "veh-1",
      type: "car",
      brand: "Honda",
      model: "Civic",
      year: 2019,
      plate: "ABC-1234",
    };

    it("deve retornar 'waiting' e mudar status para waiting_queue quando nenhum profissional encontrado", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue(mockMatchingRequest);
      (VehiclesRepository.findById as any).mockResolvedValue(mockVehicle);
      (db.execute as any).mockResolvedValue([]); // Sem profissionais
      (ServiceRequestsRepository.update as any).mockResolvedValue({
        id: "req-1",
        status: "waiting_queue",
      });

      const result = await MatchingService.processMatchingJob("req-1");

      expect(result).toBe("waiting");
      expect(ServiceRequestsRepository.update).toHaveBeenCalledWith("req-1", {
        status: "waiting_queue",
      });
    });

    it("deve retornar 'notified' quando profissionais encontrados", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue(mockMatchingRequest);
      (VehiclesRepository.findById as any).mockResolvedValue(mockVehicle);
      (db.execute as any).mockResolvedValue([
        { id: "prof-1", user_id: "user-1", name: "Carlos", rating: "4.8", distance_meters: 2000 },
      ]);

      const result = await MatchingService.processMatchingJob("req-1");

      expect(result).toBe("notified");
      expect(notifyProfessionalsMock).toHaveBeenCalledTimes(1);
      // Verifica que o payload contém os dados do veículo
      expect(notifyProfessionalsMock).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "prof-1" })]),
        expect.objectContaining({
          id: "req-1",
          problemType: "battery",
          vehicle: expect.objectContaining({ brand: "Honda", model: "Civic" }),
        }),
      );
      // Nao deve atualizar status quando profissionais foram notificados
      expect(ServiceRequestsRepository.update).not.toHaveBeenCalled();
    });

    it("deve retornar 'skipped' quando request nao existe", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue(null);

      const result = await MatchingService.processMatchingJob("nonexistent");

      expect(result).toBe("skipped");
      expect(VehiclesRepository.findById).not.toHaveBeenCalled();
    });

    it("deve retornar 'skipped' quando status nao e matching", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        ...mockMatchingRequest,
        status: "accepted",
      });

      const result = await MatchingService.processMatchingJob("req-1");

      expect(result).toBe("skipped");
      expect(VehiclesRepository.findById).not.toHaveBeenCalled();
    });

    it("deve retornar 'skipped' quando vehicleId e null", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        ...mockMatchingRequest,
        vehicleId: null,
      });

      const result = await MatchingService.processMatchingJob("req-1");

      expect(result).toBe("skipped");
    });

    it("deve retornar 'skipped' quando veiculo nao existe", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue(mockMatchingRequest);
      (VehiclesRepository.findById as any).mockResolvedValue(null);

      const result = await MatchingService.processMatchingJob("req-1");

      expect(result).toBe("skipped");
    });
  });

  describe("markAsWaiting", () => {
    it("deve atualizar status para waiting_queue quando request esta em matching", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1",
        status: "matching",
      });
      (ServiceRequestsRepository.update as any).mockResolvedValue({
        id: "req-1",
        status: "waiting_queue",
      });

      await MatchingService.markAsWaiting("req-1");

      expect(ServiceRequestsRepository.update).toHaveBeenCalledWith("req-1", {
        status: "waiting_queue",
      });
    });

    it("nao deve atualizar se request nao existe", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue(null);

      await MatchingService.markAsWaiting("nonexistent");

      expect(ServiceRequestsRepository.update).not.toHaveBeenCalled();
    });

    it("nao deve atualizar se status nao e matching", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1",
        status: "accepted",
      });

      await MatchingService.markAsWaiting("req-1");

      expect(ServiceRequestsRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("acceptRequest", () => {
    it("deve mudar status para accepted", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1", status: "matching", vehicleId: "veh-1",
      });
      (ProfessionalsRepository.findByUserId as any).mockResolvedValue({
        id: "prof-1", userId: "user-prof", isOnline: true, vehicleTypesServed: ["car"],
      });
      (VehiclesRepository.findById as any).mockResolvedValue({
        id: "veh-1", type: "car",
      });
      (ServiceRequestsRepository.update as any).mockResolvedValue({
        id: "req-1", status: "accepted",
      });
      (ServiceRequestsRepository.findById as any)
        .mockResolvedValueOnce({
          id: "req-1", status: "matching", vehicleId: "veh-1",
        })
        .mockResolvedValueOnce({
          id: "req-1",
          status: "accepted",
          professional: {
            id: "prof-1",
            userId: "user-prof",
            name: "Carlos",
            avatarUrl: null,
            rating: "4.8",
            specialties: ["car_general"],
          },
        });

      const res = await MatchingService.acceptRequest("user-prof", "req-1");
      expect(res.status).toBe("accepted");
      expect(ServiceRequestsRepository.update).toHaveBeenCalledWith("req-1", expect.objectContaining({
        status: "accepted",
        professionalId: "prof-1",
      }), "matching");
      expect(notifyClientStatusUpdateMock).toHaveBeenCalledWith(
        "req-1",
        "accepted",
        expect.objectContaining({
          professionalId: "prof-1",
        }),
      );
    });

    it("deve notificar que o chamado foi reivindicado (limpeza de tela)", async () => {
      (ServiceRequestsRepository.findById as any)
        .mockResolvedValueOnce({ id: "req-1", status: "matching", vehicleId: "veh-1" })
        .mockResolvedValueOnce({ id: "req-1", status: "accepted", professional: null });
      (ProfessionalsRepository.findByUserId as any).mockResolvedValue({
        id: "prof-1", userId: "user-prof", isOnline: true, vehicleTypesServed: ["car"],
      });
      (VehiclesRepository.findById as any).mockResolvedValue({ id: "veh-1", type: "car" });
      (ServiceRequestsRepository.update as any).mockResolvedValue({ id: "req-1", status: "accepted" });

      await MatchingService.acceptRequest("user-prof", "req-1");

      expect(notifyRequestClaimedMock).toHaveBeenCalledWith("req-1", "user-prof");
    });

    it("deve lançar NOT_FOUND quando request nao existe", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue(null);

      await expect(MatchingService.acceptRequest("user-prof", "nonexistent"))
        .rejects.toThrow("Chamado não encontrado");
    });

    it("deve rejeitar se request nao esta em matching", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1", status: "accepted",
      });

      await expect(MatchingService.acceptRequest("user-prof", "req-1"))
        .rejects.toThrow("Chamado já foi aceito");
    });

    it("deve rejeitar se profissional nao existe", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1", status: "matching", vehicleId: "veh-1",
      });
      (ProfessionalsRepository.findByUserId as any).mockResolvedValue(null);

      await expect(MatchingService.acceptRequest("user-prof", "req-1"))
        .rejects.toThrow("Profissional não encontrado");
    });

    it("deve rejeitar se profissional esta offline", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1", status: "matching", vehicleId: "veh-1",
      });
      (ProfessionalsRepository.findByUserId as any).mockResolvedValue({
        id: "prof-1", userId: "user-prof", isOnline: false, vehicleTypesServed: ["car"],
      });

      await expect(MatchingService.acceptRequest("user-prof", "req-1"))
        .rejects.toThrow("Você está offline");
    });

    it("deve rejeitar se profissional nao atende o tipo de veiculo", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1", status: "matching", vehicleId: "veh-1",
      });
      (ProfessionalsRepository.findByUserId as any).mockResolvedValue({
        id: "prof-1", userId: "user-prof", isOnline: true, vehicleTypesServed: ["moto"],
      });
      (VehiclesRepository.findById as any).mockResolvedValue({
        id: "veh-1", type: "car",
      });

      await expect(MatchingService.acceptRequest("user-prof", "req-1"))
        .rejects.toThrow("Você não atende este tipo de veículo");
    });

    it("deve rejeitar se vehicleTypesServed e vazio", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1", status: "matching", vehicleId: "veh-1",
      });
      (ProfessionalsRepository.findByUserId as any).mockResolvedValue({
        id: "prof-1", userId: "user-prof", isOnline: true, vehicleTypesServed: [],
      });
      (VehiclesRepository.findById as any).mockResolvedValue({
        id: "veh-1", type: "car",
      });

      await expect(MatchingService.acceptRequest("user-prof", "req-1"))
        .rejects.toThrow("Você não atende este tipo de veículo");
    });

    it("deve lançar ALREADY_ACCEPTED quando update retorna null (race condition)", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1", status: "matching", vehicleId: "veh-1",
      });
      (ProfessionalsRepository.findByUserId as any).mockResolvedValue({
        id: "prof-1", userId: "user-prof", isOnline: true, vehicleTypesServed: ["car"],
      });
      (VehiclesRepository.findById as any).mockResolvedValue({
        id: "veh-1", type: "car",
      });
      // Simula race condition: update retorna null porque outro profissional aceitou primeiro
      (ServiceRequestsRepository.update as any).mockResolvedValue(null);

      await expect(MatchingService.acceptRequest("user-prof", "req-1"))
        .rejects.toThrow("Este chamado já foi aceito por outro profissional");
    });

    it("deve rejeitar se veiculo nao existe", async () => {
      (ServiceRequestsRepository.findById as any).mockResolvedValue({
        id: "req-1", status: "matching", vehicleId: "veh-1",
      });
      (ProfessionalsRepository.findByUserId as any).mockResolvedValue({
        id: "prof-1", userId: "user-prof", isOnline: true, vehicleTypesServed: ["car"],
      });
      (VehiclesRepository.findById as any).mockResolvedValue(null);

      await expect(MatchingService.acceptRequest("user-prof", "req-1"))
        .rejects.toThrow("Veículo não encontrado");
    });
  });
});
