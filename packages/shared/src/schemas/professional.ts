import { z } from "zod";

// ==================== ENUMS ====================
// Espelham exatamente os pgEnum do schema Drizzle no backend.
// Fonte única de verdade usada pelo App Pro em formulários de onboarding.

export const PROFESSIONAL_TYPES = [
  "mechanic_mobile",
  "mechanic_workshop",
  "tire_repair",
  "tow_truck",
] as const;

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

export const VEHICLE_TYPES_SERVED = ["car", "moto", "suv", "truck"] as const;

export const SCHEDULE_TYPES = ["24h", "daytime", "nighttime", "custom"] as const;

// ==================== TIPOS DERIVADOS ====================
export type ProfessionalType = (typeof PROFESSIONAL_TYPES)[number];
export type Specialty = (typeof SPECIALTIES)[number];
export type VehicleTypeServed = (typeof VEHICLE_TYPES_SERVED)[number];
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

// ==================== FORMULÁRIOS DE ONBOARDING ====================

// Passo 2/4 — Tipo de profissional
// O usuário seleciona um único tipo de serviço prestado.
export const onboardingStep2Schema = z.object({
  type: z.enum(PROFESSIONAL_TYPES, {
    errorMap: () => ({ message: "Selecione um tipo de serviço" }),
  }),
});

// Passo 3/4 — Especialidades e tipos de veículo atendidos
// Ambas as seleções são obrigatórias com ao menos um item.
export const onboardingStep3Schema = z.object({
  specialties: z
    .array(z.enum(SPECIALTIES))
    .min(1, "Selecione ao menos uma especialidade"),
  vehicleTypesServed: z
    .array(z.enum(VEHICLE_TYPES_SERVED))
    .min(1, "Selecione ao menos um tipo de veículo"),
});

// Passo 4/4 — Raio de atuação e disponibilidade
// radiusKm: inteiro entre 3 e 100 km (permitindo raios maiores para guinchos).
export const onboardingStep4Schema = z.object({
  radiusKm: z
    .number({ invalid_type_error: "Raio deve ser um número" })
    .int("Raio deve ser um número inteiro")
    .min(3, "Raio mínimo é 3 km")
    .max(100, "Raio máximo é 100 km"),
  scheduleType: z.enum(SCHEDULE_TYPES, {
    errorMap: () => ({ message: "Selecione um tipo de disponibilidade" }),
  }),
});

// Schema completo enviado ao POST /api/v1/professionals/register
// Composição dos passos 2, 3 e 4.
export const registerProfessionalFormSchema = onboardingStep2Schema
  .merge(onboardingStep3Schema)
  .merge(onboardingStep4Schema);

// ==================== TIPOS ====================
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Schema>;
export type OnboardingStep3Input = z.infer<typeof onboardingStep3Schema>;
export type OnboardingStep4Input = z.infer<typeof onboardingStep4Schema>;
export type RegisterProfessionalFormInput = z.infer<
  typeof registerProfessionalFormSchema
>;
