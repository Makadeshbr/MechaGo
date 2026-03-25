import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { isNull } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "car",
  "moto",
  "suv",
  "truck",
]);

export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: vehicleTypeEnum("type").notNull(),
  plate: varchar("plate", { length: 10 }).notNull(),
  brand: varchar("brand", { length: 50 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: integer("year").notNull(),
  color: varchar("color", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Index parcial: garante unicidade de placa apenas entre registros ativos
// Veículos soft-deleted (deletedAt != null) não participam da constraint,
// permitindo re-cadastro legítimo de placas após remoção
export const vehiclesActivePlateIdx = uniqueIndex("vehicles_active_plate_idx")
  .on(vehicles.plate)
  .where(isNull(vehicles.deletedAt));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  user: one(users, { fields: [vehicles.userId], references: [users.id] }),
}));
