import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export class AuthRepository {
  static async findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  static async findByCpfCnpj(cpfCnpj: string) {
    return db.query.users.findFirst({
      where: eq(users.cpfCnpj, cpfCnpj),
    });
  }

  static async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  static async create(data: typeof users.$inferInsert) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  static async updatePassword(userId: string, passwordHash: string) {
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
