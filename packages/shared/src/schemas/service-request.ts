import { z } from "zod";

export const problemTypeSchema = z.enum([
  "tire",
  "battery",
  "electric",
  "overheat",
  "fuel",
  "other",
]);

export const createServiceRequestSchema = z.object({
  vehicleId: z.string().uuid("ID do veiculo invalido"),
  problemType: problemTypeSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  triageAnswers: z.record(z.string(), z.unknown()).optional(),
});

export const estimatePriceSchema = z.object({
  vehicleId: z.string().uuid("ID do veiculo invalido"),
  problemType: problemTypeSchema,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const pricingResultSchema = z.object({
  basePrice: z.number(),
  estimatedPrice: z.number(),
  diagnosticFee: z.number(),
  multipliers: z.object({
    vehicle: z.number(),
    time: z.number(),
    location: z.number(),
    distance: z.number(),
  }),
});

export const serviceRequestSummarySchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  context: z.enum(["urban", "highway"]),
  estimatedPrice: z.number(),
  diagnosticFee: z.number(),
  roadwayPhone: z.string().nullable(),
  roadwayName: z.string().nullable(),
  createdAt: z.string(),
  professionalId: z.string().nullable().optional(),
  professional: z.object({
    name: z.string(),
    avatarUrl: z.string().nullable(),
    rating: z.number(),
    specialties: z.array(z.string()),
  }).nullable().optional(),
});

export type ProblemType = z.infer<typeof problemTypeSchema>;
export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type EstimatePriceInput = z.infer<typeof estimatePriceSchema>;
export type PricingResult = z.infer<typeof pricingResultSchema>;
export type ServiceRequestSummary = z.infer<typeof serviceRequestSummarySchema>;
