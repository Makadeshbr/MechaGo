import { db } from "@/db";
import { reviews } from "@/db/schema/reviews";
import { users } from "@/db/schema/users";
import { professionals } from "@/db/schema/professionals";
import { eq, and, avg, count } from "drizzle-orm";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type SelectReview = InferSelectModel<typeof reviews>;
export type InsertReview = InferInsertModel<typeof reviews>;

export class ReviewsRepository {
  static async create(data: InsertReview): Promise<SelectReview> {
    const [review] = await db.insert(reviews).values(data).returning();
    return review;
  }

  static async findByServiceRequestAndReviewer(
    serviceRequestId: string,
    fromUserId: string,
  ): Promise<SelectReview | null> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.serviceRequestId, serviceRequestId),
          eq(reviews.fromUserId, fromUserId),
        ),
      )
      .limit(1);
    return review ?? null;
  }

  static async findByProfessionalUserId(professionalUserId: string): Promise<SelectReview[]> {
    return db
      .select({ review: reviews })
      .from(reviews)
      .where(eq(reviews.toUserId, professionalUserId))
      .then((rows) => rows.map((r) => r.review));
  }

  /**
   * Recalcula e persiste a nota média do usuário na tabela users.
   * Chamado após criação de avaliação para manter a coluna `rating` sempre atual.
   */
  static async recalculateUserRating(userId: string): Promise<void> {
    const [result] = await db
      .select({
        average: avg(reviews.rating),
        total: count(reviews.id),
      })
      .from(reviews)
      .where(eq(reviews.toUserId, userId));

    const newAverage = result?.average ? Number(Number(result.average).toFixed(2)) : null;
    const newTotal = result?.total ?? 0;

    await db
      .update(users)
      .set({
        rating: newAverage?.toString() ?? null,
        totalReviews: newTotal,
      })
      .where(eq(users.id, userId));
  }

  /**
   * Calcula a nota média de um profissional com base nas reviews recebidas.
   */
  static async getProfessionalAverageRating(professionalUserId: string): Promise<{
    averageRating: number | null;
    totalReviews: number;
  }> {
    const [result] = await db
      .select({
        average: avg(reviews.rating),
        total: count(reviews.id),
      })
      .from(reviews)
      .where(eq(reviews.toUserId, professionalUserId));

    return {
      averageRating: result?.average ? Number(Number(result.average).toFixed(2)) : null,
      totalReviews: result?.total ?? 0,
    };
  }

  /**
   * Busca reviews do profissional juntamente com sua nota média atual.
   */
  static async findByProfessionalWithStats(professionalUserId: string): Promise<{
    reviews: SelectReview[];
    averageRating: number | null;
    totalReviews: number;
  }> {
    const [reviewsList, stats] = await Promise.all([
      ReviewsRepository.findByProfessionalUserId(professionalUserId),
      ReviewsRepository.getProfessionalAverageRating(professionalUserId),
    ]);

    return { reviews: reviewsList, ...stats };
  }
}
