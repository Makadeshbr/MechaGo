import { MiddlewareHandler } from "hono";
import { verifyAccessToken } from "@/utils/crypto";
import { AppError } from "@/utils/errors";

// Middleware de autenticação via JWT
// Extrai o token do header Authorization: Bearer <token>
// Injeta userId e userType no context do Hono
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError(
      "UNAUTHORIZED",
      "Token de autenticação não fornecido",
      401,
    );
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const payload = await verifyAccessToken(token);

    // Injeta no context — disponível em c.get("userId") nas rotas
    c.set("userId", payload.userId);
    c.set("userType", payload.type);
  } catch {
    throw new AppError("INVALID_TOKEN", "Token inválido ou expirado", 401);
  }

  await next();
};

// Middleware que exige tipo específico de usuário
export function requireType(...types: string[]): MiddlewareHandler {
  return async (c, next) => {
    const userType = c.get("userType");
    if (!types.includes(userType)) {
      throw new AppError(
        "FORBIDDEN",
        "Acesso negado para este tipo de conta",
        403,
      );
    }
    await next();
  };
}
