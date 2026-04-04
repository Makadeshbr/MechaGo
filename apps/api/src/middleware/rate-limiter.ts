import { createMiddleware } from "hono/factory";
import { redis } from "@/lib/redis";
import { logger } from "@/middleware/logger.middleware";

interface RateLimitOptions {
  // Número máximo de requisições no janela
  limit: number;
  // Duração da janela em segundos
  windowSeconds: number;
  // Chave customizada (default: IP)
  keyFn?: (c: Parameters<ReturnType<typeof createMiddleware>>[0]) => string;
  // Mensagem de erro customizada
  message?: string;
}

// Timeout máximo para operações Redis — evita travar se Redis estiver indisponível
const REDIS_TIMEOUT_MS = 300;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Redis operation timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Rate limiter usando janela fixa com Redis INCR + EXPIRE.
 * Gracefully degraded: se Redis estiver indisponível ou lento, permite a requisição.
 * Usa timeout de 300ms para garantir que nunca bloqueia o request path.
 */
export function rateLimiter(opts: RateLimitOptions) {
  return createMiddleware(async (c, next) => {
    try {
      const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
        ?? c.req.header("x-real-ip")
        ?? "unknown";

      const key = opts.keyFn
        ? opts.keyFn(c)
        : `rl:${ip}:${c.req.path}`;

      const current = await withTimeout(redis.incr(key), REDIS_TIMEOUT_MS);

      // Na primeira requisição do janelo, define o TTL
      if (current === 1) {
        // Fire-and-forget — não bloqueia o fluxo se falhar
        redis.expire(key, opts.windowSeconds).catch(() => {});
      }

      // Headers padrão de rate limit para o cliente
      c.header("X-RateLimit-Limit", String(opts.limit));
      c.header("X-RateLimit-Remaining", String(Math.max(0, opts.limit - current)));
      c.header("X-RateLimit-Reset", String(opts.windowSeconds));

      if (current > opts.limit) {
        logger.warn(
          { key, current, limit: opts.limit, path: c.req.path },
          "Rate limit exceeded",
        );
        return c.json(
          {
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: opts.message ?? "Muitas requisições. Aguarde e tente novamente.",
            },
          },
          429,
        );
      }
    } catch (err) {
      // Redis indisponível ou lento: log e permite a requisição (graceful degradation)
      logger.warn({ error: err }, "Rate limiter Redis error — allowing request");
    }

    return next();
  });
}

// Limites pré-configurados para os casos de uso do MechaGo

/** Login: 10 tentativas por 15 minutos por IP — proteção contra brute-force */
export const authRateLimit = rateLimiter({
  limit: 10,
  windowSeconds: 900,
  message: "Muitas tentativas de login. Aguarde 15 minutos.",
  keyFn: (c) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      ?? c.req.header("x-real-ip")
      ?? "unknown";
    return `rl:auth:${ip}`;
  },
});

/** Register: 5 cadastros por hora por IP */
export const registerRateLimit = rateLimiter({
  limit: 5,
  windowSeconds: 3600,
  message: "Muitos cadastros deste IP. Aguarde 1 hora.",
  keyFn: (c) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      ?? c.req.header("x-real-ip")
      ?? "unknown";
    return `rl:register:${ip}`;
  },
});

/** Pagamentos: 20 requisições por 5 minutos por IP */
export const paymentsRateLimit = rateLimiter({
  limit: 20,
  windowSeconds: 300,
  message: "Muitas requisições de pagamento. Aguarde alguns minutos.",
  keyFn: (c) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      ?? c.req.header("x-real-ip")
      ?? "unknown";
    return `rl:payments:${ip}`;
  },
});

/** Global API: 200 requisições por minuto por IP */
export const globalRateLimit = rateLimiter({
  limit: 200,
  windowSeconds: 60,
  message: "Limite de requisições atingido. Aguarde 1 minuto.",
});
