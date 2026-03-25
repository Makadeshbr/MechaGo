import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { authMiddleware, requireType } from "@/middleware/auth.middleware";
import { ProfessionalsService } from "./professionals.service";
import {
  registerProfessionalSchema,
  updateProfessionalSchema,
  goOnlineSchema,
  updateLocationSchema,
  professionalResponseSchema,
  statsResponseSchema,
} from "./professionals.schemas";

const app = new OpenAPIHono();

// Todas as rotas de professionals exigem autenticação e perfil profissional
app.use("*", authMiddleware);
app.use("*", requireType("professional"));

// ==================== POST /register ====================
const registerRoute = createRoute({
  method: "post",
  path: "/register",
  tags: ["Professionals"],
  summary: "Cadastrar perfil profissional",
  request: {
    body: {
      content: {
        "application/json": { schema: registerProfessionalSchema },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: professionalResponseSchema } },
      description: "Perfil profissional criado",
    },
    409: { description: "Perfil já cadastrado" },
    422: { description: "Dados inválidos" },
  },
});

app.openapi(registerRoute, async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");
  const professional = await ProfessionalsService.register(userId, input);
  return c.json({ professional }, 201);
});

// ==================== GET /me ====================
const getMeRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Professionals"],
  summary: "Buscar perfil do profissional logado",
  responses: {
    200: {
      content: { "application/json": { schema: professionalResponseSchema } },
      description: "Perfil do profissional",
    },
    404: { description: "Perfil não encontrado" },
  },
});

app.openapi(getMeRoute, async (c) => {
  const userId = c.get("userId");
  const professional = await ProfessionalsService.getProfile(userId);
  return c.json({ professional });
});

// ==================== PATCH /me ====================
const updateMeRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Professionals"],
  summary: "Atualizar perfil do profissional",
  request: {
    body: {
      content: {
        "application/json": { schema: updateProfessionalSchema },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: professionalResponseSchema } },
      description: "Perfil atualizado",
    },
    404: { description: "Perfil não encontrado" },
    422: { description: "Dados inválidos" },
  },
});

app.openapi(updateMeRoute, async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");
  const professional = await ProfessionalsService.updateProfile(userId, input);
  return c.json({ professional });
});

// ==================== POST /me/online ====================
const goOnlineRoute = createRoute({
  method: "post",
  path: "/me/online",
  tags: ["Professionals"],
  summary: "Alternar para status online (envia localização GPS)",
  request: {
    body: {
      content: { "application/json": { schema: goOnlineSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: professionalResponseSchema } },
      description: "Profissional online",
    },
    404: { description: "Perfil não encontrado" },
    422: { description: "Perfil incompleto ou coordenadas inválidas" },
  },
});

app.openapi(goOnlineRoute, async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");
  const professional = await ProfessionalsService.goOnline(userId, input);
  return c.json({ professional });
});

// ==================== POST /me/offline ====================
const goOfflineRoute = createRoute({
  method: "post",
  path: "/me/offline",
  tags: ["Professionals"],
  summary: "Alternar para status offline",
  responses: {
    200: {
      content: { "application/json": { schema: professionalResponseSchema } },
      description: "Profissional offline",
    },
    404: { description: "Perfil não encontrado" },
  },
});

app.openapi(goOfflineRoute, async (c) => {
  const userId = c.get("userId");
  const professional = await ProfessionalsService.goOffline(userId);
  return c.json({ professional });
});

// ==================== PATCH /me/location ====================
const updateLocationRoute = createRoute({
  method: "patch",
  path: "/me/location",
  tags: ["Professionals"],
  summary: "Atualizar localização GPS em background",
  request: {
    body: {
      content: { "application/json": { schema: updateLocationSchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "Localização atualizada",
    },
    404: { description: "Perfil não encontrado" },
    422: { description: "Coordenadas inválidas" },
  },
});

app.openapi(updateLocationRoute, async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");
  await ProfessionalsService.updateLocation(userId, input);
  return c.json({ message: "Localização atualizada" });
});

// ==================== GET /me/stats ====================
const getStatsRoute = createRoute({
  method: "get",
  path: "/me/stats",
  tags: ["Professionals"],
  summary: "Estatísticas do profissional (ganhos, nota, taxa de aceite)",
  responses: {
    200: {
      content: { "application/json": { schema: statsResponseSchema } },
      description: "Estatísticas do profissional",
    },
    404: { description: "Perfil não encontrado" },
  },
});

app.openapi(getStatsRoute, async (c) => {
  const userId = c.get("userId");
  const stats = await ProfessionalsService.getStats(userId);
  return c.json({ stats });
});

export default app;
