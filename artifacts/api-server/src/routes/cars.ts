import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { carsTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const ADMIN_IDS = ["1000001", "tg_123456789"];
const MAX_AI_ATTEMPTS = 3;

async function getUserFromRequest(req: any): Promise<number | null> {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) return null;
  const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  return users.length > 0 ? users[0].id : null;
}

function formatCar(car: any) {
  return {
    id: car.id,
    userId: car.userId,
    make: car.make,
    model: car.model,
    year: car.year,
    color: car.color,
    silhouetteColor: car.silhouetteColor ?? "#e53935",
    photoUrl: car.photoUrl,
    aiStyledImageUrl: car.aiStyledImageUrl,
    aiStatus: car.aiStatus ?? "none",
    aiGenerationAttempts: car.aiGenerationAttempts ?? 0,
    sourcePhotos: car.sourcePhotos ?? [],
    categories: car.categories,
    isPrimary: car.isPrimary,
    createdAt: car.createdAt.toISOString(),
  };
}

// GET /api/cars — get my cars
router.get("/cars", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const cars = await db.select().from(carsTable).where(eq(carsTable.userId, userId));
  res.json(cars.map(formatCar));
});

// POST /api/cars — create car
router.post("/cars", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { make, model, year, color, silhouetteColor, photoUrl, categories, isPrimary } = req.body;
  if (!make || !model) { res.status(400).json({ error: "Missing required fields" }); return; }

  if (isPrimary) {
    await db.update(carsTable).set({ isPrimary: false }).where(eq(carsTable.userId, userId));
  }

  const inserted = await db.insert(carsTable).values({
    userId, make, model,
    year: year || null,
    color: color || null,
    silhouetteColor: silhouetteColor || "#e53935",
    photoUrl: photoUrl || null,
    categories: categories || [],
    isPrimary: isPrimary || false,
    aiStatus: "none",
    aiGenerationAttempts: 0,
    sourcePhotos: [],
  }).returning();

  res.status(201).json(formatCar(inserted[0]));
});

// PUT /api/cars/:carId — update car
router.put("/cars/:carId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const carId = parseInt(req.params.carId);
  if (isNaN(carId)) { res.status(400).json({ error: "Invalid car ID" }); return; }

  const existing = await db.select().from(carsTable).where(and(eq(carsTable.id, carId), eq(carsTable.userId, userId))).limit(1);
  if (existing.length === 0) { res.status(404).json({ error: "Car not found" }); return; }

  const { make, model, year, color, silhouetteColor, photoUrl, categories, isPrimary } = req.body;

  if (isPrimary) {
    await db.update(carsTable).set({ isPrimary: false }).where(eq(carsTable.userId, userId));
  }

  const updated = await db.update(carsTable).set({
    make: make || existing[0].make,
    model: model || existing[0].model,
    year: year !== undefined ? year : existing[0].year,
    color: color !== undefined ? color : existing[0].color,
    silhouetteColor: silhouetteColor !== undefined ? silhouetteColor : existing[0].silhouetteColor,
    photoUrl: photoUrl !== undefined ? photoUrl : existing[0].photoUrl,
    categories: categories !== undefined ? categories : existing[0].categories,
    isPrimary: isPrimary !== undefined ? isPrimary : existing[0].isPrimary,
  }).where(eq(carsTable.id, carId)).returning();

  res.json(formatCar(updated[0]));
});

// POST /api/cars/:carId/generate — trigger AI generation (mocked)
router.post("/cars/:carId/generate", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const carId = parseInt(req.params.carId);
  const existing = await db.select().from(carsTable).where(and(eq(carsTable.id, carId), eq(carsTable.userId, userId))).limit(1);
  if (existing.length === 0) { res.status(404).json({ error: "Car not found" }); return; }

  const car = existing[0];
  const attempts = (car.aiGenerationAttempts ?? 0);

  if (attempts >= MAX_AI_ATTEMPTS) {
    res.status(400).json({ error: "Попытки генерации исчерпаны", attemptsLeft: 0 });
    return;
  }

  // Save source photos from request
  const { sourcePhotos } = req.body;

  // Increment attempt count and store source photos
  await db.update(carsTable).set({
    aiGenerationAttempts: attempts + 1,
    sourcePhotos: sourcePhotos || car.sourcePhotos,
    aiStatus: "generating",
  }).where(eq(carsTable.id, carId));

  // In production this would call an AI API. For now we return a mock result after a short delay.
  // The generated image URL is stored after calling the AI API.
  // We return the current attempt count and a "processing" status.
  res.json({
    attemptsUsed: attempts + 1,
    attemptsLeft: MAX_AI_ATTEMPTS - (attempts + 1),
    status: "processing",
    carId,
  });
});

