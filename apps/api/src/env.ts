import { z } from "zod";

function buildR2Endpoint(accountId?: string): string | undefined {
  if (!accountId) {
    return undefined;
  }

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

// Validação de TODAS as env vars no startup
// Se faltar alguma, o app NÃO inicia — fail fast
const envSchema = z
  .object({
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

    // Real-time / CORS
    API_CORS_ORIGIN: z.string().default("http://localhost:8081"),
    SOCKET_CORS_ORIGIN: z.string().default("http://localhost:8081"),

    // Distância máxima de chegada em metros (padrão: 200m produção, aumentar para testes)
    MAX_ARRIVAL_DISTANCE_METERS: z.coerce.number().optional(),

    // Uploads — R2 (Cloudflare) optional, local fallback when absent
    API_URL: z.string().optional(),
    R2_ENDPOINT: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_ACCESS_KEY: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_SECRET_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_PUBLIC_URL: z.string().url("R2_PUBLIC_URL inválida").optional(),

    // Mercado Pago — Pagamentos
    MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
    MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),

    // Firebase Admin SDK — Push Notifications (FCM)
    // Opcionais: em ambientes sem credenciais, o push é desabilitado graciosamente
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().email("FIREBASE_CLIENT_EMAIL deve ser um email válido").optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
  })
  .transform((data) => ({
    NODE_ENV: data.NODE_ENV,
    PORT: data.PORT,
    DATABASE_URL: data.DATABASE_URL,
    REDIS_URL: data.REDIS_URL,
    JWT_SECRET: data.JWT_SECRET,
    JWT_REFRESH_SECRET: data.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRY: data.JWT_ACCESS_EXPIRY,
    JWT_REFRESH_EXPIRY: data.JWT_REFRESH_EXPIRY,
    API_CORS_ORIGIN: data.API_CORS_ORIGIN,
    SOCKET_CORS_ORIGIN: data.SOCKET_CORS_ORIGIN,
    MAX_ARRIVAL_DISTANCE_METERS: data.MAX_ARRIVAL_DISTANCE_METERS,
    API_URL: data.API_URL,
    R2_ENDPOINT: data.R2_ENDPOINT ?? buildR2Endpoint(data.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: data.R2_ACCESS_KEY_ID ?? data.R2_ACCESS_KEY,
    R2_SECRET_ACCESS_KEY:
      data.R2_SECRET_ACCESS_KEY ?? data.R2_SECRET_KEY,
    R2_BUCKET: data.R2_BUCKET ?? data.R2_BUCKET_NAME,
    R2_ACCOUNT_ID: data.R2_ACCOUNT_ID,
    R2_PUBLIC_URL: data.R2_PUBLIC_URL,
    MERCADOPAGO_ACCESS_TOKEN: data.MERCADOPAGO_ACCESS_TOKEN,
    MERCADOPAGO_WEBHOOK_SECRET: data.MERCADOPAGO_WEBHOOK_SECRET,
    FIREBASE_PROJECT_ID: data.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: data.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: data.FIREBASE_PRIVATE_KEY,
  }));

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente inválidas: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
    );
  }

  return result.data;
}

function validateEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(message);
    process.exit(1);
  }
}

export const env = validateEnv();
