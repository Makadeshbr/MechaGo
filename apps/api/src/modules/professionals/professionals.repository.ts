import { db } from "@/db";
import { professionals, serviceRequests, users } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";

// Repository do módulo professionals — queries Drizzle tipadas.
// Segue o mesmo padrão de VehiclesRepository: métodos estáticos, sem lógica de negócio.
export class ProfessionalsRepository {
  // Busca profissional pelo userId (1:1 com users)
  static async findByUserId(userId: string) {
    return db.query.professionals.findFirst({
      where: eq(professionals.userId, userId),
    });
  }

  // Busca profissional pelo id primário
  static async findById(id: string) {
    return db.query.professionals.findFirst({
      where: eq(professionals.id, id),
    });
  }

  // Cria o registro de profissional vinculado a um userId existente
  static async create(data: typeof professionals.$inferInsert) {
    const [professional] = await db
      .insert(professionals)
      .values(data)
      .returning();
    return professional;
  }

  // Atualização parcial — apenas campos explicitamente passados
  static async update(
    id: string,
    data: Partial<typeof professionals.$inferInsert>,
  ) {
    const [updated] = await db
      .update(professionals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(professionals.id, id))
      .returning();
    return updated;
  }

  static async getStatsByUserId(userId: string): Promise<{
    totalServices: number;
    averageRating: number;
  } | null> {
    const professional = await db.query.professionals.findFirst({
      where: eq(professionals.userId, userId),
    });

    if (!professional) {
      return null;
    }

    const [serviceStats] = await db
      .select({ totalServices: count(serviceRequests.id) })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.professionalId, professional.id),
          eq(serviceRequests.status, "completed"),
        ),
      );

    const [user] = await db
      .select({ rating: users.rating })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      totalServices: Number(serviceStats?.totalServices ?? 0),
      averageRating: user?.rating ? Number(user.rating) : 0,
    };
  }
}
