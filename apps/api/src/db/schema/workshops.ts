import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { professionals } from "./professionals";

export const workshops = pgTable("workshops", {
  id: uuid("id").defaultRandom().primaryKey(),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  openingHours: jsonb("opening_hours"), // { mon: { open: "08:00", close: "18:00" }, ... }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workshopsRelations = relations(workshops, ({ one }) => ({
  professional: one(professionals, {
    fields: [workshops.professionalId],
    references: [professionals.id],
  }),
}));
