import { z } from "zod";

export const paymentTypeEnum = z.enum(["diagnostic_fee", "service", "tow"]);
export const paymentMethodEnum = z.enum(["pix", "credit_card", "debit_card"]);
export const paymentStatusEnum = z.enum(["pending", "authorized", "captured", "refunded", "failed"]);

// ── POST /payments/create-diagnostic ──────────────────────────────────────
export const createDiagnosticPaymentSchema = z.object({
  serviceRequestId: z.string().uuid("ID do pedido inválido"),
  method: paymentMethodEnum.default("pix"),
});

// ── POST /payments/create-service ─────────────────────────────────────────
export const createServicePaymentSchema = z.object({
  serviceRequestId: z.string().uuid("ID do pedido inválido"),
  method: paymentMethodEnum.default("pix"),
});

// ── POST /payments/webhook/mercadopago ────────────────────────────────────
export const webhookBodySchema = z.object({
  action: z.string(),
  data: z.object({ id: z.string() }),
  type: z.string(),
}).passthrough();

// ── Response ──────────────────────────────────────────────────────────────
export const paymentResponseSchema = z.object({
  id: z.string().uuid(),
  serviceRequestId: z.string().uuid(),
  type: paymentTypeEnum,
  amount: z.number(),
  method: paymentMethodEnum,
  status: paymentStatusEnum,
  gatewayId: z.string().nullable(),
  pixQrCode: z.string().nullable(),
  pixQrCodeBase64: z.string().nullable(),
  pixExpiration: z.string().nullable(),
  createdAt: z.string(),
});

export type CreateDiagnosticPaymentInput = z.infer<typeof createDiagnosticPaymentSchema>;
export type CreateServicePaymentInput = z.infer<typeof createServicePaymentSchema>;
export type WebhookBody = z.infer<typeof webhookBodySchema>;
export type PaymentResponse = z.infer<typeof paymentResponseSchema>;
