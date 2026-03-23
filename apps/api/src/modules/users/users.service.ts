import { UsersRepository } from "./users.repository";
import { UpdateProfileInput, UserProfile } from "./users.schemas";
import { AppError } from "@/utils/errors";

// Campos que NUNCA devem ser expostos na resposta
// passwordHash é o principal — vazá-lo seria uma falha de segurança crítica
function sanitizeUser(user: Record<string, unknown>): UserProfile {
  return {
    id: user.id as string,
    name: user.name as string,
    email: user.email as string,
    phone: user.phone as string,
    type: user.type as UserProfile["type"],
    avatarUrl: (user.avatarUrl as string) ?? null,
    cpfCnpj: user.cpfCnpj as string,
    rating: (user.rating as string) ?? null,
    totalReviews: (user.totalReviews as number) ?? null,
    isVerified: user.isVerified as boolean,
    createdAt: (user.createdAt as Date).toISOString(),
  };
}

export class UsersService {
  // ==================== GET /me ====================
  static async getProfile(userId: string): Promise<UserProfile> {
    const user = await UsersRepository.findById(userId);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", "Usuário não encontrado", 404);
    }

    return sanitizeUser(user);
  }

  // ==================== PATCH /me ====================
  static async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<UserProfile> {
    const user = await UsersRepository.findById(userId);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", "Usuário não encontrado", 404);
    }

    // Filtra campos undefined para não sobrescrever com null
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;

    // Se nenhum campo foi enviado, retorna o perfil atual
    if (Object.keys(updateData).length === 0) {
      return sanitizeUser(user);
    }

    const updated = await UsersRepository.update(userId, updateData);
    return sanitizeUser(updated);
  }
}
