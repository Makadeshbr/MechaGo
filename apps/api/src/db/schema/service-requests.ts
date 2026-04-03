import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { vehicles } from "./vehicles";
import { professionals } from "./professionals";

export const problemTypeEnum = pgEnum("problem_type", [
  "tire",
  "battery",
  "electric",
  "overheat",
  "fuel",
  "other",
]);

export const complexityEnum = pgEnum("complexity", [
  "simple",
  "medium",
  "complex",
]);
export const contextEnum = pgEnum("context", ["urban", "highway"]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "matching",
  "waiting_queue",
  "accepted",
  "professional_enroute",
  "professional_arrived",
  "diagnosing",
  "resolved",
  "escalated",
  "tow_requested",
  "tow_enroute",
  "delivered",
  "completed",
  "cancelled_client",
  "cancelled_professional",
]);

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => users.id),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  problemType: problemTypeEnum("problem_type").notNull(),
  complexity: complexityEnum("complexity").notNull(),
  context: contextEnum("context").notNull(),
  status: requestStatusEnum("status").notNull().default("pending"),
  // Localização do cliente
  clientLatitude: decimal("client_latitude", {
    precision: 10,
    scale: 7,
  }).notNull(),
  clientLongitude: decimal("client_longitude", {
    precision: 10,
    scale: 7,
  }).notNull(),
  address: text("address"),
  cityName: text("city_name"),
  roadwayName: text("roadway_name"),
  roadwayPhone: text("roadway_phone"),
  // Rastreamento Profissional
  professionalLatitude: decimal("professional_latitude", { precision: 10, scale: 7 }),
  professionalLongitude: decimal("professional_longitude", { precision: 10, scale: 7 }),
  distanceKm: decimal("distance_km", { precision: 10, scale: 2 }),
  estimatedArrivalMinutes: integer("estimated_arrival_minutes"),
  // Triagem
  triageAnswers: jsonb("triage_answers"),
  // Preços
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  priceJustification: text("price_justification"), // Obrigatório se fora de ±25%
  diagnosticFee: decimal("diagnostic_fee", {
    precision: 10,
    scale: 2,
  }).notNull(),
  // Diagnóstico
  diagnosis: text("diagnosis"),
  diagnosisPhotoUrl: text("diagnosis_photo_url"),
  // Conclusão
  completionPhotoUrl: text("completion_photo_url"), // OBRIGATÓRIA para encerrar
  resolvedOnSite: boolean("resolved_on_site"),
  // Escalada
  escalationDestination: text("escalation_destination"),
  // Cancelamento
  cancellationReason: text("cancellation_reason"),
  cancelledBy: varchar("cancelled_by", { length: 20 }),
  cancelledAt: timestamp("cancelled_at"),
  // Timestamps do fluxo
  matchedAt: timestamp("matched_at"),
  arrivedAt: timestamp("arrived_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceRequestsRelations = relations(
  serviceRequests,
  ({ one }) => ({
    client: one(users, {
      fields: [serviceRequests.clientId],
      references: [users.id],
    }),
    vehicle: one(vehicles, {
      fields: [serviceRequests.vehicleId],
      references: [vehicles.id],
    }),
    professional: one(professionals, {
      fields: [serviceRequests.professionalId],
      references: [professionals.id],
    }),
  }),
);
