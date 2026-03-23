import { randomBytes } from "node:crypto";
import { AuthRepository } from "./auth.repository";
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  AuthResponse,
} from "./auth.schemas";
import { AppError } from "@/utils/errors";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from "@/utils/crypto";
import { redis } from "@/lib/redis";

export class AuthService {
  // ==================== REGISTER ====================
  static async register(input: RegisterInput): Promise<AuthResponse> {
    // Verificar se e-mail já existe
    const existingEmail = await AuthRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new AppError("EMAIL_EXISTS", "Este e-mail já está cadastrado", 409);
    }

    // Verificar se CPF/CNPJ já existe
    const existingCpf = await AuthRepository.findByCpfCnpj(input.cpfCnpj);
    if (existingCpf) {
      throw new AppError("CPF_EXISTS", "Este CPF/CNPJ já está cadastrado", 409);
    }

    // Criar usuário com senha hasheada
    const passwordHash = await hashPassword(input.password);
    const user = await AuthRepository.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      cpfCnpj: input.cpfCnpj,
      type: input.type,
    });

    // Gerar tokens
    const payload: TokenPayload = { userId: user.id, type: user.type };
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(payload),
      generateRefreshToken(payload),
    ]);

    // Armazenar refresh token no Redis (permite invalidação)
    // TTL de 7 dias = 604800 segundos
    await redis.setex(`refresh:${user.id}`, 604800, refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  // ==================== LOGIN ====================
  static async login(input: LoginInput): Promise<AuthResponse> {
    const user = await AuthRepository.findByEmail(input.email);
    if (!user) {
      // Mensagem genérica para não revelar se o email existe
      throw new AppError(
        "INVALID_CREDENTIALS",
        "E-mail ou senha incorretos",
        401,
      );
    }

    if (!user.isActive) {
      throw new AppError(
        "ACCOUNT_DISABLED",
        "Conta desativada. Entre em contato com o suporte.",
        403,
      );
    }

    const validPassword = await verifyPassword(
      user.passwordHash,
      input.password,
    );
    if (!validPassword) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "E-mail ou senha incorretos",
        401,
      );
    }

    const payload: TokenPayload = { userId: user.id, type: user.type };
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(payload),
      generateRefreshToken(payload),
    ]);

    await redis.setex(`refresh:${user.id}`, 604800, refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  // ==================== REFRESH ====================
  static async refresh(refreshTokenInput: string): Promise<AuthResponse> {
    let payload: TokenPayload;

    try {
      payload = await verifyRefreshToken(refreshTokenInput);
    } catch {
      throw new AppError(
        "INVALID_TOKEN",
        "Token de refresh inválido ou expirado",
        401,
      );
    }

    // Verificar se o refresh token ainda é válido no Redis
    // (permite logout/invalidação)
    const storedToken = await redis.get(`refresh:${payload.userId}`);
    if (!storedToken || storedToken !== refreshTokenInput) {
      throw new AppError("TOKEN_REVOKED", "Token de refresh foi revogado", 401);
    }

    const user = await AuthRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new AppError("USER_NOT_FOUND", "Usuário não encontrado", 401);
    }

    // Gerar novo par de tokens (rotation)
    const newPayload: TokenPayload = { userId: user.id, type: user.type };
    const [accessToken, newRefreshToken] = await Promise.all([
      generateAccessToken(newPayload),
      generateRefreshToken(newPayload),
    ]);

    // Atualizar refresh token no Redis
    await redis.setex(`refresh:${user.id}`, 604800, newRefreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
      },
      tokens: { accessToken, refreshToken: newRefreshToken },
    };
  }

  // ==================== FORGOT PASSWORD ====================
  static async forgotPassword(
    input: ForgotPasswordInput,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await AuthRepository.findByEmail(input.email);

    // Sempre retorna sucesso (não revela se o email existe)
    if (!user) {
      return { message: "Se o e-mail existir, enviaremos um link de recuperação" };
    }

    // Gerar token de reset (64 chars hex)
    const resetToken = randomBytes(32).toString("hex");

    // Armazenar no Redis com TTL de 1 hora
    await redis.setex(`reset:${resetToken}`, 3600, user.id);

    // TODO: Em produção, enviar email com link de reset
    // Em dev, retorna o token na resposta para facilitar testes
    return {
      message: "Se o e-mail existir, enviaremos um link de recuperação",
      resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
    };
  }

  // ==================== RESET PASSWORD ====================
  static async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    // Buscar userId pelo token no Redis
    const userId = await redis.get(`reset:${input.token}`);
    if (!userId) {
      throw new AppError(
        "INVALID_RESET_TOKEN",
        "Token de recuperação inválido ou expirado",
        400,
      );
    }

    const user = await AuthRepository.findById(userId);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", "Usuário não encontrado", 404);
    }

    // Atualizar senha
    const passwordHash = await hashPassword(input.newPassword);
    await AuthRepository.updatePassword(userId, passwordHash);

    // Invalidar token de reset (uso único)
    await redis.del(`reset:${input.token}`);

    // Invalidar refresh token (força re-login)
    await redis.del(`refresh:${userId}`);

    return { message: "Senha alterada com sucesso. Faça login novamente." };
  }

  // ==================== LOGOUT ====================
  static async logout(userId: string): Promise<void> {
    // Remove refresh token do Redis, invalidando-o
    await redis.del(`refresh:${userId}`);
  }
}
