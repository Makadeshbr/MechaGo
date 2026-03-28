import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceRequestsRepository } from "../../service-requests.repository";
import { ServiceRequestsService } from "../../service-requests.service";
import { ProfessionalsRepository } from "../../../professionals/professionals.repository";

const notifyClientStatusUpdateMock = vi.fn();
const notifyProfessionalCancelledMock = vi.fn();
const notifyProfessionalStatusUpdateMock = vi.fn();

vi.mock("../../../notifications/notifications.service", () => ({
  NotificationsService: {
    notifyClientStatusUpdate: notifyClientStatusUpdateMock,
    notifyProfessionalCancelled: notifyProfessionalCancelledMock,
    notifyProfessionalStatusUpdate: notifyProfessionalStatusUpdateMock,
  },
}));

vi.mock("../../service-requests.repository", () => ({
  ServiceRequestsRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    calculateDistanceToRequest: vi.fn(),
  },
}));

vi.mock("../../../professionals/professionals.repository", () => ({
  ProfessionalsRepository: {
    findByUserId: vi.fn(),
  },
}));

function buildRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    status: "professional_arrived",
    clientId: "user-client",
    professionalId: "prof-1",
    estimatedPrice: "100.00",
    finalPrice: null,
    completionPhotoUrl: null,
    diagnosisPhotoUrl: null,
    priceJustification: null,
    context: "urban",
    problemType: "battery",
    address: "Rua das Flores, 123",
    createdAt: new Date("2026-03-27T10:00:00.000Z"),
    clientLatitude: "-23.5505",
    clientLongitude: "-46.6333",
    professional: null,
    resolvedOnSite: null,
    ...overrides,
  };
}

function buildProfessional(overrides: Record<string, unknown> = {}) {
  return {
    id: "prof-1",
    userId: "user-prof",
    latitude: "-23.5505",
    longitude: "-46.6333",
    ...overrides,
  };
}

