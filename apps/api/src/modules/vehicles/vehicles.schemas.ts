import { z } from "zod";

// Regex para placa brasileira: formato antigo (AAA-1234) ou Mercosul (AAA1A23)
const PLATE_REGEX = /^[A-Z]{3}-?\d{1}[A-Z0-9]{1}\d{2}$/;

// ==================== CREATE ====================
export const createVehicleSchema = z.object({
  type: z.enum(["car", "moto", "suv", "truck"], {
    errorMap: () => ({
      message: "Tipo deve ser 'car', 'moto', 'suv' ou 'truck'",
    }),
  }),
  plate: z
    .string()
    .transform((v) => v.toUpperCase().trim())
    .pipe(
      z
        .string()
        .regex(PLATE_REGEX, "Placa inválida. Formato: ABC-1234 ou ABC1A23"),
    ),
  brand: z
    .string()
    .min(1, "Marca é obrigatória")
    .max(50, "Marca muito longa"),
  model: z
    .string()
    .min(1, "Modelo é obrigatório")
    .max(100, "Modelo muito longo"),
  year: z
    .number()
    .int("Ano deve ser um número inteiro")
    .min(1980, "Ano mínimo é 1980")
    .max(new Date().getFullYear() + 1, "Ano inválido"),
  color: z.string().max(30, "Cor muito longa").optional(),
});

// ==================== UPDATE ====================
export const updateVehicleSchema = z.object({
  type: z
    .enum(["car", "moto", "suv", "truck"], {
      errorMap: () => ({
        message: "Tipo deve ser 'car', 'moto', 'suv' ou 'truck'",
      }),
    })
    .optional(),
  brand: z
    .string()
    .min(1, "Marca é obrigatória")
    .max(50, "Marca muito longa")
    .optional(),
  model: z
    .string()
    .min(1, "Modelo é obrigatório")
    .max(100, "Modelo muito longo")
    .optional(),
  year: z
    .number()
    .int("Ano deve ser um número inteiro")
    .min(1980, "Ano mínimo é 1980")
    .max(new Date().getFullYear() + 1, "Ano inválido")
    .optional(),
  color: z.string().max(30, "Cor muito longa").nullable().optional(),
});

// ==================== RESPONSE ====================
export const vehicleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["car", "moto", "suv", "truck"]),
  plate: z.string(),
  brand: z.string(),
  model: z.string(),
  year: z.number(),
  color: z.string().nullable(),
  createdAt: z.string(),
});

export const vehicleResponseSchema = z.object({
  vehicle: vehicleSchema,
});

export const vehicleListResponseSchema = z.object({
  vehicles: z.array(vehicleSchema),
});

// ==================== PARAMS ====================
export const vehicleIdParamSchema = z.object({
  id: z.string().uuid("ID do veículo inválido"),
});

// Types inferidos
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
