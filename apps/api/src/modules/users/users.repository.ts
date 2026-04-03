import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export class UsersRepository {
  static async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  static async update(
    id: string,
    data: Partial<Pick<typeof users.$inferInsert, "name" | "phone" | "avatarUrl">>,
  ) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Atualiza apenas o fcmToken — endpoint leve chamado com frequência pelo app
  static async updateFcmToken(id: string, fcmToken: string) {
    await db
      .update(users)
      .set({ fcmToken, updatedAt: new Date() })
      .where(eq(users.id, id));
  }
}
