import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { VehiclesService } from "./vehicles.service";
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleResponseSchema,
  vehicleListResponseSchema,
  vehicleIdParamSchema,
} from "./vehicles.schemas";
import { authMiddleware } from "@/middleware/auth.middleware";
import { z } from "zod";

const app = new OpenAPIHono();

// Todas as rotas de vehicles exigem autenticação
app.use("*", authMiddleware);

// ==================== POST / ====================
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Vehicles"],
  summary: "Cadastrar veículo",
  request: {
    body: {
      content: { "application/json": { schema: createVehicleSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: vehicleResponseSchema } },
      description: "Veículo cadastrado",
    },
    400: { description: "Limite de veículos atingido" },
    409: { description: "Placa já cadastrada" },
    422: { description: "Dados inválidos" },
  },
});

app.openapi(createRoute_, async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");
  const vehicle = await VehiclesService.create(userId, input);
  return c.json({ vehicle }, 201);
});

// ==================== GET / ====================
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Vehicles"],
  summary: "Listar veículos do usuário logado",
  responses: {
    200: {
      content: { "application/json": { schema: vehicleListResponseSchema } },
      description: "Lista de veículos",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const userId = c.get("userId");
  const vehicles = await VehiclesService.listByUser(userId);
  return c.json({ vehicles });
});

// ==================== PATCH /:id ====================
const updateRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Vehicles"],
  summary: "Atualizar veículo",
  request: {
    params: vehicleIdParamSchema,
    body: {
      content: { "application/json": { schema: updateVehicleSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: vehicleResponseSchema } },
      description: "Veículo atualizado",
    },
    403: { description: "Acesso negado" },
    404: { description: "Veículo não encontrado" },
    422: { description: "Dados inválidos" },
  },
});

app.openapi(updateRoute, async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");
  const vehicle = await VehiclesService.update(userId, id, input);
  return c.json({ vehicle });
});

// ==================== DELETE /:id ====================
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Vehicles"],
  summary: "Remover veículo",
  request: {
    params: vehicleIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "Veículo removido",
    },
    403: { description: "Acesso negado" },
    404: { description: "Veículo não encontrado" },
  },
});

app.openapi(deleteRoute, async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.valid("param");
  await VehiclesService.delete(userId, id);
  return c.json({ message: "Veículo removido com sucesso" });
});

export default app;
