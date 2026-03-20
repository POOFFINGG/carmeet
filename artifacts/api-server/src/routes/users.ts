import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

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

  const user = users[0];
  res.json({
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    organizationName: user.organizationName,
    contactLink: user.contactLink,
    viewerSilhouette: user.viewerSilhouette,
    interestCategories: user.interestCategories,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/users/onboarding", async (req, res) => {
  const { telegramId, username, displayName, avatarUrl, role, viewerSilhouette, organizationName, contactLink, interestCategories } = req.body;

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
        interestCategories: interestCategories || [],
        onboardingComplete: true,
      })
      .returning();
    user = inserted[0];
  }

  res.json({
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    organizationName: user.organizationName,
    contactLink: user.contactLink,
    viewerSilhouette: user.viewerSilhouette,
    interestCategories: user.interestCategories,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt.toISOString(),
  });
});

router.patch("/users/me", async (req, res) => {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) {
    res.status(401).json({ error: "Missing x-telegram-id header" });
    return;
  }

  const { role, interestCategories, organizationName, contactLink } = req.body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (role !== undefined) updateData.role = role;
  if (interestCategories !== undefined) updateData.interestCategories = interestCategories;
  if (organizationName !== undefined) updateData.organizationName = organizationName;
  if (contactLink !== undefined) updateData.contactLink = contactLink;

  const updated = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.telegramId, telegramId))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const user = updated[0];
  res.json({
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    organizationName: user.organizationName,
    contactLink: user.contactLink,
    viewerSilhouette: user.viewerSilhouette,
    interestCategories: user.interestCategories,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt.toISOString(),
  });
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

  const user = users[0];
  res.json({
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    organizationName: user.organizationName,
    contactLink: user.contactLink,
    viewerSilhouette: user.viewerSilhouette,
    interestCategories: user.interestCategories,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
