import {
  pgTable,
  uuid,
  varchar,
  decimal,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { serviceRequests } from "./service-requests";
import { professionals } from "./professionals";

export const eventTypeEnum = pgEnum("event_type", [
  "diagnosis",
  "repair",
  "tow",
  "delivery",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

// Cada evento dentro de um service request
// Ex: diagnóstico → reparo (ou escalada → guincho → entrega)
export const serviceEvents = pgTable("service_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  type: eventTypeEnum("type").notNull(),
  status: eventStatusEnum("status").notNull().default("pending"),
  price: decimal("price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceEventsRelations = relations(serviceEvents, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [serviceEvents.serviceRequestId],
    references: [serviceRequests.id],
  }),
  professional: one(professionals, {
    fields: [serviceEvents.professionalId],
    references: [professionals.id],
  }),
}));
