import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  createServiceRequestSchema,
  estimatePriceSchema,
  pricingResponseSchema,
  serviceRequestParamsSchema,
  serviceRequestResponseSchema,
} from "./service-requests.schemas";
import { ServiceRequestsService } from "./service-requests.service";
import { MatchingService } from "../matching/matching.service";
import { authMiddleware } from "../../middleware/auth.middleware";

const app = new OpenAPIHono();

// ==================== POST /service-requests/estimate ====================
const estimatePriceRoute = createRoute({
  method: "post",
  path: "/estimate",
  tags: ["Service Requests"],
  summary: "Calcular estimativa de preço sem criar pedido",
  middleware: [authMiddleware],
  request: {
    body: {
      content: {
        "application/json": {
          schema: estimatePriceSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: pricingResponseSchema,
        },
      },
      description: "Estimativa calculada com sucesso",
    },
  },
});

app.openapi(estimatePriceRoute, async (c) => {
  const input = c.req.valid("json");
  const result = await ServiceRequestsService.estimate(input);
  return c.json(result, 200);
});

// ==================== POST /service-requests ====================
const createRequestRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Service Requests"],
  summary: "Solicitar novo socorro automotivo",
  middleware: [authMiddleware],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createServiceRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: serviceRequestResponseSchema,
        },
      },
      description: "Pedido de socorro criado com estimativa",
    },
  },
});

app.openapi(createRequestRoute, async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");
  const result = await ServiceRequestsService.create(userId, input);
  return c.json(result, 201);
});

// ==================== GET /service-requests/:id ====================
const getRequestRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Service Requests"],
  summary: "Buscar resumo de um pedido de socorro",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: serviceRequestResponseSchema,
        },
      },
      description: "Resumo do pedido retornado com sucesso",
    },
  },
});

app.openapi(getRequestRoute, async (c) => {
  const { id } = c.req.valid("param");
  const result = await ServiceRequestsService.getById(id);
  return c.json(result, 200);
});

// ==================== POST /service-requests/:id/accept ====================
const acceptRequestRoute = createRoute({
  method: "post",
  path: "/{id}/accept",
  tags: ["Service Requests"],
  summary: "Profissional aceita um chamado",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
  },
  responses: {
    200: {
      description: "Chamado aceito com sucesso",
    },
  },
});

app.openapi(acceptRequestRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId"); // O userId do token JWT (que e do profissional)
  
  await MatchingService.acceptRequest(userId, id);
  return c.json({ success: true }, 200);
});

// ==================== POST /service-requests/:id/arrived ====================
const arrivedRequestRoute = createRoute({
  method: "post",
  path: "/{id}/arrived",
  tags: ["Service Requests"],
  summary: "Profissional chegou ao local do cliente",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
  },
  responses: {
    200: {
      description: "Status atualizado para arrived",
    },
  },
});

app.openapi(arrivedRequestRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId"); 
  
  await ServiceRequestsService.arrived(userId, id);
  return c.json({ success: true }, 200);
});

// ==================== PATCH /service-requests/:id/cancel ====================
const cancelRequestRoute = createRoute({
  method: "patch",
  path: "/{id}/cancel",
  tags: ["Service Requests"],
  summary: "Cliente cancela o pedido de socorro",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
  },
  responses: {
    200: {
      description: "Chamado cancelado com sucesso",
    },
  },
});

app.openapi(cancelRequestRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  
  await ServiceRequestsService.cancel(userId, id);
  return c.json({ success: true }, 200);
});

export default app;