describe("ServiceRequestsService", () => {
  const repositoryFindById = vi.mocked(ServiceRequestsRepository.findById);
  const repositoryUpdate = vi.mocked(ServiceRequestsRepository.update);
  const repositoryCalculateDistance = vi.mocked(
    ServiceRequestsRepository.calculateDistanceToRequest,
  );
  const professionalsFindByUserId = vi.mocked(
    ProfessionalsRepository.findByUserId,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    notifyClientStatusUpdateMock.mockResolvedValue(undefined);
    notifyProfessionalCancelledMock.mockResolvedValue(undefined);
    notifyProfessionalStatusUpdateMock.mockResolvedValue(undefined);
  });

  describe("arrived", () => {
    it("deve confirmar chegada quando profissional está a menos de 200m", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "accepted" }) as never,
      );
      professionalsFindByUserId.mockResolvedValue(buildProfessional() as never);
      repositoryCalculateDistance.mockResolvedValue({ distanceMeters: 150 });
      repositoryUpdate.mockResolvedValue(
        buildRequest({ status: "professional_arrived" }) as never,
      );

      await ServiceRequestsService.arrived("user-prof", "req-1", {
        latitude: -23.5505,
        longitude: -46.6333,
      });

      expect(repositoryCalculateDistance).toHaveBeenCalledWith({
        requestId: "req-1",
        latitude: -23.5505,
        longitude: -46.6333,
      });
      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({ status: "professional_arrived" }),
      );
    });

    it("deve rejeitar se o status não permite confirmação de chegada", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "matching" }) as never,
      );

      await expect(
        ServiceRequestsService.arrived("user-prof", "req-1", {
          latitude: -23.5505,
          longitude: -46.6333,
        }),
      ).rejects.toThrow("Chamado não está a caminho");
    });

    it("deve rejeitar se o profissional não for o dono do chamado", async () => {
      repositoryFindById.mockResolvedValue(buildRequest({ status: "accepted" }) as never);
      professionalsFindByUserId.mockResolvedValue(
        buildProfessional({ id: "prof-2" }) as never,
      );

      await expect(
        ServiceRequestsService.arrived("user-prof", "req-1", {
          latitude: -23.5505,
          longitude: -46.6333,
        }),
      ).rejects.toThrow("Você não é o profissional deste chamado");
    });

    it("deve rejeitar se não houver localização disponível", async () => {
      repositoryFindById.mockResolvedValue(buildRequest({ status: "accepted" }) as never);
      professionalsFindByUserId.mockResolvedValue(
        buildProfessional({ latitude: null, longitude: null }) as never,
      );

      await expect(
        ServiceRequestsService.arrived("user-prof", "req-1"),
      ).rejects.toThrow(
        "Localização do profissional é obrigatória para confirmar chegada",
      );
    });

    it("deve rejeitar se a distância for maior que 200m", async () => {
      repositoryFindById.mockResolvedValue(buildRequest({ status: "accepted" }) as never);
      professionalsFindByUserId.mockResolvedValue(buildProfessional() as never);
      repositoryCalculateDistance.mockResolvedValue({ distanceMeters: 250 });

      await expect(
        ServiceRequestsService.arrived("user-prof", "req-1", {
          latitude: -23.5505,
          longitude: -46.6333,
        }),
      ).rejects.toThrow(
        "Você precisa estar a menos de 200m do cliente para confirmar chegada",
      );
    });
  });

  describe("diagnosis", () => {
    it("deve aceitar diagnóstico com foto", async () => {
      repositoryFindById.mockResolvedValue(buildRequest() as never);
      professionalsFindByUserId.mockResolvedValue(buildProfessional() as never);
      repositoryUpdate.mockResolvedValue(
        buildRequest({ status: "diagnosing" }) as never,
      );

      await ServiceRequestsService.diagnosis("user-prof", "req-1", {
        diagnosisNotes: "Bateria descarregada e terminais oxidados.",
        diagnosisPhotoUrl: "https://cdn.mechago.com/diagnosis.jpg",
        canResolveOnSite: true,
      });

      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({
          status: "diagnosing",
          diagnosisPhotoUrl: "https://cdn.mechago.com/diagnosis.jpg",
        }),
      );
    });

    it("deve rejeitar diagnóstico sem foto", async () => {
      repositoryFindById.mockResolvedValue(buildRequest() as never);

      await expect(
        ServiceRequestsService.diagnosis("user-prof", "req-1", {
          diagnosisNotes: "Bateria descarregada e terminais oxidados.",
          diagnosisPhotoUrl: "",
          canResolveOnSite: true,
        }),
      ).rejects.toThrow("Foto do diagnóstico é obrigatória");
    });

    it("deve rejeitar se o status não for professional_arrived", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "accepted" }) as never,
      );

      await expect(
        ServiceRequestsService.diagnosis("user-prof", "req-1", {
          diagnosisNotes: "Bateria descarregada e terminais oxidados.",
          diagnosisPhotoUrl: "https://cdn.mechago.com/diagnosis.jpg",
          canResolveOnSite: true,
        }),
      ).rejects.toThrow("Chamado não está no status de chegada");
    });
  });

  describe("resolve", () => {
    it("deve aceitar preço dentro de ±25%", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "diagnosing" }) as never,
      );
      professionalsFindByUserId.mockResolvedValue(buildProfessional() as never);
      repositoryUpdate.mockResolvedValue(buildRequest({ status: "resolved" }) as never);

      await ServiceRequestsService.resolve("user-prof", "req-1", {
        finalPrice: 120,
        completionPhotoUrl: "https://cdn.mechago.com/completion.jpg",
      });

      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({
          status: "resolved",
          finalPrice: "120",
        }),
      );
    });

    it("deve rejeitar preço fora de ±25% sem justificativa", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "diagnosing" }) as never,
      );
      professionalsFindByUserId.mockResolvedValue(buildProfessional() as never);

      await expect(
        ServiceRequestsService.resolve("user-prof", "req-1", {
          finalPrice: 150,
          completionPhotoUrl: "https://cdn.mechago.com/completion.jpg",
        }),
      ).rejects.toThrow("Justificativa é obrigatória");
    });

    it("deve aceitar preço fora de ±25% com justificativa", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "diagnosing" }) as never,
      );
      professionalsFindByUserId.mockResolvedValue(buildProfessional() as never);
      repositoryUpdate.mockResolvedValue(buildRequest({ status: "resolved" }) as never);

      await ServiceRequestsService.resolve("user-prof", "req-1", {
        finalPrice: 150,
        completionPhotoUrl: "https://cdn.mechago.com/completion.jpg",
        priceJustification: "Foi necessária a troca completa da bateria.",
      });

      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({
          finalPrice: "150",
          priceJustification: "Foi necessária a troca completa da bateria.",
        }),
      );
    });

    it("deve rejeitar sem foto de conclusão", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "diagnosing" }) as never,
      );

      await expect(
        ServiceRequestsService.resolve("user-prof", "req-1", {
          finalPrice: 120,
          completionPhotoUrl: "",
        }),
      ).rejects.toThrow("Foto de conclusão é obrigatória para finalizar o serviço");
    });
  });

  describe("escalate", () => {
    it("deve mudar status para escalated", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "diagnosing" }) as never,
      );
      professionalsFindByUserId.mockResolvedValue(buildProfessional() as never);
      repositoryUpdate.mockResolvedValue(
        buildRequest({ status: "escalated" }) as never,
      );

      await ServiceRequestsService.escalate("user-prof", "req-1", {
        escalationReason: "Peça necessária indisponível no local.",
        needsTow: false,
      });

      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({ status: "escalated" }),
      );
    });

    it("deve mudar status para tow_requested se needsTow for true", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "diagnosing" }) as never,
      );
      professionalsFindByUserId.mockResolvedValue(buildProfessional() as never);
      repositoryUpdate.mockResolvedValue(
        buildRequest({ status: "tow_requested" }) as never,
      );

      await ServiceRequestsService.escalate("user-prof", "req-1", {
        escalationReason: "Veículo precisa ser removido para oficina.",
        needsTow: true,
      });

      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({ status: "tow_requested" }),
      );
    });
  });

  describe("approvePrice", () => {
    it("deve mudar status para completed", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "resolved", completionPhotoUrl: "https://cdn.mechago.com/photo.jpg" }) as never,
      );
      repositoryUpdate.mockResolvedValue(
        buildRequest({ status: "completed" }) as never,
      );

      await ServiceRequestsService.approvePrice("user-client", "req-1");

      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({ status: "completed" }),
      );
    });

    it("deve rejeitar se não for o cliente do chamado", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "resolved" }) as never,
      );

      await expect(
        ServiceRequestsService.approvePrice("other-user", "req-1"),
      ).rejects.toThrow("Você não tem permissão para aprovar este pedido");
    });

    it("deve rejeitar se completionPhotoUrl for null (regra de negócio: foto obrigatória)", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "resolved", completionPhotoUrl: null }) as never,
      );

      await expect(
        ServiceRequestsService.approvePrice("user-client", "req-1"),
      ).rejects.toThrow("Foto de conclusão é obrigatória para finalizar o serviço");
    });
  });
});
