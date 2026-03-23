import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export class VehiclesRepository {
  static async findById(id: string) {
    return db.query.vehicles.findFirst({
      where: eq(vehicles.id, id),
    });
  }

  static async findByPlate(plate: string) {
    return db.query.vehicles.findFirst({
      where: eq(vehicles.plate, plate),
    });
  }

  static async findByUserId(userId: string) {
    return db.query.vehicles.findMany({
      where: eq(vehicles.userId, userId),
      orderBy: (vehicles, { desc }) => [desc(vehicles.createdAt)],
    });
  }

  static async countByUserId(userId: string): Promise<number> {
    const [result] = await db
      .select({ total: count() })
      .from(vehicles)
      .where(eq(vehicles.userId, userId));
    return result.total;
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
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }
}
