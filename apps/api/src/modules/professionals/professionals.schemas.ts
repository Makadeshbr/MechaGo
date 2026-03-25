import { z } from "zod";

// ==================== ENUMS ====================
// Tipos de profissional — espelham o pgEnum do schema Drizzle
export const PROFESSIONAL_TYPES = [
  "mechanic_mobile",
  "mechanic_workshop",
  "tire_repair",
  "tow_truck",
] as const;

// Especialidades — espelham o pgEnum do schema Drizzle
export const SPECIALTIES = [
  "car_general",
  "moto",
  "diesel_truck",
  "electronic_injection",
  "suspension",
  "brakes",
  "air_conditioning",
  "transmission",
] as const;

// Tipos de veículo atendidos — espelham vehicleTypeEnum do schema vehicles
export const VEHICLE_TYPES_SERVED = ["car", "moto", "suv", "truck"] as const;

// Tipos de disponibilidade — espelham scheduleTypeEnum
export const SCHEDULE_TYPES = ["24h", "daytime", "nighttime", "custom"] as const;

// ==================== REGISTER ====================
// Schema principal de cadastro do profissional.
// O usuário já existe (POST /auth/register criou a conta base).
// Este endpoint vincula o professional profile ao userId.
export const registerProfessionalSchema = z.object({
  type: z.enum(PROFESSIONAL_TYPES, {
    errorMap: () => ({ message: "Tipo de profissional inválido" }),
  }),
  specialties: z
    .array(z.enum(SPECIALTIES))
    .min(1, "Selecione ao menos uma especialidade"),
  vehicleTypesServed: z
    .array(z.enum(VEHICLE_TYPES_SERVED))
    .min(1, "Selecione ao menos um tipo de veículo atendido"),
  // Raio de atuação: mínimo 3km, máximo 100km
  radiusKm: z
    .number()
    .int("Raio deve ser um número inteiro")
    .min(3, "Raio mínimo é 3 km")
    .max(100, "Raio máximo é 100 km"),
  scheduleType: z.enum(SCHEDULE_TYPES, {
    errorMap: () => ({ message: "Tipo de disponibilidade inválido" }),
  }),
});

// ==================== UPDATE ====================
export const updateProfessionalSchema = registerProfessionalSchema.partial();

// ==================== ONLINE/LOCATION ====================
// Coordenadas GPS enviadas ao ficar online ou atualizar localização
export const goOnlineSchema = z.object({
  latitude: z
    .number()
    .min(-90, "Latitude inválida")
    .max(90, "Latitude inválida"),
  longitude: z
    .number()
    .min(-180, "Longitude inválida")
    .max(180, "Longitude inválida"),
});

export const updateLocationSchema = goOnlineSchema;

// ==================== RESPONSE ====================
export const professionalSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(PROFESSIONAL_TYPES),
  specialties: z.array(z.enum(SPECIALTIES)),
  vehicleTypesServed: z.array(z.enum(VEHICLE_TYPES_SERVED)),
  hasWorkshop: z.boolean(),
  scheduleType: z.enum(SCHEDULE_TYPES),
  radiusKm: z.number(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  isOnline: z.boolean(),
  isFounder: z.boolean(),
  commissionRate: z.string(),
  totalEarnings: z.string(),
  acceptanceRate: z.string(),
  cancellationsThisMonth: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const professionalResponseSchema = z.object({
  professional: professionalSchema,
});

// Estatísticas do profissional — retornadas por GET /me/stats
export const statsSchema = z.object({
  totalEarnings: z.string(),
  acceptanceRate: z.string(),
  cancellationsThisMonth: z.number(),
  isOnline: z.boolean(),
});

export const statsResponseSchema = z.object({
  stats: statsSchema,
});

// ==================== TYPES ====================
export type RegisterProfessionalInput = z.infer<typeof registerProfessionalSchema>;
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;
export type GoOnlineInput = z.infer<typeof goOnlineSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type Professional = z.infer<typeof professionalSchema>;
export type ProfessionalStats = z.infer<typeof statsSchema>;
