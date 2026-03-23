import { z } from "zod";
import { vehicleTypeSchema } from "@mechago/shared";

export const problemTypeEnum = z.enum([
  "tire",
  "battery",
  "electric",
  "overheat",
  "fuel",
  "other",
]);

// ==================== CREATE REQUEST ====================
export const createServiceRequestSchema = z.object({
  vehicleId: z.string().uuid("ID do veículo inválido"),
  problemType: problemTypeEnum,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  triageAnswers: z.record(z.string(), z.any()).optional(),
});

// ==================== RESPONSE ====================
export const serviceRequestResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  context: z.enum(["urban", "highway"]),
  estimatedPrice: z.number(),
  diagnosticFee: z.number(),
  roadwayPhone: z.string().nullable(),
  roadwayName: z.string().nullable(),
  createdAt: z.string(),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type ServiceRequestResponse = z.infer<typeof serviceRequestResponseSchema>;