// POST /api/cars/:carId/ai-result — store the AI result (called by client after mock generation)
router.post("/cars/:carId/ai-result", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const carId = parseInt(req.params.carId);
  const existing = await db.select().from(carsTable).where(and(eq(carsTable.id, carId), eq(carsTable.userId, userId))).limit(1);
  if (existing.length === 0) { res.status(404).json({ error: "Car not found" }); return; }

  const { aiStyledImageUrl } = req.body;
  const updated = await db.update(carsTable).set({
    aiStyledImageUrl: aiStyledImageUrl || null,
    aiStatus: "result_ready",
  }).where(eq(carsTable.id, carId)).returning();

  res.json(formatCar(updated[0]));
});

// POST /api/cars/:carId/accept — user accepts generated image → sends to moderation
router.post("/cars/:carId/accept", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const carId = parseInt(req.params.carId);
  const existing = await db.select().from(carsTable).where(and(eq(carsTable.id, carId), eq(carsTable.userId, userId))).limit(1);
  if (existing.length === 0) { res.status(404).json({ error: "Car not found" }); return; }

  const updated = await db.update(carsTable).set({
    aiStatus: "pending_moderation",
  }).where(eq(carsTable.id, carId)).returning();

  res.json(formatCar(updated[0]));
});

// POST /api/cars/:carId/use-silhouette — discard AI, use silhouette
router.post("/cars/:carId/use-silhouette", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const carId = parseInt(req.params.carId);
  const existing = await db.select().from(carsTable).where(and(eq(carsTable.id, carId), eq(carsTable.userId, userId))).limit(1);
  if (existing.length === 0) { res.status(404).json({ error: "Car not found" }); return; }

  const { silhouetteColor } = req.body;
  const updated = await db.update(carsTable).set({
    aiStyledImageUrl: null,
    aiStatus: "none",
    silhouetteColor: silhouetteColor || "#e53935",
  }).where(eq(carsTable.id, carId)).returning();

  res.json(formatCar(updated[0]));
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────

// GET /api/admin/moderation — list cars pending moderation
router.get("/admin/moderation", async (req, res) => {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!ADMIN_IDS.includes(telegramId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const cars = await db
    .select({
      car: carsTable,
      username: usersTable.username,
      displayName: usersTable.displayName,
    })
    .from(carsTable)
    .innerJoin(usersTable, eq(carsTable.userId, usersTable.id))
    .where(eq(carsTable.aiStatus, "pending_moderation"));

  res.json(cars.map(row => ({
    ...formatCar(row.car),
    username: row.username,
    displayName: row.displayName,
  })));
});

// POST /api/admin/moderation/:carId/approve
router.post("/admin/moderation/:carId/approve", async (req, res) => {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!ADMIN_IDS.includes(telegramId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const carId = parseInt(req.params.carId);
  const updated = await db.update(carsTable).set({ aiStatus: "approved" }).where(eq(carsTable.id, carId)).returning();
  if (updated.length === 0) { res.status(404).json({ error: "Car not found" }); return; }
  res.json(formatCar(updated[0]));
});

// POST /api/admin/moderation/:carId/reject
router.post("/admin/moderation/:carId/reject", async (req, res) => {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!ADMIN_IDS.includes(telegramId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const carId = parseInt(req.params.carId);
  // Reset attempts to allow user to try again
  const updated = await db.update(carsTable).set({
    aiStatus: "rejected",
    aiStyledImageUrl: null,
    aiGenerationAttempts: 0,
  }).where(eq(carsTable.id, carId)).returning();
  if (updated.length === 0) { res.status(404).json({ error: "Car not found" }); return; }
  res.json(formatCar(updated[0]));
});

// DELETE /api/cars/:carId
router.delete("/cars/:carId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const carId = parseInt(req.params.carId);
  await db.delete(carsTable).where(and(eq(carsTable.id, carId), eq(carsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
