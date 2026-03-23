import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { 
  createServiceRequestSchema, 
  serviceRequestResponseSchema 
} from "./service-requests.schemas";
import { ServiceRequestsService } from "./service-requests.service";
import { authMiddleware } from "../../middleware/auth.middleware";

const app = new OpenAPIHono();

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
