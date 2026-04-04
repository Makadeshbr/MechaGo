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
    resolveWaitingQueueEntry: vi.fn(),
    ensureWaitingQueueEntry: vi.fn(),
    findHistoryByClientId: vi.fn(),
  },
}));

vi.mock("../../../professionals/professionals.repository", () => ({
  ProfessionalsRepository: {
    findByUserId: vi.fn(),
  },
}));

vi.mock("../../../matching/matching.queue", () => ({
  scheduleMatchingJob: vi.fn().mockResolvedValue(undefined),
  scheduleMatchingTimeout: vi.fn().mockResolvedValue(undefined),
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
    it("deve aceitar aprovação sem mudar status (status muda no webhook do Pix)", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "resolved", completionPhotoUrl: "https://cdn.mechago.com/photo.jpg" }) as never,
      );
      repositoryUpdate.mockResolvedValue(
        buildRequest({ status: "resolved" }) as never,
      );

      await ServiceRequestsService.approvePrice("user-client", "req-1");

      // Agora não mudamos o status no approvePrice, o webhook é responsável
      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.not.objectContaining({ status: "completed" }),
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

  // ── Cancelamento — 6 cenários do PRD V3 ──────────────────────────────────
  describe("cancel — 6 cenários", () => {
    beforeEach(() => {
      repositoryUpdate.mockResolvedValue(buildRequest({ status: "cancelled_client" }) as never);
    });

    it("Cenário 1: cliente cancela ≤2min → 100% de reembolso", async () => {
      const createdAt = new Date(Date.now() - 60_000); // 1 minuto atrás
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "matching", professionalId: "prof-1", createdAt }) as never,
      );

      const result = await ServiceRequestsService.cancel("user-client", "req-1", {
        cancelledBy: "client",
      });

      expect(result.scenario).toBe(1);
      expect(result.refundPercent).toBe(100);
      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({ status: "cancelled_client", cancelledBy: "client" }),
      );
    });

    it("Cenário 2: cliente cancela >2min com profissional aceito → 70% de reembolso", async () => {
      const createdAt = new Date(Date.now() - 5 * 60_000); // 5 minutos atrás
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "accepted", professionalId: "prof-1", createdAt }) as never,
      );

      const result = await ServiceRequestsService.cancel("user-client", "req-1", {
        cancelledBy: "client",
      });

      expect(result.scenario).toBe(2);
      expect(result.refundPercent).toBe(70);
    });

    it("Cenário 3: cliente cancela com profissional a caminho → 0% de reembolso", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "professional_enroute", professionalId: "prof-1" }) as never,
      );

      const result = await ServiceRequestsService.cancel("user-client", "req-1", {
        cancelledBy: "client",
      });

      expect(result.scenario).toBe(3);
      expect(result.refundPercent).toBe(0);
    });

    it("Cenário 4: profissional cancela → status cancelled_professional + auto-rematch", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "accepted", professionalId: "prof-1" }) as never,
      );
      professionalsFindByUserId.mockResolvedValue(buildProfessional() as never);
      repositoryUpdate.mockResolvedValue(
        buildRequest({ status: "cancelled_professional" }) as never,
      );

      const result = await ServiceRequestsService.cancel("user-prof", "req-1", {
        cancelledBy: "professional",
        reason: "Emergência pessoal",
      });

      expect(result.scenario).toBe(4);
      expect(result.autoRematch).toBe(true);
      expect(result.status).toBe("cancelled_professional");
    });

    it("Cenário 5: SLA de chegada expirado → cancela e loga penalidade", async () => {
      const matchedAt = new Date(Date.now() - 35 * 60_000); // 35 min atrás (> SLA 30min)
      repositoryFindById.mockResolvedValue(
        buildRequest({ status: "accepted", professionalId: "prof-1", matchedAt }) as never,
      );
      repositoryUpdate.mockResolvedValue(
        buildRequest({ status: "cancelled_professional" }) as never,
      );

      await ServiceRequestsService.checkArrivalSla("req-1");

      expect(repositoryUpdate).toHaveBeenCalledWith(
        "req-1",
        expect.objectContaining({
          status: "cancelled_professional",
          cancelledBy: "system",
        }),
      );
    });

    it("Cenário 6: ninguém aceita → cliente cancela sem cobrança (sem professionalId)", async () => {
      repositoryFindById.mockResolvedValue(
        buildRequest({
          status: "waiting_queue",
          professionalId: null,
          createdAt: new Date(Date.now() - 10 * 60_000),
        }) as never,
      );

      const result = await ServiceRequestsService.cancel("user-client", "req-1", {
        cancelledBy: "client",
      });

      expect(result.scenario).toBe(6);
      expect(result.refundPercent).toBe(100);
    });
  });
});
