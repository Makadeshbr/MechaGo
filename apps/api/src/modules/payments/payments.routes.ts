import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { authMiddleware } from "@/middleware/auth.middleware";
import { logger } from "@/middleware/logger.middleware";
import { PaymentsService } from "./payments.service";
import {
  createDiagnosticPaymentSchema,
  createServicePaymentSchema,
} from "./payments.schemas";
import { paymentsRateLimit } from "@/middleware/rate-limiter";

export const paymentsApp = new OpenAPIHono();

// Proteção contra abuso de criação de pagamentos
paymentsApp.use("/create-diagnostic", paymentsRateLimit);
paymentsApp.use("/create-service", paymentsRateLimit);

// ==================== POST /payments/create-diagnostic ====================
const createDiagnosticRoute = createRoute({
  method: "post",
  path: "/create-diagnostic",
  tags: ["Payments"],
  summary: "Criar pagamento Pix para a taxa de diagnóstico (30% da estimativa)",
  middleware: [authMiddleware],
  request: {
    body: {
      content: { "application/json": { schema: createDiagnosticPaymentSchema } },
    },
  },
  responses: {
    201: { description: "Pagamento criado — retorna QR Code Pix" },
    400: { description: "Dados inválidos" },
  },
});

paymentsApp.openapi(createDiagnosticRoute, async (c) => {
  const input = c.req.valid("json");

  const userId = c.get("userId");
  const result = await PaymentsService.createDiagnosticPaymentForClient({
    serviceRequestId: input.serviceRequestId,
    clientUserId: userId,
    method: input.method,
  });

  return c.json(result, 201);
});

// ==================== POST /payments/create-service ====================
const createServiceRoute = createRoute({
  method: "post",
  path: "/create-service",
  tags: ["Payments"],
  summary: "Criar pagamento Pix para o valor final do serviço",
  middleware: [authMiddleware],
  request: {
    body: {
      content: { "application/json": { schema: createServicePaymentSchema } },
    },
  },
  responses: {
    201: { description: "Pagamento criado" },
    400: { description: "Dados inválidos" },
  },
});

paymentsApp.openapi(createServiceRoute, async (c) => {
  const input = c.req.valid("json");

  const userId = c.get("userId");
  const result = await PaymentsService.createServicePaymentForClient({
    serviceRequestId: input.serviceRequestId,
    clientUserId: userId,
    method: input.method,
  });

  return c.json(result, 201);
});

// ==================== POST /payments/webhook/mercadopago ====================
// SEM authMiddleware — autenticação via HMAC-SHA256
const webhookRoute = createRoute({
  method: "post",
  path: "/webhook/mercadopago",
  tags: ["Payments"],
  summary: "Webhook do Mercado Pago — autenticação via HMAC-SHA256",
  request: {
    body: {
      content: { "application/json": { schema: z.object({}).passthrough() } },
    },
  },
  responses: {
    200: { description: "Evento processado" },
    401: { description: "Assinatura inválida" },
  },
});

paymentsApp.openapi(webhookRoute, async (c) => {
  const xSignature = c.req.header("x-signature") ?? "";
  const xRequestId = c.req.header("x-request-id") ?? "";
  const body = await c.req.json() as { data?: { id?: string } };
  const dataId = body?.data?.id ?? "";

  const valid = PaymentsService.validateWebhookSignature({ xSignature, xRequestId, dataId });

  if (!valid) {
    logger.warn({
      msg: "webhook_invalid_signature",
      xSignature,
      xRequestId,
      dataId,
    });
    return c.json({ error: "Assinatura inválida" }, 401);
  }

  // Processar assincronamente — responde 200 imediatamente (requisito MP)
  PaymentsService.processWebhook(dataId).catch((err) => {
    logger.error({ msg: "webhook_async_error", error: err });
  });

  return c.json({ received: true }, 200);
});

// ==================== POST /payments/:id/confirm-sandbox ====================
// Simula aprovação de pagamento para testes. Disponível apenas em ambiente sandbox.
const confirmSandboxRoute = createRoute({
  method: "post",
  path: "/{id}/confirm-sandbox",
  tags: ["Payments"],
  summary: "Confirmar pagamento manualmente (sandbox/teste apenas)",
  middleware: [authMiddleware],
  request: {
    params: z.object({ id: z.string().uuid("ID inválido") }),
  },
  responses: {
    200: { description: "Pagamento confirmado com sucesso" },
    403: { description: "Apenas em ambiente sandbox" },
    404: { description: "Pagamento não encontrado" },
  },
});

paymentsApp.openapi(confirmSandboxRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const result = await PaymentsService.confirmSandboxPayment(id, userId);
  return c.json(result, 200);
});

// ==================== GET /payments/:id ====================
const getPaymentRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Payments"],
  summary: "Consultar status de um pagamento",
  middleware: [authMiddleware],
  request: {
    params: z.object({ id: z.string().uuid("ID inválido") }),
  },
  responses: {
    200: { description: "Pagamento encontrado" },
    404: { description: "Pagamento não encontrado" },
  },
});

paymentsApp.openapi(getPaymentRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const result = await PaymentsService.getByIdForClient(id, userId);
  return c.json(result, 200);
});
