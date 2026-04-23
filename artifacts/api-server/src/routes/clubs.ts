import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clubsTable, carsTable, usersTable } from "@workspace/db/schema";
import { eq, or, ilike } from "drizzle-orm";
import { getUserIdFromRequest } from "../lib/auth";

const router: IRouter = Router();

function formatClub(c: any) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    subcategory: c.subcategory,
    logoUrl: c.logoUrl,
    contactLink: c.contactLink,
    membersCount: c.membersCount,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/clubs", async (req, res) => {
  const { category } = req.query as Record<string, string>;
  let clubs;
  if (category) {
    clubs = await db.select().from(clubsTable).where(eq(clubsTable.category, category));
  } else {
    clubs = await db.select().from(clubsTable);
  }
  res.json(clubs.map(formatClub));
});

// GET /api/clubs/recommended — personalized by user's car make + interest categories
router.get("/clubs/recommended", async (req, res) => {
  const userId = await getUserIdFromRequest(req);

  let make: string | null = null;
  let interestCategories: string[] = [];

  if (userId) {
    const user = await db.select({ interestCategories: usersTable.interestCategories })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user[0]) interestCategories = (user[0].interestCategories as string[]) ?? [];

    const car = await db.select({ make: carsTable.make })
      .from(carsTable).where(eq(carsTable.userId, userId)).limit(1);
    if (car[0]) make = car[0].make;
  }

  const all = await db.select().from(clubsTable);

  // Score clubs: higher = better match
  const scored = all.map(club => {
    let score = 0;
    // By car make (highest priority)
    if (make && club.name.toLowerCase().includes(make.toLowerCase())) score += 10;
    if (make && club.subcategory?.toLowerCase().includes(make.toLowerCase())) score += 8;
    // By interest categories
    if (interestCategories.includes(club.category)) score += 5;
    if (club.subcategory && interestCategories.includes(club.subcategory)) score += 3;
    // Universal clubs ("all welcome")
    if (club.subcategory === "all" || club.name.toLowerCase().includes("всех")) score += 1;
    return { club, score };
  });

  scored.sort((a, b) => b.score - a.score);
  res.json(scored.map(s => formatClub(s.club)));
});

export default router;
