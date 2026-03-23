import { UsersRepository } from "./users.repository";
import { UpdateProfileInput, UserProfile } from "./users.schemas";
import { AppError } from "@/utils/errors";
import { users } from "@/db/schema";

// Tipo inferido do Drizzle — se uma coluna for renomeada no schema,
// o TypeScript vai apontar o erro aqui em compile time
type UserRow = typeof users.$inferSelect;

// Campos que NUNCA devem ser expostos na resposta
// passwordHash é o principal — vazá-lo seria uma falha de segurança crítica
function sanitizeUser(user: UserRow): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    type: user.type,
    avatarUrl: user.avatarUrl ?? null,
    cpfCnpj: user.cpfCnpj,
    rating: user.rating ?? null,
    totalReviews: user.totalReviews ?? null,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
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

    // Tipo alinhado com o repository — Drizzle valida os campos em compile time
    const updateData: Partial<Pick<typeof users.$inferInsert, "name" | "phone" | "avatarUrl">> = {};
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
