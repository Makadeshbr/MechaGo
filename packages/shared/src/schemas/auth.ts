import { z } from "zod";

// ==================== LOGIN ====================
export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Senha é obrigatória"),
});

// ==================== REGISTER ====================
// Regras de validação idênticas às do backend (auth.schemas.ts)
// Fonte única de verdade para cliente + servidor
export const registerFormSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(255, "Nome muito longo")
      .transform((v) => v.trim()),
    email: z
      .string()
      .min(1, "E-mail é obrigatório")
      .email("E-mail inválido")
      .transform((v) => v.toLowerCase().trim()),
    phone: z
      .string()
      .min(1, "Telefone é obrigatório")
      .regex(
        /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
        "Telefone inválido. Formato: (11) 99999-9999",
      )
      .transform((v) => v.trim()),
    cpfCnpj: z
      .string()
      .min(1, "CPF é obrigatório")
      .regex(
        /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$|^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
        "CPF ou CNPJ inválido",
      )
      .transform((v) => v.trim()),
    password: z
      .string()
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "Senha deve ter pelo menos 1 letra maiúscula")
      .regex(/[0-9]/, "Senha deve ter pelo menos 1 número"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

// Input = tipo do formulário (antes dos transforms)
// Output = tipo enviado à API (depois dos transforms)
export type LoginFormInput = z.input<typeof loginFormSchema>;
export type LoginFormOutput = z.output<typeof loginFormSchema>;
export type RegisterFormInput = z.input<typeof registerFormSchema>;
export type RegisterFormOutput = z.output<typeof registerFormSchema>;
