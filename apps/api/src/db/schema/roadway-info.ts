import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";

// Informações de concessionárias de rodovias
// Geofence será adicionado via migration raw SQL (PostGIS polygon)
// A query de detecção de rodovia usa ST_Contains(geofence, client_point)
export const roadwayInfo = pgTable("roadway_info", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
  // Bounds simplificados (para uso sem PostGIS geometry nativo no Drizzle)
  boundsMinLat: decimal("bounds_min_lat", { precision: 10, scale: 7 }),
  boundsMaxLat: decimal("bounds_max_lat", { precision: 10, scale: 7 }),
  boundsMinLng: decimal("bounds_min_lng", { precision: 10, scale: 7 }),
  boundsMaxLng: decimal("bounds_max_lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
