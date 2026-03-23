import { z } from "zod";

// ==================== REGISTER ====================
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(255, "Nome muito longo"),
  email: z
    .string()
    .email("E-mail inválido")
    .transform((v) => v.toLowerCase().trim()),
  phone: z
    .string()
    .regex(
      /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
      "Telefone inválido. Formato: (11) 99999-9999",
    ),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve ter pelo menos 1 letra maiúscula")
    .regex(/[0-9]/, "Senha deve ter pelo menos 1 número"),
  cpfCnpj: z
    .string()
    .regex(
      /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$|^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
      "CPF ou CNPJ inválido",
    ),
  type: z.enum(["client", "professional"], {
    errorMap: () => ({ message: "Tipo deve ser 'client' ou 'professional'" }),
  }),
});

// ==================== LOGIN ====================
export const loginSchema = z.object({
  email: z
    .string()
    .email("E-mail inválido")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Senha é obrigatória"),
});

// ==================== REFRESH ====================
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token é obrigatório"),
});

// ==================== FORGOT PASSWORD ====================
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("E-mail inválido")
    .transform((v) => v.toLowerCase().trim()),
});

// ==================== RESET PASSWORD ====================
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  newPassword: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve ter pelo menos 1 letra maiúscula")
    .regex(/[0-9]/, "Senha deve ter pelo menos 1 número"),
});

// ==================== RESPONSES ====================
export const authResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    type: z.string(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export const messageResponseSchema = z.object({
  message: z.string(),
});

// Types inferidos
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
