import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, eventsTable, carsTable } from "@workspace/db/schema";
import { eq, sql, desc, ilike, or } from "drizzle-orm";

const router: IRouter = Router();

const ADMIN_IDS = ["1000001", "tg_123456789"];

function isAdmin(req: any): boolean {
  const id = req.headers["x-telegram-id"] as string;
  return ADMIN_IDS.includes(id);
}

function forbidden(res: any) {
  res.status(403).json({ error: "Forbidden" });
}

// ── GET /admin/stats ──────────────────────────────────────────────────────────
router.get("/admin/stats", async (req, res) => {
  if (!isAdmin(req)) { forbidden(res); return; }

  const [userStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      viewers: sql<number>`count(*) filter (where role = 'viewer')::int`,
      participants: sql<number>`count(*) filter (where role = 'participant')::int`,
      organizers: sql<number>`count(*) filter (where role = 'organizer')::int`,
    })
    .from(usersTable);

  const [eventStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      upcoming: sql<number>`count(*) filter (where status = 'upcoming')::int`,
      ongoing: sql<number>`count(*) filter (where status = 'ongoing')::int`,
      finished: sql<number>`count(*) filter (where status = 'finished')::int`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
    })
    .from(eventsTable);

  const [carStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pendingModeration: sql<number>`count(*) filter (where ai_status = 'pending_moderation')::int`,
      approved: sql<number>`count(*) filter (where ai_status = 'approved')::int`,
    })
    .from(carsTable);

  res.json({ users: userStats, events: eventStats, cars: carStats });
});

// ── GET /admin/users ──────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res) => {
  if (!isAdmin(req)) { forbidden(res); return; }

  const search = req.query["search"] as string | undefined;

  let query = db
    .select({
      id: usersTable.id,
      telegramId: usersTable.telegramId,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      role: usersTable.role,
      onboardingComplete: usersTable.onboardingComplete,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .$dynamic();

  if (search) {
    query = query.where(
      or(
        ilike(usersTable.username, `%${search}%`),
        ilike(usersTable.displayName, `%${search}%`),
      )
    );
  }

  const users = await query.limit(100);
  res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

// ── PATCH /admin/users/:userId ────────────────────────────────────────────────
router.patch("/admin/users/:userId", async (req, res) => {
  if (!isAdmin(req)) { forbidden(res); return; }

  const userId = parseInt(req.params.userId);
  const { role } = req.body as { role?: string };

  if (!role || !["viewer", "participant", "organizer"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role: role as any })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: updated.id, role: updated.role });
});

// ── GET /admin/events ─────────────────────────────────────────────────────────
router.get("/admin/events", async (req, res) => {
  if (!isAdmin(req)) { forbidden(res); return; }

  const events = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      category: eventsTable.category,
      date: eventsTable.date,
      location: eventsTable.location,
      status: eventsTable.status,
      maxParticipants: eventsTable.maxParticipants,
      isPrivate: eventsTable.isPrivate,
      createdAt: eventsTable.createdAt,
      organizerUsername: usersTable.username,
      organizerDisplayName: usersTable.displayName,
    })
    .from(eventsTable)
    .innerJoin(usersTable, eq(eventsTable.organizerId, usersTable.id))
    .orderBy(desc(eventsTable.createdAt))
    .limit(200);

  res.json(events.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
});

// ── PATCH /admin/events/:eventId/status ───────────────────────────────────────
router.patch("/admin/events/:eventId/status", async (req, res) => {
  if (!isAdmin(req)) { forbidden(res); return; }

  const eventId = parseInt(req.params.eventId);
  const { status } = req.body as { status?: string };

  const validStatuses = ["upcoming", "ongoing", "finished", "cancelled"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [updated] = await db
    .update(eventsTable)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(eventsTable.id, eventId))
    .returning({ id: eventsTable.id, status: eventsTable.status });

  if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(updated);
});

export default router;
