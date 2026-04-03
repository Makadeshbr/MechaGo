import { z } from "zod";

// ==================== GET /me RESPONSE ====================
export const userProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  type: z.enum(["client", "professional", "admin"]),
  avatarUrl: z.string().nullable(),
  cpfCnpj: z.string(),
  rating: z.string().nullable(),
  totalReviews: z.number().nullable(),
  isVerified: z.boolean(),
  createdAt: z.string(),
});

// ==================== PATCH /me INPUT ====================
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(255, "Nome muito longo")
    .optional(),
  phone: z
    .string()
    .regex(
      /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
      "Telefone inválido. Formato: (11) 99999-9999",
    )
    .optional(),
  avatarUrl: z.string().url("URL do avatar inválida").nullable().optional(),
});

// ==================== RESPONSE WRAPPERS ====================
export const userProfileResponseSchema = z.object({
  user: userProfileSchema,
});

// ==================== PATCH /me/fcm-token INPUT ====================
// Token FCM do dispositivo — enviado pelo app após obter permissão de push
export const updateFcmTokenSchema = z.object({
  fcmToken: z
    .string()
    .min(10, "FCM token inválido")
    .max(512, "FCM token muito longo"),
});

export const updateFcmTokenResponseSchema = z.object({
  success: z.boolean(),
});

// Types inferidos
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateFcmTokenInput = z.infer<typeof updateFcmTokenSchema>;
