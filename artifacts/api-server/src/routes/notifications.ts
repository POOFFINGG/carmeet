import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

async function getUserFromRequest(req: any): Promise<number | null> {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) return null;
  const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  return users.length > 0 ? users[0].id : null;
}

function formatNotification(n: any) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    eventId: n.eventId,
    read: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

// GET /api/users/me/notifications
router.get("/users/me/notifications", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notifications.map(formatNotification));
});

// PATCH /api/users/me/notifications/:id — mark single as read
router.patch("/users/me/notifications/:id", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const notifId = parseInt(req.params.id);
  if (isNaN(notifId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, notifId), eq(notificationsTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatNotification(updated));
});

// POST /api/users/me/notifications/read-all — mark all as read
router.post("/users/me/notifications/read-all", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  res.json({ success: true });
});

export default router;
