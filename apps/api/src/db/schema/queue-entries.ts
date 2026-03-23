import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { serviceRequests } from "./service-requests";

export const queueEntries = pgTable("queue_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  position: integer("position").notNull(),
  estimatedWaitMinutes: integer("estimated_wait_minutes"),
  alternativesShown: varchar("alternatives_shown", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});
