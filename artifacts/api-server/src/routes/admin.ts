import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, eventsTable, carsTable } from "@workspace/db/schema";
import { eq, sql, desc, ilike, or } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

// ── Credentials (set via env vars, defaults for dev) ─────────────────────────
const ADMIN_USERNAME = process.env["ADMIN_USERNAME"] ?? "admin";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "meet2025";

// ── In-memory session store (token → expiry timestamp) ────────────────────────
const sessions = new Map<string, number>();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function createToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const exp = sessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) { sessions.delete(token); return false; }
  return true;
}

function forbidden(res: any) {
  res.status(403).json({ error: "Forbidden" });
}

function guard(req: any, res: any): boolean {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (!isValidToken(token)) { forbidden(res); return false; }
  return true;
}

// ── POST /admin/login ─────────────────────────────────────────────────────────
router.post("/admin/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = createToken();
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  res.json({ token });
});

// ── POST /admin/logout ────────────────────────────────────────────────────────
router.post("/admin/logout", (req, res) => {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

// ── GET /admin/stats ──────────────────────────────────────────────────────────
router.get("/admin/stats", async (req, res) => {
  if (!guard(req, res)) return;

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

// ── GET /admin/moderation ─────────────────────────────────────────────────────
router.get("/admin/moderation", async (req, res) => {
  if (!guard(req, res)) return;

  const cars = await db
    .select({
      car: carsTable,
      username: usersTable.username,
      displayName: usersTable.displayName,
    })
    .from(carsTable)
    .innerJoin(usersTable, eq(carsTable.userId, usersTable.id))
    .where(eq(carsTable.aiStatus, "pending_moderation"));

  const formatCar = (row: any) => ({
    id: row.car.id,
    make: row.car.make,
    model: row.car.model,
    year: row.car.year,
    aiStyledImageUrl: row.car.aiStyledImageUrl,
    sourcePhotos: row.car.sourcePhotos ?? [],
    aiStatus: row.car.aiStatus,
    username: row.username,
    displayName: row.displayName,
  });

  res.json(cars.map(formatCar));
});

// ── POST /admin/moderation/:carId/approve ─────────────────────────────────────
router.post("/admin/moderation/:carId/approve", async (req, res) => {
  if (!guard(req, res)) return;
  const carId = parseInt(req.params.carId);
  const [updated] = await db.update(carsTable).set({ aiStatus: "approved" })
    .where(eq(carsTable.id, carId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: updated.id, aiStatus: updated.aiStatus });
});

// ── POST /admin/moderation/:carId/reject ──────────────────────────────────────
router.post("/admin/moderation/:carId/reject", async (req, res) => {
  if (!guard(req, res)) return;
  const carId = parseInt(req.params.carId);
  const [updated] = await db.update(carsTable).set({
    aiStatus: "rejected",
    aiStyledImageUrl: null,
    aiGenerationAttempts: 0,
  }).where(eq(carsTable.id, carId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: updated.id, aiStatus: updated.aiStatus });
});

// ── GET /admin/users ──────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res) => {
  if (!guard(req, res)) return;

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
      or(ilike(usersTable.username, `%${search}%`), ilike(usersTable.displayName, `%${search}%`))
    );
  }

  const users = await query.limit(100);
  res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

// ── PATCH /admin/users/:userId ────────────────────────────────────────────────
router.patch("/admin/users/:userId", async (req, res) => {
  if (!guard(req, res)) return;
  const userId = parseInt(req.params.userId);
  const { role } = req.body as { role?: string };

  if (!role || !["viewer", "participant", "organizer"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [updated] = await db.update(usersTable).set({ role: role as any })
    .where(eq(usersTable.id, userId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: updated.id, role: updated.role });
});

// ── GET /admin/events ─────────────────────────────────────────────────────────
router.get("/admin/events", async (req, res) => {
  if (!guard(req, res)) return;

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
  if (!guard(req, res)) return;
  const eventId = parseInt(req.params.eventId);
  const { status } = req.body as { status?: string };

  const validStatuses = ["upcoming", "ongoing", "finished", "cancelled"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [updated] = await db.update(eventsTable)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(eventsTable.id, eventId))
    .returning({ id: eventsTable.id, status: eventsTable.status });

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

export default router;
