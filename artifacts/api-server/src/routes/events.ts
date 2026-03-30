import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { eventsTable, usersTable, applicationsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and, ilike, inArray, sql } from "drizzle-orm";

const router: IRouter = Router();

async function getUserFromRequest(req: any): Promise<number | null> {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) return null;
  const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  return users.length > 0 ? users[0].id : null;
}

const EVENT_SELECT = {
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
  autoAccept: eventsTable.autoAccept,
  priceParticipants: eventsTable.priceParticipants,
  priceViewers: eventsTable.priceViewers,
  organizerLink: eventsTable.organizerLink,
  coverImageUrl: eventsTable.coverImageUrl,
  status: eventsTable.status,
  createdAt: eventsTable.createdAt,
};

// Get participant/viewer counts for a list of event IDs in a single query
async function getCountsForEvents(eventIds: number[]) {
  if (eventIds.length === 0) return {};

  const rows = await db
    .select({
      eventId: applicationsTable.eventId,
      type: applicationsTable.type,
      count: sql<number>`count(*)::int`,
    })
    .from(applicationsTable)
    .where(and(
      inArray(applicationsTable.eventId, eventIds),
      eq(applicationsTable.status, "approved"),
    ))
    .groupBy(applicationsTable.eventId, applicationsTable.type);

  const counts: Record<number, { participants: number; viewers: number }> = {};
  for (const row of rows) {
    if (!counts[row.eventId]) counts[row.eventId] = { participants: 0, viewers: 0 };
    if (row.type === "participant") counts[row.eventId].participants = row.count;
    if (row.type === "viewer") counts[row.eventId].viewers = row.count;
  }
  return counts;
}

function formatEvent(e: any, participantsCount: number, viewersCount: number) {
  return {
    ...e,
    organizerName: e.organizerName || "Unknown",
    organizerContact: e.organizerContact || null,
    applicationsCount: participantsCount,
    viewersCount,
    date: e.date,
    endDate: e.endDate || null,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  };
}

// GET /api/events
router.get("/events", async (req, res) => {
  const { category, search } = req.query as Record<string, string>;

  const conditions: any[] = [];
  if (category) conditions.push(eq(eventsTable.category, category as any));
  if (search) conditions.push(ilike(eventsTable.title, `%${search}%`));

  const query = db
    .select(EVENT_SELECT)
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id))
    .orderBy(eventsTable.date);

  const events = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  const counts = await getCountsForEvents(events.map(e => e.id));

  res.json(events.map(e => {
    const c = counts[e.id] ?? { participants: 0, viewers: 0 };
    return formatEvent(e, c.participants, c.viewers);
  }));
});

// GET /api/users/me/events — organizer's own events
router.get("/users/me/events", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const events = await db
    .select(EVENT_SELECT)
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id))
    .where(eq(eventsTable.organizerId, userId))
    .orderBy(eventsTable.date);

  const counts = await getCountsForEvents(events.map(e => e.id));

  res.json(events.map(e => {
    const c = counts[e.id] ?? { participants: 0, viewers: 0 };
    return formatEvent(e, c.participants, c.viewers);
  }));
});

// GET /api/events/:eventId
router.get("/events/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid event ID" }); return; }

  const [e] = await db
    .select(EVENT_SELECT)
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id))
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (!e) { res.status(404).json({ error: "Event not found" }); return; }

  const counts = await getCountsForEvents([eventId]);
  const c = counts[eventId] ?? { participants: 0, viewers: 0 };

  res.json(formatEvent(e, c.participants, c.viewers));
});

// POST /api/events
router.post("/events", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { title, description, category, subcategories, date, endDate, location, lat, lng, maxParticipants, isPrivate, autoAccept, priceParticipants, priceViewers, organizerLink, coverImageUrl } = req.body;

  if (!title || !category || !date || !location) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [event] = await db.insert(eventsTable).values({
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
    isPrivate: isPrivate ?? false,
    autoAccept: autoAccept ?? false,
    priceParticipants: priceParticipants ?? null,
    priceViewers: priceViewers ?? null,
    organizerLink: organizerLink || null,
    coverImageUrl: coverImageUrl || null,
  }).returning();

  const [organizer] = await db
    .select({ displayName: usersTable.displayName, contactLink: usersTable.contactLink })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  res.status(201).json(formatEvent(
    { ...event, organizerName: organizer?.displayName, organizerContact: organizer?.contactLink },
    0, 0,
  ));
});

// PUT /api/events/:eventId
router.put("/events/:eventId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid event ID" }); return; }

  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Event not found" }); return; }
  if (existing.organizerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { title, description, category, subcategories, date, endDate, location, lat, lng, maxParticipants, isPrivate, autoAccept, priceParticipants, priceViewers, organizerLink, coverImageUrl } = req.body;

  const [updated] = await db
    .update(eventsTable)
    .set({
      title: title || existing.title,
      description: description !== undefined ? description : existing.description,
      category: category || existing.category,
      subcategories: subcategories || existing.subcategories,
      date: date || existing.date,
      endDate: endDate !== undefined ? endDate : existing.endDate,
      location: location || existing.location,
      lat: lat !== undefined ? lat : existing.lat,
      lng: lng !== undefined ? lng : existing.lng,
      maxParticipants: maxParticipants !== undefined ? maxParticipants : existing.maxParticipants,
      isPrivate: isPrivate !== undefined ? isPrivate : existing.isPrivate,
      autoAccept: autoAccept !== undefined ? autoAccept : existing.autoAccept,
      priceParticipants: priceParticipants !== undefined ? priceParticipants : existing.priceParticipants,
      priceViewers: priceViewers !== undefined ? priceViewers : existing.priceViewers,
      organizerLink: organizerLink !== undefined ? organizerLink : existing.organizerLink,
      coverImageUrl: coverImageUrl !== undefined ? coverImageUrl : existing.coverImageUrl,
      updatedAt: new Date(),
    })
    .where(eq(eventsTable.id, eventId))
    .returning();

  const [organizer] = await db
    .select({ displayName: usersTable.displayName, contactLink: usersTable.contactLink })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const counts = await getCountsForEvents([eventId]);
  const c = counts[eventId] ?? { participants: 0, viewers: 0 };

  res.json(formatEvent(
    { ...updated, organizerName: organizer?.displayName, organizerContact: organizer?.contactLink },
    c.participants, c.viewers,
  ));
});

// DELETE /api/events/:eventId — soft delete (cancelled)
router.delete("/events/:eventId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid event ID" }); return; }

  const [existing] = await db.select({ organizerId: eventsTable.organizerId, title: eventsTable.title })
    .from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Event not found" }); return; }
  if (existing.organizerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.update(eventsTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(eventsTable.id, eventId));

  // Notify all approved participants that event is cancelled
  const approvedApps = await db
    .select({ userId: applicationsTable.userId })
    .from(applicationsTable)
    .where(and(eq(applicationsTable.eventId, eventId), eq(applicationsTable.status, "approved")));

  if (approvedApps.length > 0) {
    await db.insert(notificationsTable).values(
      approvedApps.map(a => ({
        userId: a.userId,
        type: "event_cancelled" as const,
        title: "Мероприятие отменено",
        message: `Мероприятие «${existing.title}» было отменено организатором.`,
        eventId,
      })),
    );
  }

  res.json({ success: true });
});

export default router;
