import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function formatUser(user: any) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    organizationName: user.organizationName,
    contactLink: user.contactLink,
    adminContact: user.adminContact,
    viewerSilhouette: user.viewerSilhouette,
    interestCategories: user.interestCategories,
    onboardingComplete: user.onboardingComplete,
    notifWeek: user.notifWeek,
    notifDay: user.notifDay,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/users/me", async (req, res) => {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) {
    res.status(401).json({ error: "Missing x-telegram-id header" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  if (users.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(users[0]));
});

router.post("/users/onboarding", async (req, res) => {
  try {
  const { telegramId, username, displayName, avatarUrl, role, viewerSilhouette, organizationName, contactLink, adminContact, interestCategories } = req.body;

  if (!telegramId || !username || !displayName || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);

  let user;
  if (existing.length > 0) {
    const updated = await db
      .update(usersTable)
      .set({
        username,
        displayName,
        avatarUrl: avatarUrl || null,
        role,
        viewerSilhouette: viewerSilhouette || null,
        organizationName: organizationName || null,
        contactLink: contactLink || null,
        adminContact: adminContact || null,
        interestCategories: interestCategories || [],
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.telegramId, telegramId))
      .returning();
    user = updated[0];
  } else {
    const inserted = await db
      .insert(usersTable)
      .values({
        telegramId,
        username,
        displayName,
        avatarUrl: avatarUrl || null,
        role,
        viewerSilhouette: viewerSilhouette || null,
        organizationName: organizationName || null,
        contactLink: contactLink || null,
        adminContact: adminContact || null,
        interestCategories: interestCategories || [],
        onboardingComplete: true,
      })
      .returning();
    user = inserted[0];
  }

  res.json(formatUser(user));
  } catch (err: any) {
    console.error("Onboarding error:", err.message, err.detail ?? "");
    res.status(500).json({ error: err.message });
  }
});

router.patch("/users/me", async (req, res) => {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) {
    res.status(401).json({ error: "Missing x-telegram-id header" });
    return;
  }

  const { role, interestCategories, organizationName, contactLink, adminContact, avatarUrl, displayName, viewerSilhouette, notifWeek, notifDay } = req.body;

  if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.length > 5 * 1024 * 1024) {
    res.status(413).json({ error: "Avatar image too large (max 5MB)" });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (role !== undefined) updateData.role = role;
  if (interestCategories !== undefined) updateData.interestCategories = interestCategories;
  if (organizationName !== undefined) updateData.organizationName = organizationName;
  if (contactLink !== undefined) updateData.contactLink = contactLink;
  if (adminContact !== undefined) updateData.adminContact = adminContact;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
  if (displayName !== undefined) updateData.displayName = displayName;
  if (viewerSilhouette !== undefined) updateData.viewerSilhouette = viewerSilhouette;
  if (notifWeek !== undefined) updateData.notifWeek = notifWeek;
  if (notifDay !== undefined) updateData.notifDay = notifDay;

  const updated = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.telegramId, telegramId))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(updated[0]));
});

// GET /api/users/search?username=xxx
router.get("/users/search", async (req, res) => {
  const { username } = req.query as Record<string, string>;
  if (!username) { res.status(400).json({ error: "username required" }); return; }

  const users = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    avatarUrl: usersTable.avatarUrl,
    role: usersTable.role,
  }).from(usersTable).where(eq(usersTable.username, username)).limit(1);

  if (users.length === 0) { res.status(404).json({ error: "User not found" }); return; }
  res.json(users[0]);
});

router.get("/users/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (users.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(users[0]));
});

export default router;
