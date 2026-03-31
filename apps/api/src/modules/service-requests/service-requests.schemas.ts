import { z } from "zod";
import {
  createServiceRequestSchema,
  estimatePriceSchema,
  pricingResultSchema,
  problemTypeSchema,
  serviceRequestSummarySchema,
} from "@mechago/shared";

export { createServiceRequestSchema, estimatePriceSchema };
export const problemTypeEnum = problemTypeSchema;
export const pricingResponseSchema = pricingResultSchema;
export const serviceRequestResponseSchema = serviceRequestSummarySchema;

export const serviceRequestParamsSchema = z.object({
  id: z.string().uuid("ID do pedido invalido"),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type EstimatePriceInput = z.infer<typeof estimatePriceSchema>;
export type ServiceRequestResponse = z.infer<typeof serviceRequestResponseSchema>;

// ── Task 05.2: New request body schemas ──────────────────────────

export const diagnosisBodySchema = z.object({
  diagnosisNotes: z
    .string()
    .min(10, "Diagnóstico deve ter pelo menos 10 caracteres")
    .max(2000, "Diagnóstico deve ter no máximo 2000 caracteres"),
  diagnosisPhotoUrl: z.string().url("URL da foto inválida"),
  canResolveOnSite: z.boolean().default(true),
});

export const resolveBodySchema = z.object({
  finalPrice: z.number().positive("Preço deve ser positivo"),
  completionPhotoUrl: z.string().url("URL da foto inválida"),
  priceJustification: z
    .string()
    .min(10, "Justificativa deve ter pelo menos 10 caracteres")
    .max(1000, "Justificativa deve ter no máximo 1000 caracteres")
    .optional(),
});

export const escalateBodySchema = z.object({
  escalationReason: z
    .string()
    .min(10, "Motivo deve ter pelo menos 10 caracteres")
    .max(2000, "Motivo deve ter no máximo 2000 caracteres"),
  needsTow: z.boolean().default(false),
  photoUrl: z.string().url("URL da foto inválida").optional(),
  diagnosisNotes: z.string().optional(),
});

export const approvePriceBodySchema = z.object({});

export const contestPriceBodySchema = z.object({
  reason: z
    .string()
    .min(10, "Motivo deve ter pelo menos 10 caracteres")
    .max(1000, "Motivo deve ter no máximo 1000 caracteres"),
});

export const arrivedBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type DiagnosisInput = z.infer<typeof diagnosisBodySchema>;
export type ResolveInput = z.infer<typeof resolveBodySchema>;
export type EscalateInput = z.infer<typeof escalateBodySchema>;
export type ContestPriceInput = z.infer<typeof contestPriceBodySchema>;
export type ArrivedInput = z.infer<typeof arrivedBodySchema>;

// ── Task 05.3: Cancelamento com 6 cenários ────────────────────────────────
export const cancelBodySchema = z.object({
  reason: z
    .string()
    .max(500, "Motivo deve ter no máximo 500 caracteres")
    .optional(),
  cancelledBy: z.enum(["client", "professional"]).default("client"),
});

export type CancelInput = z.infer<typeof cancelBodySchema>;
