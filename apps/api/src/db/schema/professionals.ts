import {
  pgTable,
  uuid,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { vehicleTypeEnum } from "./vehicles";

export const professionalTypeEnum = pgEnum("professional_type", [
  "mechanic_mobile",
  "mechanic_workshop",
  "tire_repair",
  "tow_truck",
]);

// Especialidades validadas no nível do banco (pgEnum array)
export const specialtyEnum = pgEnum("specialty", [
  "car_general",
  "moto",
  "diesel_truck",
  "electronic_injection",
  "suspension",
  "brakes",
  "air_conditioning",
  "transmission",
]);

export const scheduleTypeEnum = pgEnum("schedule_type", [
  "24h",
  "daytime",
  "nighttime",
  "custom",
]);

export const professionals = pgTable("professionals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  type: professionalTypeEnum("type").notNull(),
  // Arrays de pgEnum — validação no nível do banco
  specialties: specialtyEnum("specialties").array().notNull().default([]),
  vehicleTypesServed: vehicleTypeEnum("vehicle_types_served")
    .array()
    .notNull()
    .default([]),
  hasWorkshop: boolean("has_workshop").default(false).notNull(),
  scheduleType: scheduleTypeEnum("schedule_type").notNull().default("24h"),
  customSchedule: jsonb("custom_schedule"), // { mon: { open: "08:00", close: "18:00" } }
  radiusKm: integer("radius_km").notNull().default(10),
  // Localização: lat/lng como decimal (queries PostGIS via raw SQL com ST_MakePoint)
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isOnline: boolean("is_online").default(false).notNull(),
  isFounder: boolean("is_founder").default(false).notNull(),
  commissionRate: decimal("commission_rate", { precision: 4, scale: 2 })
    .default("0.00")
    .notNull(),
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 })
    .default("100.00")
    .notNull(),
  cancellationsThisMonth: integer("cancellations_this_month")
    .default(0)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const professionalsRelations = relations(professionals, ({ one }) => ({
  user: one(users, { fields: [professionals.userId], references: [users.id] }),
}));
