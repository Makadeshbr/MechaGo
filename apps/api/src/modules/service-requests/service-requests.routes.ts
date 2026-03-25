import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { 
  createServiceRequestSchema, 
  serviceRequestResponseSchema,
  estimatePriceSchema,
  pricingResponseSchema 
} from "./service-requests.schemas";
import { ServiceRequestsService } from "./service-requests.service";
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

export default app;
