import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { AuthService } from "./auth.service";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  authResponseSchema,
  messageResponseSchema,
} from "./auth.schemas";
import { authMiddleware } from "@/middleware/auth.middleware";

const app = new OpenAPIHono();

// ==================== POST /register ====================
const registerRoute = createRoute({
  method: "post",
  path: "/register",
  tags: ["Auth"],
  summary: "Criar conta (cliente ou profissional)",
  request: {
    body: { content: { "application/json": { schema: registerSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: authResponseSchema } },
      description: "Conta criada",
    },
    409: { description: "E-mail ou CPF já cadastrado" },
    422: { description: "Dados inválidos" },
  },
});

app.openapi(registerRoute, async (c) => {
  const input = c.req.valid("json");
  const result = await AuthService.register(input);
  return c.json(result, 201);
});

// ==================== POST /login ====================
const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  summary: "Login com e-mail e senha",
  request: {
    body: { content: { "application/json": { schema: loginSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: authResponseSchema } },
      description: "Login OK",
    },
    401: { description: "Credenciais inválidas" },
  },
});

app.openapi(loginRoute, async (c) => {
  const input = c.req.valid("json");
  const result = await AuthService.login(input);
  return c.json(result);
});

// ==================== POST /refresh ====================
const refreshRoute = createRoute({
  method: "post",
  path: "/refresh",
  tags: ["Auth"],
  summary: "Renovar tokens (access + refresh)",
  request: {
    body: { content: { "application/json": { schema: refreshSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: authResponseSchema } },
      description: "Tokens renovados",
    },
    401: { description: "Refresh token inválido" },
  },
});

app.openapi(refreshRoute, async (c) => {
  const { refreshToken } = c.req.valid("json");
  const result = await AuthService.refresh(refreshToken);
  return c.json(result);
});

// ==================== POST /forgot-password ====================
const forgotPasswordRoute = createRoute({
  method: "post",
  path: "/forgot-password",
  tags: ["Auth"],
  summary: "Solicitar recuperação de senha",
  request: {
    body: {
      content: { "application/json": { schema: forgotPasswordSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Solicitação processada",
    },
  },
});

app.openapi(forgotPasswordRoute, async (c) => {
  const input = c.req.valid("json");
  const result = await AuthService.forgotPassword(input);
  return c.json(result);
});

// ==================== POST /reset-password ====================
const resetPasswordRoute = createRoute({
  method: "post",
  path: "/reset-password",
  tags: ["Auth"],
  summary: "Redefinir senha com token de recuperação",
  request: {
    body: {
      content: { "application/json": { schema: resetPasswordSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Senha alterada",
    },
    400: { description: "Token inválido ou expirado" },
  },
});

app.openapi(resetPasswordRoute, async (c) => {
  const input = c.req.valid("json");
  const result = await AuthService.resetPassword(input);
  return c.json(result);
});

// ==================== POST /logout ====================
const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  summary: "Logout (invalida refresh token)",
  middleware: [authMiddleware],
  responses: {
    200: {
      content: { "application/json": { schema: messageResponseSchema } },
      description: "Logout OK",
    },
  },
});

app.openapi(logoutRoute, async (c) => {
  const userId = c.get("userId");
  await AuthService.logout(userId);
  return c.json({ message: "Logout realizado com sucesso" });
});

export default app;
