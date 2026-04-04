import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  createServiceRequestSchema,
  estimatePriceSchema,
  pricingResponseSchema,
  serviceRequestParamsSchema,
  serviceRequestResponseSchema,
  diagnosisBodySchema,
  resolveBodySchema,
  escalateBodySchema,
  contestPriceBodySchema,
  arrivedBodySchema,
  cancelBodySchema,
  serviceRequestHistoryQuerySchema,
  serviceRequestHistoryResponseSchema,
} from "./service-requests.schemas";
import { ServiceRequestsService } from "./service-requests.service";
import { ServiceRequestsRepository } from "./service-requests.repository";
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
  const userId = c.get("userId");
  const userType = c.get("userType") as "client" | "professional" | "admin";
  const result = await ServiceRequestsService.getById(id, userId, userType);
  return c.json(result, 200);
});

// ==================== GET /service-requests?role=client ====================
const getHistoryRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Service Requests"],
  summary: "Buscar historico do cliente autenticado",
  middleware: [authMiddleware],
  request: {
    query: serviceRequestHistoryQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: serviceRequestHistoryResponseSchema,
        },
      },
      description: "Historico retornado com sucesso",
    },
  },
});

app.openapi(getHistoryRoute, async (c) => {
  const userId = c.get("userId");
  c.req.valid("query");
  const requests = await ServiceRequestsService.getClientHistory(userId);
  return c.json({ requests }, 200);
});

// ==================== GET /service-requests/active ====================
const getActiveRequestRoute = createRoute({
  method: "get",
  path: "/active",
  tags: ["Service Requests"],
  summary: "Buscar chamado ativo do usuário autenticado (cliente ou pro)",
  middleware: [authMiddleware],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: serviceRequestResponseSchema.nullable(),
        },
      },
      description: "Chamado ativo retornado ou null",
    },
  },
});

app.openapi(getActiveRequestRoute, async (c) => {
  const userId = c.get("userId");
  const userType = c.get("userType") as "client" | "professional";
  
  const result = await ServiceRequestsService.getActiveRequest(userId, userType);
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
    body: {
      content: {
        "application/json": {
          schema: arrivedBodySchema,
        },
      },
    },
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
  const input = c.req.valid("json");
  
  await ServiceRequestsService.arrived(userId, id, input);
  return c.json({ success: true }, 200);
});

// ==================== PATCH /service-requests/:id/cancel ====================
const cancelRequestRoute = createRoute({
  method: "patch",
  path: "/{id}/cancel",
  tags: ["Service Requests"],
  summary: "Cancela pedido de socorro — 6 cenários do PRD V3",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
    body: {
      content: {
        "application/json": { schema: cancelBodySchema },
      },
    },
  },
  responses: {
    200: { description: "Chamado cancelado — retorna cenário e percentual de reembolso" },
  },
});

app.openapi(cancelRequestRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const result = await ServiceRequestsService.cancel(userId, id, input);
  return c.json(result, 200);
});

// ==================== POST /service-requests/:id/diagnosis ====================
const diagnosisRoute = createRoute({
  method: "post",
  path: "/{id}/diagnosis",
  tags: ["Service Requests"],
  summary: "Profissional registra diagnóstico do serviço",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: diagnosisBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Diagnóstico registrado com sucesso",
    },
  },
});

app.openapi(diagnosisRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  await ServiceRequestsService.diagnosis(userId, id, input);
  return c.json({ success: true }, 200);
});

// ==================== POST /service-requests/:id/resolve ====================
const resolveRoute = createRoute({
  method: "post",
  path: "/{id}/resolve",
  tags: ["Service Requests"],
  summary: "Profissional marca serviço como resolvido",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: resolveBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Serviço marcado como resolvido",
    },
  },
});

app.openapi(resolveRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  await ServiceRequestsService.resolve(userId, id, input);
  return c.json({ success: true }, 200);
});

// ==================== POST /service-requests/:id/escalate ====================
const escalateRoute = createRoute({
  method: "post",
  path: "/{id}/escalate",
  tags: ["Service Requests"],
  summary: "Profissional escala caso para guincho/oficina",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: escalateBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Caso escalado com sucesso",
    },
  },
});

app.openapi(escalateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  await ServiceRequestsService.escalate(userId, id, input);
  return c.json({ success: true }, 200);
});

// ==================== POST /service-requests/:id/approve-price ====================
const approvePriceRoute = createRoute({
  method: "post",
  path: "/{id}/approve-price",
  tags: ["Service Requests"],
  summary: "Cliente aprova o preço do serviço",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
  },
  responses: {
    200: {
      description: "Preço aprovado e serviço finalizado",
    },
  },
});

app.openapi(approvePriceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");

  await ServiceRequestsService.approvePrice(userId, id);
  return c.json({ success: true }, 200);
});

// ==================== POST /service-requests/:id/contest-price ====================
const contestPriceRoute = createRoute({
  method: "post",
  path: "/{id}/contest-price",
  tags: ["Service Requests"],
  summary: "Cliente contesta o preço do serviço",
  middleware: [authMiddleware],
  request: {
    params: serviceRequestParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: contestPriceBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Contestação registrada",
    },
  },
});

app.openapi(contestPriceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  await ServiceRequestsService.contestPrice(userId, id, input);
  return c.json({ success: true }, 200);
});

// ==================== GET /service-requests/professional/history ====================
const professionalHistoryRoute = createRoute({
  method: "get",
  path: "/professional/history",
  tags: ["Service Requests"],
  summary: "Histórico de atendimentos concluídos do profissional autenticado",
  middleware: [authMiddleware],
  responses: {
    200: { description: "Lista de atendimentos concluídos" },
  },
});

app.openapi(professionalHistoryRoute, async (c) => {
  const userId = c.get("userId");

  const { ProfessionalsRepository } = await import("../professionals/professionals.repository");
  const professional = await ProfessionalsRepository.findByUserId(userId);
  if (!professional) {
    return c.json({ history: [], earnings: { today: 0, week: 0, month: 0, total: 0 } }, 200);
  }

  const completed = await ServiceRequestsRepository.findCompletedByProfessionalId(professional.id);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let today = 0, week = 0, month = 0, total = 0;

  const history = completed.map((req) => {
    const price = Number(req.finalPrice ?? 0);
    const completedAt = req.completedAt ?? req.updatedAt;

    total += price;
    if (completedAt >= startOfDay) today += price;
    if (completedAt >= startOfWeek) week += price;
    if (completedAt >= startOfMonth) month += price;

    return {
      id: req.id,
      problemType: req.problemType,
      status: req.status,
      finalPrice: price,
      clientName: req.clientName,
      diagnosticFee: Number(req.diagnosticFee),
      completedAt: completedAt?.toISOString() ?? null,
      createdAt: req.createdAt.toISOString(),
    };
  });

  return c.json({
    history,
    earnings: { today, week, month, total },
  }, 200);
});

export default app;
