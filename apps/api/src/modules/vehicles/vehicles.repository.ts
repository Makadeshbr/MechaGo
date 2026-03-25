import { db } from "@/db";
import { vehicles, serviceRequests } from "@/db/schema";
import { eq, and, count, isNull, notInArray } from "drizzle-orm";

// Status terminais — veículo pode ser deletado se todas as solicitações
// estão nesses status (finalizadas ou canceladas)
const TERMINAL_STATUSES = [
  "completed",
  "delivered",
  "resolved",
  "cancelled_client",
  "cancelled_professional",
] as const;

export class VehiclesRepository {
  static async findById(id: string) {
    return db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, id), isNull(vehicles.deletedAt)),
    });
  }

  static async findByPlate(plate: string) {
    return db.query.vehicles.findFirst({
      where: and(eq(vehicles.plate, plate), isNull(vehicles.deletedAt)),
    });
  }

  static async findByUserId(userId: string) {
    return db.query.vehicles.findMany({
      where: and(eq(vehicles.userId, userId), isNull(vehicles.deletedAt)),
      orderBy: (vehicles, { desc }) => [desc(vehicles.createdAt)],
    });
  }

  static async countByUserId(userId: string): Promise<number> {
    const [result] = await db
      .select({ total: count() })
      .from(vehicles)
      .where(and(eq(vehicles.userId, userId), isNull(vehicles.deletedAt)));
    return result.total;
  }

  /**
   * Verifica se o veículo possui solicitações de serviço ativas.
   * Retorna true se existir ao menos uma service_request com status não-terminal,
   * impedindo o soft-delete para preservar integridade do atendimento em andamento.
   *
   * @param vehicleId - UUID do veículo a verificar
   * @returns true se houver solicitações ativas vinculadas
   */
  static async hasActiveServiceRequests(vehicleId: string): Promise<boolean> {
    const [result] = await db
      .select({ total: count() })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.vehicleId, vehicleId),
          notInArray(serviceRequests.status, [...TERMINAL_STATUSES]),
        ),
      );
    return result.total > 0;
  }

  static async create(data: typeof vehicles.$inferInsert) {
    const [vehicle] = await db.insert(vehicles).values(data).returning();
    return vehicle;
  }

  static async update(
    id: string,
    data: Partial<
      Pick<typeof vehicles.$inferInsert, "type" | "brand" | "model" | "year" | "color">
    >,
  ) {
    const [updated] = await db
      .update(vehicles)
      .set(data)
      .where(eq(vehicles.id, id))
      .returning();
    return updated;
  }

  static async delete(id: string) {
    await db
      .update(vehicles)
      .set({ deletedAt: new Date() })
      .where(eq(vehicles.id, id));
  }
}
