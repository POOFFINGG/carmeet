import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const carsTable = pgTable("cars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  color: text("color"),
  photoUrl: text("photo_url"),
  aiStyledImageUrl: text("ai_styled_image_url"),
  categories: text("categories").array().notNull().default([]),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCarSchema = createInsertSchema(carsTable).omit({ id: true, createdAt: true });
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof carsTable.$inferSelect;
