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
