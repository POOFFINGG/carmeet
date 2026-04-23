import type { Request } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getTelegramUserFromInitData } from "./telegram-auth";

export async function getUserIdFromRequest(req: Request): Promise<number | null> {
  const botToken = process.env.BOT_TOKEN ?? "";

  // Try initData validation first (production)
  const initData = req.headers["x-telegram-init-data"] as string;
  if (initData && botToken) {
    const tgUser = getTelegramUserFromInitData(initData, botToken);
    if (tgUser) {
      const users = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.telegramId, tgUser.id))
        .limit(1);
      if (users.length > 0) return users[0].id;
    }
  }

  // Fallback: x-telegram-id header (dev / old clients)
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) return null;
  const users = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);
  return users.length > 0 ? users[0].id : null;
}
