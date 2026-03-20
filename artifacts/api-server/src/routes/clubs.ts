import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clubsTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";

const router: IRouter = Router();

router.get("/clubs", async (req, res) => {
  const { category } = req.query as Record<string, string>;

  let clubs;
  if (category) {
    clubs = await db.select().from(clubsTable).where(eq(clubsTable.category, category));
  } else {
    clubs = await db.select().from(clubsTable);
  }

  res.json(clubs.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    subcategory: c.subcategory,
    logoUrl: c.logoUrl,
    contactLink: c.contactLink,
    membersCount: c.membersCount,
    createdAt: c.createdAt.toISOString(),
  })));
});

export default router;
