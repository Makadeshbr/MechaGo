import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { serviceRequests } from "./service-requests";

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "captured",
  "refunded",
  "failed",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "pix",
  "credit_card",
  "debit_card",
]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  type: varchar("type", { length: 20 }).notNull(), // "diagnostic_fee" | "service" | "tow"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  gatewayId: varchar("gateway_id", { length: 255 }),
  gatewayStatus: varchar("gateway_status", { length: 50 }),
  professionalAmount: decimal("professional_amount", {
    precision: 10,
    scale: 2,
  }),
  platformAmount: decimal("platform_amount", { precision: 10, scale: 2 }),
  webhookPayload: jsonb("webhook_payload"),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [payments.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));
