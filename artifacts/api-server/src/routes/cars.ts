import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { carsTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { processCarPhoto } from "../services/garage-render";

const router: IRouter = Router();

const MAX_AI_ATTEMPTS = Infinity;

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

// POST /api/cars/:carId/generate — trigger AI generation (real pipeline)
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

  const { sourcePhotos } = req.body;
  const photos: string[] = sourcePhotos || [];
  const firstPhoto = photos.find((p: string) => p && p.length > 0);

  if (!firstPhoto) {
    res.status(400).json({ error: "Загрузите хотя бы одно фото" });
    return;
  }

  // Mark as generating
  await db.update(carsTable).set({
    aiGenerationAttempts: attempts + 1,
    sourcePhotos: photos,
    aiStatus: "generating",
  }).where(eq(carsTable.id, carId));

  try {
    // Generate car + garage as one image via Flux img2img
    const resultUrl = await processCarPhoto(firstPhoto, car.make, car.model, car.color ?? "", attempts + 1);

    // Save result
    const updated = await db.update(carsTable).set({
      aiStyledImageUrl: resultUrl,
      aiStatus: "result_ready",
    }).where(eq(carsTable.id, carId)).returning();

    res.json({
      ...formatCar(updated[0]),
      attemptsUsed: attempts + 1,
      attemptsLeft: MAX_AI_ATTEMPTS - (attempts + 1),
    });
  } catch (err: any) {
    console.error("AI generation failed:", err);
    // Revert status on failure (don't consume the attempt)
    await db.update(carsTable).set({
      aiGenerationAttempts: attempts,
      aiStatus: car.aiStatus ?? "none",
    }).where(eq(carsTable.id, carId));

    res.status(500).json({
      error: "Не удалось обработать фото. Попробуйте другое.",
      details: err.message,
    });
  }
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

// DELETE /api/cars/:carId
router.delete("/cars/:carId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const carId = parseInt(req.params.carId);
  await db.delete(carsTable).where(and(eq(carsTable.id, carId), eq(carsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
