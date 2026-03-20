import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { applicationsTable, usersTable, eventsTable, carsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

async function getUserFromRequest(req: any): Promise<number | null> {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) return null;
  const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  return users.length > 0 ? users[0].id : null;
}

async function formatApplication(app: any) {
  const user = await db.select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, app.userId)).limit(1);
  const event = await db.select({ title: eventsTable.title }).from(eventsTable).where(eq(eventsTable.id, app.eventId)).limit(1);
  let car = null;
  if (app.carId) {
    const cars = await db.select({ make: carsTable.make, model: carsTable.model }).from(carsTable).where(eq(carsTable.id, app.carId)).limit(1);
    car = cars[0] || null;
  }

  return {
    id: app.id,
    eventId: app.eventId,
    eventTitle: event[0]?.title || null,
    userId: app.userId,
    userName: user[0]?.displayName || null,
    userAvatarUrl: user[0]?.avatarUrl || null,
    carId: app.carId,
    carMake: car?.make || null,
    carModel: car?.model || null,
    type: app.type,
    status: app.status,
    comment: app.comment,
    createdAt: app.createdAt.toISOString(),
  };
}

router.get("/events/:eventId/applications", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }

  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.eventId, eventId));
  const result = await Promise.all(apps.map(formatApplication));
  res.json(result);
});

router.post("/events/:eventId/applications", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }

  const { carId, type, comment } = req.body;
  if (!type) {
    res.status(400).json({ error: "Missing type field" });
    return;
  }

  const existing = await db.select().from(applicationsTable).where(and(eq(applicationsTable.eventId, eventId), eq(applicationsTable.userId, userId))).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Already applied" });
    return;
  }

  const inserted = await db.insert(applicationsTable).values({
    eventId,
    userId,
    carId: carId || null,
    type,
    comment: comment || null,
  }).returning();

  const result = await formatApplication(inserted[0]);
  res.status(201).json(result);
});

router.put("/events/:eventId/applications/:applicationId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const eventId = parseInt(req.params.eventId);
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(eventId) || isNaN(applicationId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const event = await db.select({ organizerId: eventsTable.organizerId }).from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (event.length === 0) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (event[0].organizerId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { status } = req.body;
  const updated = await db.update(applicationsTable).set({ status }).where(eq(applicationsTable.id, applicationId)).returning();
  if (updated.length === 0) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const result = await formatApplication(updated[0]);
  res.json(result);
});

router.delete("/events/:eventId/applications/:applicationId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(applicationId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(applicationsTable).where(and(eq(applicationsTable.id, applicationId), eq(applicationsTable.userId, userId)));
  res.json({ success: true });
});

router.get("/users/me/applications", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.userId, userId));
  const result = await Promise.all(apps.map(formatApplication));
  res.json(result);
});

export default router;
