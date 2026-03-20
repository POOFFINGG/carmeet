import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

async function getUserFromRequest(req: any): Promise<number | null> {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) return null;
  const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  return users.length > 0 ? users[0].id : null;
}

router.get("/users/me/notifications", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(notificationsTable.createdAt);

  res.json(notifications.map(n => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    eventId: n.eventId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  })));
});

export default router;
