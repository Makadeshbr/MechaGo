import { db } from "@/db";
import { payments } from "@/db/schema/payments";
import { eq } from "drizzle-orm";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type SelectPayment = InferSelectModel<typeof payments>;
export type InsertPayment = InferInsertModel<typeof payments>;

export class PaymentsRepository {
  static async create(data: InsertPayment): Promise<SelectPayment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  static async findById(id: string): Promise<SelectPayment | null> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return payment ?? null;
  }

  static async findByServiceRequestId(serviceRequestId: string): Promise<SelectPayment[]> {
    return db.select().from(payments).where(eq(payments.serviceRequestId, serviceRequestId));
  }

  static async findByGatewayId(gatewayId: string): Promise<SelectPayment | null> {
    const [payment] = await db.select().from(payments).where(eq(payments.gatewayId, gatewayId)).limit(1);
    return payment ?? null;
  }

  static async update(id: string, data: Partial<InsertPayment>): Promise<SelectPayment | null> {
    const [payment] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
    return payment ?? null;
  }
}
