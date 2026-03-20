import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["viewer", "participant", "organizer"] }).notNull().default("viewer"),
  organizationName: text("organization_name"),
  contactLink: text("contact_link"),
  adminContact: text("admin_contact"),
  viewerSilhouette: text("viewer_silhouette", { enum: ["bicycle", "scooter", "skateboard", "cart"] }),
  interestCategories: text("interest_categories").array().notNull().default([]),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
