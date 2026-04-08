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
    console.warn("⚠️ VALIDATION ERROR:", JSON.stringify(err.flatten(), null, 2));
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
    console.warn(`app_error: ${err.code} - ${err.userMessage}`, err.details || "");
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

  // Body JSON malformado ou ausente — Request.json() lança SyntaxError ao tentar
  // parsear corpo vazio ou inválido. Sem este guard, o cliente receberia 500 genérico
  // e ficaria sem saber o que enviar (cenário real: app Pro chamando /me/online sem body
  // por bug de rede deixava o profissional preso offline).
  if (err instanceof SyntaxError || (err instanceof Error && err.name === "SyntaxError")) {
    logger.warn({ requestId, error: err.message }, "Invalid JSON body");
    return c.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Corpo da requisição inválido ou ausente. Envie JSON válido com Content-Type: application/json.",
        },
      },
      400,
    );
  }

  // Erro inesperado — log completo internamente, resposta genérica para cliente
  console.error("🔥 CRITICAL UNHANDLED ERROR:", err);
  if (err instanceof Error) {
    console.error("Stack:", err.stack);
  }

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
