import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { carsTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

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
    photoUrl: car.photoUrl,
    aiStyledImageUrl: car.aiStyledImageUrl,
    categories: car.categories,
    isPrimary: car.isPrimary,
    createdAt: car.createdAt.toISOString(),
  };
}

router.get("/cars", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const cars = await db.select().from(carsTable).where(eq(carsTable.userId, userId));
  res.json(cars.map(formatCar));
});

router.post("/cars", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { make, model, year, color, photoUrl, categories, isPrimary } = req.body;
  if (!make || !model) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (isPrimary) {
    await db.update(carsTable).set({ isPrimary: false }).where(eq(carsTable.userId, userId));
  }

  const inserted = await db.insert(carsTable).values({
    userId,
    make,
    model,
    year: year || null,
    color: color || null,
    photoUrl: photoUrl || null,
    categories: categories || [],
    isPrimary: isPrimary || false,
  }).returning();

  res.status(201).json(formatCar(inserted[0]));
});

router.put("/cars/:carId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const carId = parseInt(req.params.carId);
  if (isNaN(carId)) {
    res.status(400).json({ error: "Invalid car ID" });
    return;
  }

  const existing = await db.select().from(carsTable).where(and(eq(carsTable.id, carId), eq(carsTable.userId, userId))).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Car not found" });
    return;
  }

  const { make, model, year, color, photoUrl, categories, isPrimary } = req.body;

  if (isPrimary) {
    await db.update(carsTable).set({ isPrimary: false }).where(eq(carsTable.userId, userId));
  }

  const updated = await db.update(carsTable).set({
    make: make || existing[0].make,
    model: model || existing[0].model,
    year: year !== undefined ? year : existing[0].year,
    color: color !== undefined ? color : existing[0].color,
    photoUrl: photoUrl !== undefined ? photoUrl : existing[0].photoUrl,
    categories: categories !== undefined ? categories : existing[0].categories,
    isPrimary: isPrimary !== undefined ? isPrimary : existing[0].isPrimary,
  }).where(eq(carsTable.id, carId)).returning();

  res.json(formatCar(updated[0]));
});

router.delete("/cars/:carId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const carId = parseInt(req.params.carId);
  if (isNaN(carId)) {
    res.status(400).json({ error: "Invalid car ID" });
    return;
  }

  await db.delete(carsTable).where(and(eq(carsTable.id, carId), eq(carsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
