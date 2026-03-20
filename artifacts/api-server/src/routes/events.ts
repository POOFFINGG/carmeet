import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { eventsTable, usersTable, applicationsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

const router: IRouter = Router();

async function getUserFromRequest(req: any): Promise<number | null> {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) return null;
  const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  return users.length > 0 ? users[0].id : null;
}

router.get("/events", async (req, res) => {
  const { category, search } = req.query as Record<string, string>;

  let query = db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      category: eventsTable.category,
      subcategories: eventsTable.subcategories,
      organizerId: eventsTable.organizerId,
      organizerName: usersTable.displayName,
      organizerContact: usersTable.contactLink,
      date: eventsTable.date,
      endDate: eventsTable.endDate,
      location: eventsTable.location,
      lat: eventsTable.lat,
      lng: eventsTable.lng,
      maxParticipants: eventsTable.maxParticipants,
      isPrivate: eventsTable.isPrivate,
      coverImageUrl: eventsTable.coverImageUrl,
      status: eventsTable.status,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id));

  const conditions = [];
  if (category) {
    conditions.push(eq(eventsTable.category, category as any));
  }
  if (search) {
    conditions.push(ilike(eventsTable.title, `%${search}%`));
  }

  const events = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(eventsTable.date)
    : await query.orderBy(eventsTable.date);

  const result = await Promise.all(events.map(async (e) => {
    const apps = await db.select({ type: applicationsTable.type }).from(applicationsTable).where(eq(applicationsTable.eventId, e.id));
    const applicationsCount = apps.filter(a => a.type === "participant").length;
    const viewersCount = apps.filter(a => a.type === "viewer").length;
    return {
      ...e,
      organizerName: e.organizerName || "Unknown",
      applicationsCount,
      viewersCount,
      createdAt: e.createdAt.toISOString(),
    };
  }));

  res.json(result);
});

router.post("/events", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { title, description, category, subcategories, date, endDate, location, lat, lng, maxParticipants, isPrivate, coverImageUrl } = req.body;

  if (!title || !category || !date || !location) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const inserted = await db.insert(eventsTable).values({
    title,
    description: description || null,
    category,
    subcategories: subcategories || [],
    organizerId: userId,
    date,
    endDate: endDate || null,
    location,
    lat: lat || null,
    lng: lng || null,
    maxParticipants: maxParticipants || null,
    isPrivate: isPrivate || false,
    coverImageUrl: coverImageUrl || null,
  }).returning();

  const event = inserted[0];
  const organizer = await db.select({ displayName: usersTable.displayName, contactLink: usersTable.contactLink }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  res.status(201).json({
    ...event,
    organizerName: organizer[0]?.displayName || "Unknown",
    organizerContact: organizer[0]?.contactLink || null,
    applicationsCount: 0,
    viewersCount: 0,
    createdAt: event.createdAt.toISOString(),
  });
});

router.get("/events/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }

  const events = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      category: eventsTable.category,
      subcategories: eventsTable.subcategories,
      organizerId: eventsTable.organizerId,
      organizerName: usersTable.displayName,
      organizerContact: usersTable.contactLink,
      date: eventsTable.date,
      endDate: eventsTable.endDate,
      location: eventsTable.location,
      lat: eventsTable.lat,
      lng: eventsTable.lng,
      maxParticipants: eventsTable.maxParticipants,
      isPrivate: eventsTable.isPrivate,
      coverImageUrl: eventsTable.coverImageUrl,
      status: eventsTable.status,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id))
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (events.length === 0) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const e = events[0];
  const apps = await db.select({ type: applicationsTable.type }).from(applicationsTable).where(eq(applicationsTable.eventId, eventId));

  res.json({
    ...e,
    organizerName: e.organizerName || "Unknown",
    applicationsCount: apps.filter(a => a.type === "participant").length,
    viewersCount: apps.filter(a => a.type === "viewer").length,
    createdAt: e.createdAt.toISOString(),
  });
});

router.put("/events/:eventId", async (req, res) => {
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

  const existing = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (existing[0].organizerId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { title, description, category, subcategories, date, endDate, location, lat, lng, maxParticipants, isPrivate, coverImageUrl } = req.body;

  const updated = await db
    .update(eventsTable)
    .set({
      title: title || existing[0].title,
      description: description !== undefined ? description : existing[0].description,
      category: category || existing[0].category,
      subcategories: subcategories || existing[0].subcategories,
      date: date || existing[0].date,
      endDate: endDate !== undefined ? endDate : existing[0].endDate,
      location: location || existing[0].location,
      lat: lat !== undefined ? lat : existing[0].lat,
      lng: lng !== undefined ? lng : existing[0].lng,
      maxParticipants: maxParticipants !== undefined ? maxParticipants : existing[0].maxParticipants,
      isPrivate: isPrivate !== undefined ? isPrivate : existing[0].isPrivate,
      coverImageUrl: coverImageUrl !== undefined ? coverImageUrl : existing[0].coverImageUrl,
      updatedAt: new Date(),
    })
    .where(eq(eventsTable.id, eventId))
    .returning();

  const e = updated[0];
  const organizer = await db.select({ displayName: usersTable.displayName, contactLink: usersTable.contactLink }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const apps = await db.select({ type: applicationsTable.type }).from(applicationsTable).where(eq(applicationsTable.eventId, eventId));

  res.json({
    ...e,
    organizerName: organizer[0]?.displayName || "Unknown",
    organizerContact: organizer[0]?.contactLink || null,
    applicationsCount: apps.filter(a => a.type === "participant").length,
    viewersCount: apps.filter(a => a.type === "viewer").length,
    createdAt: e.createdAt.toISOString(),
  });
});

router.delete("/events/:eventId", async (req, res) => {
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

  const existing = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (existing[0].organizerId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.update(eventsTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(eventsTable.id, eventId));
  res.json({ success: true });
});

export default router;
