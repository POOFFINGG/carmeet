import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { eventsTable } from "./events";
import { carsTable } from "./cars";

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  carId: integer("car_id").references(() => carsTable.id, { onDelete: "set null" }),
  type: text("type", { enum: ["participant", "viewer"] }).notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, createdAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
