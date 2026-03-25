import { z } from "zod";

// Regex para placa brasileira: formato antigo (AAA-1234) ou Mercosul (AAA1A23)
const PLATE_REGEX = /^[A-Z]{3}-?\d{1}[A-Z0-9]{1}\d{2}$/;

export const vehicleTypeSchema = z.enum(["car", "moto", "suv", "truck"]);

export const vehicleDeletionImpactSchema = z.object({
  canDelete: z.boolean(),
  willCancelPendingRequests: z.boolean(),
  pendingRequestCount: z.number().int().nonnegative(),
  blockingRequestCount: z.number().int().nonnegative(),
  message: z.string(),
});

// Schema do formulário de cadastro de veículo
// year aceita string (TextInput) e transforma para number via pipe
export const createVehicleFormSchema = z.object({
  type: vehicleTypeSchema,
  brand: z
    .string()
    .min(1, "Marca é obrigatória")
    .max(50, "Marca muito longa")
    .transform((v) => v.trim()),
  model: z
    .string()
    .min(1, "Modelo é obrigatório")
    .max(100, "Modelo muito longo")
    .transform((v) => v.trim()),
  year: z
    .string()
    .min(1, "Ano é obrigatório")
    .regex(/^\d{4}$/, "Ano deve ter 4 dígitos")
    .transform((v) => parseInt(v, 10))
    .pipe(
      z
        .number()
        .int("Ano deve ser um número inteiro")
        .min(1980, "Ano mínimo é 1980")
        .max(new Date().getFullYear() + 1, "Ano inválido"),
    ),
  plate: z
    .string()
    .min(1, "Placa é obrigatória")
    .transform((v) => v.toUpperCase().trim())
    .pipe(
      z.string().regex(PLATE_REGEX, "Placa inválida (ABC-1234 ou ABC1A23)"),
    ),
  color: z.string().max(30, "Cor muito longa").optional(),
});

export type VehicleType = z.infer<typeof vehicleTypeSchema>;
export type CreateVehicleFormInput = z.input<typeof createVehicleFormSchema>;
export type CreateVehicleFormOutput = z.output<typeof createVehicleFormSchema>;
export type VehicleDeletionImpact = z.infer<typeof vehicleDeletionImpactSchema>;
