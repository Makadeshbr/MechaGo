import { AppError } from "@/utils/errors";
import { ServiceRequestsRepository } from "../service-requests/service-requests.repository";
import { ReviewsRepository } from "./reviews.repository";
import type { SelectReview } from "./reviews.repository";
import type { CreateReviewInput } from "./reviews.schemas";

// Nota mínima para o profissional permanecer ativo
const MIN_PROFESSIONAL_RATING = 3.5;

function serializeReview(review: SelectReview) {
  return {
    id: review.id,
    serviceRequestId: review.serviceRequestId,
    fromUserId: review.fromUserId,
    toUserId: review.toUserId,
    rating: review.rating,
    tags: review.tags ?? [],
    comment: review.comment ?? null,
    createdAt: review.createdAt.toISOString(),
  };
}

export class ReviewsService {
  /**
   * Cria uma avaliação bilateral (cliente → profissional ou profissional → cliente).
   * Regras: só após `completed`, uma por reviewer por request, nota 1-5.
   */
  static async create(fromUserId: string, input: CreateReviewInput) {
    const request = await ServiceRequestsRepository.findById(input.serviceRequestId);
    if (!request) {
      throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);
    }

    // Só permite avaliar quando o serviço está concluído
    if (request.status !== "completed") {
      throw new AppError(
        "INVALID_STATUS",
        "Avaliação só é permitida após o serviço ser concluído",
        409,
      );
    }

    // Garante que o reviewer é parte do atendimento
    const isClient = request.clientId === fromUserId;
    const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
    const professional = await ProfessionalsRepository.findByUserId(fromUserId);
    const isProfessional = professional?.id === request.professionalId;

    if (!isClient && !isProfessional) {
      throw new AppError("FORBIDDEN", "Você não participou deste atendimento", 403);
    }

    // toUserId derivado do request — o cliente não precisa nem conhece o userId do pro
    const targetUserId = isClient
      ? request.professional?.userId ?? null
      : request.clientId;

    if (!targetUserId) {
      throw new AppError(
        "INVALID_REVIEW_TARGET",
        "Não foi possível identificar a contraparte deste atendimento",
        409,
      );
    }

    // Impede avaliação duplicada (um reviewer por request)
    const existing = await ReviewsRepository.findByServiceRequestAndReviewer(
      input.serviceRequestId,
      fromUserId,
    );
    if (existing) {
      throw new AppError(
        "DUPLICATE_REVIEW",
        "Você já avaliou este atendimento",
        409,
      );
    }

    const review = await ReviewsRepository.create({
      serviceRequestId: input.serviceRequestId,
      fromUserId,
      toUserId: targetUserId,
      rating: input.rating,
      tags: input.tags,
      comment: input.comment,
    });

    // Recalcula nota média do avaliado
    await ReviewsRepository.recalculateUserRating(targetUserId);

    // Verifica suspensão temporária se profissional ficou abaixo do mínimo
    if (isClient) {
      await ReviewsService.checkProfessionalSuspension(targetUserId);
    }

    return serializeReview(review);
  }

  /**
   * Retorna todas as avaliações de um profissional com estatísticas.
   */
  static async getProfessionalReviews(professionalUserId: string) {
    const { reviews, averageRating, totalReviews } =
      await ReviewsRepository.findByProfessionalWithStats(professionalUserId);

    return {
      professionalUserId,
      averageRating,
      totalReviews,
      reviews: reviews.map(serializeReview),
    };
  }

  /**
   * Verifica se a nota do profissional caiu abaixo do mínimo.
   * Abaixo de 3.5 → suspensão temporária (is_online = false).
   * Apenas loga o evento — a suspensão será tratada numa task futura.
   */
  private static async checkProfessionalSuspension(professionalUserId: string): Promise<void> {
    const { averageRating } = await ReviewsRepository.getProfessionalAverageRating(professionalUserId);

    if (averageRating !== null && averageRating < MIN_PROFESSIONAL_RATING) {
      const { logger } = await import("@/middleware/logger.middleware");
      logger.warn({
        msg: "professional_rating_below_minimum",
        professionalUserId,
        averageRating,
        threshold: MIN_PROFESSIONAL_RATING,
        action: "suspension_required",
      });

      // MVP: desativa o profissional automaticamente
      const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
      const prof = await ProfessionalsRepository.findByUserId(professionalUserId);
      if (prof) {
        await ProfessionalsRepository.update(prof.id, { isOnline: false });
      }
    }
  }
}
