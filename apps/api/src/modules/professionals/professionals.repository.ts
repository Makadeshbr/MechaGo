import { db } from "@/db";
import { professionals } from "@/db/schema";
import { eq } from "drizzle-orm";

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
}
