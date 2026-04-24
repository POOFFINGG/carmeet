import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, eventsTable, carsTable, notificationsTable } from "@workspace/db/schema";
import { eq, sql, desc, ilike, or } from "drizzle-orm";
import crypto from "crypto";
import { getBot } from "../bot";

const router: IRouter = Router();

// ── Credentials (set via env vars, defaults for dev) ─────────────────────────
const ADMIN_USERNAME = process.env["ADMIN_USERNAME"] ?? "admin";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "meet2025";

if (!process.env["ADMIN_USERNAME"] || !process.env["ADMIN_PASSWORD"] || !process.env["ADMIN_TOKEN_SECRET"]) {
  console.warn("[SECURITY] Admin credentials are using insecure defaults. Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_TOKEN_SECRET env vars before deploying to production.");
}

// ── Deterministic HMAC token — survives server restarts ──────────────────────
// Token = HMAC-SHA256(username:password, secret). No memory store needed.
function createToken(): string {
  const secret = process.env["ADMIN_TOKEN_SECRET"] ?? "meet-admin-secret-2025";
  return crypto
    .createHmac("sha256", secret)
    .update(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`)
    .digest("hex");
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = createToken();
  try {
    return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
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
  res.json({ token });
});

// ── POST /admin/logout ─────────────────────────────────────────────────────────
router.post("/admin/logout", (_req, res) => {
  // Token is stateless (HMAC) — frontend clears it from sessionStorage
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

  // Notify car owner about rejection
  const [owner] = await db.select({ telegramId: usersTable.telegramId }).from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
  if (owner) {
    await db.insert(notificationsTable).values({
      userId: updated.userId,
      type: "event_cancelled" as const,
      title: "Изображение отклонено",
      message: "Ваше AI-изображение не прошло модерацию. Загрузите новые фотографии автомобиля. Вам предоставлены 3 новые попытки.",
      eventId: null,
    });
    const bot = getBot();
    if (bot) {
      try {
        await bot.api.sendMessage(owner.telegramId, "❌ Ваше AI-изображение не прошло модерацию.\n\nПожалуйста, загрузите новые фотографии автомобиля. Вам предоставлены 3 новые попытки.", {
          reply_markup: {
            inline_keyboard: [[
              { text: "📸 Загрузить новое фото", web_app: { url: `${process.env.MINI_APP_URL ?? "https://auto-meet.ru"}/garage` } },
            ]],
          },
        });
      } catch {}
    }
  }

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
