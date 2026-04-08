import { z } from "zod";

// Tags predefinidas por direção da avaliação
export const CLIENT_TO_PRO_TAGS = [
  "pontual",
  "educado",
  "competente",
  "justo",
  "rapido",
  "comunicativo",
  "profissional",
] as const;

export const PRO_TO_CLIENT_TAGS = [
  "local_acessivel",
  "comunicativo",
  "pagou_rapido",
  "educado",
  "objetivo",
] as const;

export const ALL_TAGS = [...CLIENT_TO_PRO_TAGS, ...PRO_TO_CLIENT_TAGS] as const;

// O `toUserId` é DERIVADO no backend a partir do serviceRequestId — o cliente não conhece
// (e não deveria conhecer) o userId do profissional. Antes o schema exigia esse campo,
// o que forçava um GET extra antes de toda avaliação e era propenso a race conditions.
export const createReviewSchema = z.object({
  serviceRequestId: z.string().uuid("ID do pedido inválido"),
  rating: z
    .number()
    .int("Nota deve ser número inteiro")
    .min(1, "Nota mínima: 1 estrela")
    .max(5, "Nota máxima: 5 estrelas"),
  tags: z
    .array(z.enum(ALL_TAGS))
    .max(5, "Máximo 5 tags por avaliação")
    .default([]),
  comment: z
    .string()
    .max(500, "Comentário deve ter no máximo 500 caracteres")
    .optional(),
});

export const reviewResponseSchema = z.object({
  id: z.string().uuid(),
  serviceRequestId: z.string().uuid(),
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  rating: z.number(),
  tags: z.array(z.string()),
  comment: z.string().nullable(),
  createdAt: z.string(),
});

export const professionalReviewsResponseSchema = z.object({
  professionalUserId: z.string().uuid(),
  averageRating: z.number().nullable(),
  totalReviews: z.number(),
  reviews: z.array(reviewResponseSchema),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
