import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewsService } from "../../reviews.service";
import { ReviewsRepository } from "../../reviews.repository";
import { ServiceRequestsRepository } from "../../../service-requests/service-requests.repository";

vi.mock("../../reviews.repository", () => ({
  ReviewsRepository: {
    create: vi.fn(),
    findByServiceRequestAndReviewer: vi.fn(),
    findByProfessionalWithStats: vi.fn(),
    getProfessionalAverageRating: vi.fn(),
    recalculateUserRating: vi.fn(),
    findByProfessionalUserId: vi.fn(),
  },
}));

vi.mock("../../../service-requests/service-requests.repository", () => ({
  ServiceRequestsRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../../../professionals/professionals.repository", () => ({
  ProfessionalsRepository: {
    findByUserId: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
  },
}));

vi.mock("@/middleware/logger.middleware", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const buildRequest = (overrides = {}) => ({
  id: "req-uuid-1",
  clientId: "client-uuid-1",
  professionalId: "pro-internal-uuid",
  status: "completed" as const,
  vehicleId: "vehicle-uuid",
  problemType: "battery" as const,
  complexity: "simple" as const,
  context: "urban" as const,
  clientLatitude: "-23.0000000",
  clientLongitude: "-43.0000000",
  estimatedPrice: "115.00",
  finalPrice: "115.00",
  diagnosticFee: "34.50",
  diagnosisPhotoUrl: "https://r2.dev/diag.jpg",
  completionPhotoUrl: "https://r2.dev/comp.jpg",
  cancellationReason: null,
  cancelledBy: null,
  cancelledAt: null,
  matchedAt: null,
  arrivedAt: null,
  completedAt: new Date("2026-03-31T15:00:00Z"),
  createdAt: new Date("2026-03-31T12:00:00Z"),
  updatedAt: new Date("2026-03-31T15:00:00Z"),
  address: null,
  triageAnswers: null,
  priceJustification: null,
  resolvedOnSite: true,
  diagnosis: "Bateria descarregada",
  escalationDestination: null,
  professional: null,
  roadwayPhone: null,
  ...overrides,
});

const buildReview = (overrides = {}) => ({
  id: "review-uuid-1",
  serviceRequestId: "req-uuid-1",
  fromUserId: "client-uuid-1",
  toUserId: "pro-user-uuid",
  rating: 5,
  tags: ["pontual", "competente"],
  comment: "Excelente profissional!",
  createdAt: new Date("2026-03-31T15:30:00Z"),
  ...overrides,
});

describe("ReviewsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ReviewsRepository.recalculateUserRating).mockResolvedValue(undefined);
    vi.mocked(ReviewsRepository.getProfessionalAverageRating).mockResolvedValue({
      averageRating: 4.8,
      totalReviews: 10,
    });
  });

  describe("create", () => {
    it("deve criar avaliação com dados válidos", async () => {
      vi.mocked(ServiceRequestsRepository.findById).mockResolvedValue(buildRequest() as never);
      vi.mocked(ReviewsRepository.findByServiceRequestAndReviewer).mockResolvedValue(null);
      vi.mocked(ReviewsRepository.create).mockResolvedValue(buildReview());

      const result = await ReviewsService.create("client-uuid-1", {
        serviceRequestId: "req-uuid-1",
        toUserId: "pro-user-uuid",
        rating: 5,
        tags: ["pontual", "competente"],
        comment: "Excelente!",
      });

      expect(result.rating).toBe(5);
      expect(result.tags).toEqual(["pontual", "competente"]);
      expect(ReviewsRepository.recalculateUserRating).toHaveBeenCalledWith("pro-user-uuid");
    });

    it("deve rejeitar avaliação duplicada do mesmo reviewer", async () => {
      vi.mocked(ServiceRequestsRepository.findById).mockResolvedValue(buildRequest() as never);
      vi.mocked(ReviewsRepository.findByServiceRequestAndReviewer).mockResolvedValue(buildReview());

      await expect(
        ReviewsService.create("client-uuid-1", {
          serviceRequestId: "req-uuid-1",
          toUserId: "pro-user-uuid",
          rating: 4,
          tags: [],
        }),
      ).rejects.toThrow("Você já avaliou este atendimento");
    });

    it("deve rejeitar se o pedido não está concluído", async () => {
      vi.mocked(ServiceRequestsRepository.findById).mockResolvedValue(
        buildRequest({ status: "resolved" }) as never,
      );

      await expect(
        ReviewsService.create("client-uuid-1", {
          serviceRequestId: "req-uuid-1",
          toUserId: "pro-user-uuid",
          rating: 5,
          tags: [],
        }),
      ).rejects.toThrow("Avaliação só é permitida após o serviço ser concluído");
    });

    it("deve rejeitar usuário que não participou do atendimento", async () => {
      vi.mocked(ServiceRequestsRepository.findById).mockResolvedValue(buildRequest() as never);
      vi.mocked(ReviewsRepository.findByServiceRequestAndReviewer).mockResolvedValue(null);

      await expect(
        ReviewsService.create("outro-usuario", {
          serviceRequestId: "req-uuid-1",
          toUserId: "pro-user-uuid",
          rating: 3,
          tags: [],
        }),
      ).rejects.toThrow("Você não participou deste atendimento");
    });

    it("deve rejeitar pedido não encontrado", async () => {
      vi.mocked(ServiceRequestsRepository.findById).mockResolvedValue(null);

      await expect(
        ReviewsService.create("client-uuid-1", {
          serviceRequestId: "inexistente",
          toUserId: "pro-user-uuid",
          rating: 5,
          tags: [],
        }),
      ).rejects.toThrow("Pedido não encontrado");
    });
  });

  describe("getProfessionalReviews", () => {
    it("deve calcular média corretamente", async () => {
      vi.mocked(ReviewsRepository.findByProfessionalWithStats).mockResolvedValue({
        reviews: [buildReview({ rating: 5 }), buildReview({ rating: 4, id: "r2" })],
        averageRating: 4.5,
        totalReviews: 2,
      });

      const result = await ReviewsService.getProfessionalReviews("pro-user-uuid");

      expect(result.averageRating).toBe(4.5);
      expect(result.totalReviews).toBe(2);
      expect(result.reviews).toHaveLength(2);
    });

    it("deve retornar null para profissional sem avaliações", async () => {
      vi.mocked(ReviewsRepository.findByProfessionalWithStats).mockResolvedValue({
        reviews: [],
        averageRating: null,
        totalReviews: 0,
      });

      const result = await ReviewsService.getProfessionalReviews("pro-sem-reviews");

      expect(result.averageRating).toBeNull();
      expect(result.totalReviews).toBe(0);
      expect(result.reviews).toHaveLength(0);
    });
  });

  // ─── Validação Zod (rating fora do range) ──────────────────────────────────
  describe("schema validation (rating bounds)", () => {
    it("deve rejeitar rating 0 (abaixo do mínimo)", () => {
      const { createReviewSchema } = require("../../reviews.schemas");
      const result = createReviewSchema.safeParse({
        serviceRequestId: "00000000-0000-0000-0000-000000000001",
        toUserId: "00000000-0000-0000-0000-000000000002",
        rating: 0,
        tags: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Nota mínima: 1 estrela");
      }
    });

    it("deve rejeitar rating 6 (acima do máximo)", () => {
      const { createReviewSchema } = require("../../reviews.schemas");
      const result = createReviewSchema.safeParse({
        serviceRequestId: "00000000-0000-0000-0000-000000000001",
        toUserId: "00000000-0000-0000-0000-000000000002",
        rating: 6,
        tags: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Nota máxima: 5 estrelas");
      }
    });

    it("deve aceitar rating válido (1-5)", () => {
      const { createReviewSchema } = require("../../reviews.schemas");
      for (const rating of [1, 2, 3, 4, 5]) {
        const result = createReviewSchema.safeParse({
          serviceRequestId: "00000000-0000-0000-0000-000000000001",
          toUserId: "00000000-0000-0000-0000-000000000002",
          rating,
          tags: [],
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
