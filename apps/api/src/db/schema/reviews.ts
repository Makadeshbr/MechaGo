import { pgTable, uuid, integer, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { serviceRequests } from "./service-requests";
import { users } from "./users";

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  toUserId: uuid("to_user_id")
    .notNull()
    .references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  tags: text("tags").array().default([]),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [reviews.serviceRequestId],
    references: [serviceRequests.id],
  }),
  fromUser: one(users, {
    fields: [reviews.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, { fields: [reviews.toUserId], references: [users.id] }),
}));
