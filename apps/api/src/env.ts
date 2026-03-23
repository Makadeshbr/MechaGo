import { z } from "zod";

// Validação de TODAS as env vars no startup
// Se faltar alguma, o app NÃO inicia — fail fast
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  // Banco
  DATABASE_URL: z.string().url("DATABASE_URL inválida"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Auth (serão usados na Task 02)
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Variáveis de ambiente inválidas:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
