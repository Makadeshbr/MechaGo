import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";

export const priceTables = pgTable("price_tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceType: varchar("service_type", { length: 30 }).notNull(),
  vehicleType: varchar("vehicle_type", { length: 20 }).notNull(),
  minPrice: decimal("min_price", { precision: 10, scale: 2 }).notNull(),
  maxPrice: decimal("max_price", { precision: 10, scale: 2 }).notNull(),
  region: varchar("region", { length: 100 }).default("national"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
