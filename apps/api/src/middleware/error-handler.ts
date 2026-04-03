import { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { AppError } from "@/utils/errors";
import { logger } from "./logger.middleware";

// Error handler global — converte exceções em respostas JSON seguras
// NUNCA expõe stack trace ou detalhes internos para o cliente
export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get("requestId") || "unknown";

  // Erro de validação Zod (input inválido)
  if (err instanceof ZodError) {
    logger.warn({ requestId, errors: err.flatten() }, "Validation error");
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos",
          fields: err.flatten().fieldErrors,
        },
      },
      422,
    );
  }

  // Erro de negócio da aplicação
  if (err instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
      },
      err.userMessage,
    );

    return c.json(
      {
        error: {
          code: err.code,
          message: err.userMessage,
        },
      },
      err.statusCode,
    );
  }

  // Erro inesperado — log completo internamente, resposta genérica para cliente
  console.error("🔥 CRITICAL ERROR:", err); // Log direto no stdout para visibilidade total no Railway
  logger.error(
    {
      requestId,
      error: err.message,
      stack: err.stack,
    },
    "Unhandled error",
  );

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno do servidor",
      },
    },
    500,
  );
};
