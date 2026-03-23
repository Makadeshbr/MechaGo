// Classe base para erros da aplicação
// Toda exceção de negócio DEVE usar esta classe
// O error-handler converte para resposta JSON segura
export class AppError extends Error {
  constructor(
    public readonly code: string, // Código interno (ex: "VEHICLE_LIMIT")
    public readonly userMessage: string, // Mensagem PT-BR para o cliente
    public readonly statusCode: number = 400,
    public readonly details?: unknown, // Detalhes para log interno (NUNCA enviado ao cliente)
  ) {
    super(userMessage);
    this.name = "AppError";
  }
}

// Erros pré-definidos para reutilização
export const Errors = {
  notFound: (resource: string) =>
    new AppError("NOT_FOUND", `${resource} não encontrado(a)`, 404),

  unauthorized: () =>
    new AppError("UNAUTHORIZED", "Autenticação necessária", 401),

  forbidden: () => new AppError("FORBIDDEN", "Acesso negado", 403),

  conflict: (message: string) => new AppError("CONFLICT", message, 409),

  validation: (message: string) =>
    new AppError("VALIDATION_ERROR", message, 422),

  internal: (details?: unknown) =>
    new AppError("INTERNAL_ERROR", "Erro interno do servidor", 500, details),
};
