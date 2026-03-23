import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { UsersService } from "./users.service";
import {
  updateProfileSchema,
  userProfileResponseSchema,
} from "./users.schemas";
import { authMiddleware } from "@/middleware/auth.middleware";

const app = new OpenAPIHono();

// Todas as rotas de users exigem autenticação
app.use("*", authMiddleware);

// ==================== GET /me ====================
const getMeRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Users"],
  summary: "Retorna o perfil do usuário logado",
  responses: {
    200: {
      content: { "application/json": { schema: userProfileResponseSchema } },
      description: "Perfil do usuário",
    },
    401: { description: "Não autenticado" },
    404: { description: "Usuário não encontrado" },
  },
});

app.openapi(getMeRoute, async (c) => {
  const userId = c.get("userId");
  const user = await UsersService.getProfile(userId);
  return c.json({ user });
});

// ==================== PATCH /me ====================
const updateMeRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Users"],
  summary: "Atualiza dados básicos do perfil",
  request: {
    body: { content: { "application/json": { schema: updateProfileSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: userProfileResponseSchema } },
      description: "Perfil atualizado",
    },
    401: { description: "Não autenticado" },
    404: { description: "Usuário não encontrado" },
    422: { description: "Dados inválidos" },
  },
});

app.openapi(updateMeRoute, async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");
  const user = await UsersService.updateProfile(userId, input);
  return c.json({ user });
});

export default app;
