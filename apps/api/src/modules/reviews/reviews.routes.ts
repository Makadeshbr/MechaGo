import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { authMiddleware } from "@/middleware/auth.middleware";
import { ReviewsService } from "./reviews.service";
import { createReviewSchema } from "./reviews.schemas";

export const reviewsApp = new OpenAPIHono();

// ==================== POST /reviews ====================
const createReviewRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Reviews"],
  summary: "Criar avaliação bilateral após conclusão do serviço",
  middleware: [authMiddleware],
  request: {
    body: {
      content: { "application/json": { schema: createReviewSchema } },
    },
  },
  responses: {
    201: { description: "Avaliação criada com sucesso" },
    409: { description: "Avaliação duplicada ou status inválido" },
    403: { description: "Usuário não participou deste atendimento" },
  },
});

reviewsApp.openapi(createReviewRoute, async (c) => {
  const fromUserId = c.get("userId");
  const input = c.req.valid("json");
  const result = await ReviewsService.create(fromUserId, input);
  return c.json(result, 201);
});

// ==================== GET /reviews/professional/:id ====================
const getProfessionalReviewsRoute = createRoute({
  method: "get",
  path: "/professional/{id}",
  tags: ["Reviews"],
  summary: "Buscar avaliações de um profissional",
  middleware: [authMiddleware],
  request: {
    params: z.object({ id: z.string().uuid("ID do profissional inválido") }),
  },
  responses: {
    200: { description: "Avaliações retornadas" },
  },
});

reviewsApp.openapi(getProfessionalReviewsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const result = await ReviewsService.getProfessionalReviews(id);
  return c.json(result, 200);
});
