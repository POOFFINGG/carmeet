import { pgTable, text, integer, boolean, timestamp, serial, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category", { enum: ["motorsport", "exhibition", "cruise", "club"] }).notNull(),
  subcategories: text("subcategories").array().notNull().default([]),
  organizerId: integer("organizer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  endDate: text("end_date"),
  location: text("location").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  maxParticipants: integer("max_participants"),
  isPrivate: boolean("is_private").notNull().default(false),
  coverImageUrl: text("cover_image_url"),
  status: text("status", { enum: ["upcoming", "ongoing", "finished", "cancelled"] }).notNull().default("upcoming"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
