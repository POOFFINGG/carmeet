import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { eventsTable, usersTable, applicationsTable } from "@workspace/db/schema";
import { eq, and, ilike } from "drizzle-orm";

const router: IRouter = Router();

async function getUserFromRequest(req: any): Promise<number | null> {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) return null;
  const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  return users.length > 0 ? users[0].id : null;
}

function formatEvent(e: any, organizerName: string, organizerContact: string | null, applicationsCount: number, viewersCount: number) {
  return {
    ...e,
    organizerName: organizerName || "Unknown",
    organizerContact: organizerContact || null,
    applicationsCount,
    viewersCount,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  };
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
      autoAccept: eventsTable.autoAccept,
      priceParticipants: eventsTable.priceParticipants,
      priceViewers: eventsTable.priceViewers,
      organizerLink: eventsTable.organizerLink,
      coverImageUrl: eventsTable.coverImageUrl,
      status: eventsTable.status,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id));

  const conditions = [];
  if (category) conditions.push(eq(eventsTable.category, category as any));
  if (search) conditions.push(ilike(eventsTable.title, `%${search}%`));

  const events = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(eventsTable.date)
    : await query.orderBy(eventsTable.date);

  const result = await Promise.all(events.map(async (e) => {
    const apps = await db
      .select({ type: applicationsTable.type, status: applicationsTable.status })
      .from(applicationsTable)
      .where(and(eq(applicationsTable.eventId, e.id), eq(applicationsTable.status, "approved")));
    return formatEvent(e, e.organizerName || "Unknown", e.organizerContact, apps.filter(a => a.type === "participant").length, apps.filter(a => a.type === "viewer").length);
  }));

  res.json(result);
});

router.post("/events", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { title, description, category, subcategories, date, endDate, location, lat, lng, maxParticipants, isPrivate, autoAccept, priceParticipants, priceViewers, organizerLink, coverImageUrl } = req.body;

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
    isPrivate: isPrivate ?? false,
    autoAccept: autoAccept ?? false,
    priceParticipants: priceParticipants || null,
    priceViewers: priceViewers || null,
    organizerLink: organizerLink || null,
    coverImageUrl: coverImageUrl || null,
  }).returning();

  const event = inserted[0];
  const organizer = await db.select({ displayName: usersTable.displayName, contactLink: usersTable.contactLink }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  res.status(201).json(formatEvent(event, organizer[0]?.displayName || "Unknown", organizer[0]?.contactLink || null, 0, 0));
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
      autoAccept: eventsTable.autoAccept,
      priceParticipants: eventsTable.priceParticipants,
      priceViewers: eventsTable.priceViewers,
      organizerLink: eventsTable.organizerLink,
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
  const apps = await db
    .select({ type: applicationsTable.type, status: applicationsTable.status })
    .from(applicationsTable)
    .where(and(eq(applicationsTable.eventId, eventId), eq(applicationsTable.status, "approved")));

  res.json(formatEvent(e, e.organizerName || "Unknown", e.organizerContact, apps.filter(a => a.type === "participant").length, apps.filter(a => a.type === "viewer").length));
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

  const { title, description, category, subcategories, date, endDate, location, lat, lng, maxParticipants, isPrivate, autoAccept, priceParticipants, priceViewers, organizerLink, coverImageUrl } = req.body;

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
      autoAccept: autoAccept !== undefined ? autoAccept : existing[0].autoAccept,
      priceParticipants: priceParticipants !== undefined ? priceParticipants : existing[0].priceParticipants,
      priceViewers: priceViewers !== undefined ? priceViewers : existing[0].priceViewers,
      organizerLink: organizerLink !== undefined ? organizerLink : existing[0].organizerLink,
      coverImageUrl: coverImageUrl !== undefined ? coverImageUrl : existing[0].coverImageUrl,
      updatedAt: new Date(),
    })
    .where(eq(eventsTable.id, eventId))
    .returning();

  const e = updated[0];
  const organizer = await db.select({ displayName: usersTable.displayName, contactLink: usersTable.contactLink }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const apps = await db
    .select({ type: applicationsTable.type, status: applicationsTable.status })
    .from(applicationsTable)
    .where(and(eq(applicationsTable.eventId, eventId), eq(applicationsTable.status, "approved")));

  res.json(formatEvent(e, organizer[0]?.displayName || "Unknown", organizer[0]?.contactLink || null, apps.filter(a => a.type === "participant").length, apps.filter(a => a.type === "viewer").length));
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
