import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { applicationsTable, usersTable, eventsTable, carsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

async function getUserFromRequest(req: any): Promise<number | null> {
  const telegramId = req.headers["x-telegram-id"] as string;
  if (!telegramId) return null;
  const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  return users.length > 0 ? users[0].id : null;
}

// Single JOIN query — no N+1
async function getApplicationsWithDetails(where: Parameters<typeof db.select>[0] extends never ? never : any) {
  const rows = await db
    .select({
      id: applicationsTable.id,
      eventId: applicationsTable.eventId,
      userId: applicationsTable.userId,
      carId: applicationsTable.carId,
      type: applicationsTable.type,
      status: applicationsTable.status,
      attendanceStatus: applicationsTable.attendanceStatus,
      comment: applicationsTable.comment,
      createdAt: applicationsTable.createdAt,
      userName: usersTable.displayName,
      userAvatarUrl: usersTable.avatarUrl,
      eventTitle: eventsTable.title,
      carMake: carsTable.make,
      carModel: carsTable.model,
    })
    .from(applicationsTable)
    .innerJoin(usersTable, eq(applicationsTable.userId, usersTable.id))
    .innerJoin(eventsTable, eq(applicationsTable.eventId, eventsTable.id))
    .leftJoin(carsTable, eq(applicationsTable.carId, carsTable.id))
    .where(where);

  return rows.map(r => ({
    id: r.id,
    eventId: r.eventId,
    eventTitle: r.eventTitle,
    userId: r.userId,
    userName: r.userName,
    userAvatarUrl: r.userAvatarUrl,
    carId: r.carId,
    carMake: r.carMake ?? null,
    carModel: r.carModel ?? null,
    type: r.type,
    status: r.status,
    attendanceStatus: r.attendanceStatus ?? "going",
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
  }));
}

async function createNotification(
  userId: number,
  type: "application_approved" | "application_rejected" | "event_reminder" | "new_event" | "event_cancelled",
  title: string,
  message: string,
  eventId?: number,
) {
  await db.insert(notificationsTable).values({ userId, type, title, message, eventId: eventId ?? null });
}

// GET /api/events/:eventId/applications
router.get("/events/:eventId/applications", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid event ID" }); return; }

  const result = await getApplicationsWithDetails(eq(applicationsTable.eventId, eventId));
  res.json(result);
});

// POST /api/events/:eventId/applications — apply or update attendance status
router.post("/events/:eventId/applications", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid event ID" }); return; }

  const { carId, type, attendanceStatus, comment } = req.body;
  if (!type) { res.status(400).json({ error: "Missing type field" }); return; }

  const existing = await db
    .select()
    .from(applicationsTable)
    .where(and(eq(applicationsTable.eventId, eventId), eq(applicationsTable.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing — user changing their attendance status
    const updated = await db
      .update(applicationsTable)
      .set({
        type,
        carId: carId ?? null,
        attendanceStatus: attendanceStatus ?? "going",
        comment: comment ?? null,
      })
      .where(eq(applicationsTable.id, existing[0].id))
      .returning();

    const [result] = await getApplicationsWithDetails(eq(applicationsTable.id, updated[0].id));
    res.json(result);
    return;
  }

  // New application
  const [event] = await db
    .select({ autoAccept: eventsTable.autoAccept, organizerId: eventsTable.organizerId, title: eventsTable.title })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const autoAccept = event.autoAccept ?? false;
  const status = autoAccept ? "approved" : "pending";

  const [inserted] = await db.insert(applicationsTable).values({
    eventId,
    userId,
    carId: carId ?? null,
    type,
    attendanceStatus: attendanceStatus ?? "going",
    status,
    comment: comment ?? null,
  }).returning();

  // Notify organizer about new application (only if not auto-accepted)
  if (!autoAccept) {
    const [applicant] = await db
      .select({ displayName: usersTable.displayName })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    await createNotification(
      event.organizerId,
      "new_event",
      "Новая заявка",
      `${applicant?.displayName ?? "Пользователь"} подал заявку на участие в «${event.title}»`,
      eventId,
    );
  }

  const [result] = await getApplicationsWithDetails(eq(applicationsTable.id, inserted.id));
  res.status(201).json(result);
});

// PUT /api/events/:eventId/applications/:applicationId — organizer approve/reject
router.put("/events/:eventId/applications/:applicationId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const eventId = parseInt(req.params.eventId);
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(eventId) || isNaN(applicationId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [event] = await db
    .select({ organizerId: eventsTable.organizerId, title: eventsTable.title })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const { status, attendanceStatus } = req.body;
  const updateData: any = {};

  if (status && event.organizerId === userId) {
    updateData.status = status;
  }
  if (attendanceStatus) {
    updateData.attendanceStatus = attendanceStatus;
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  // Fetch app before update to compare status
  const [appBefore] = await db
    .select({ userId: applicationsTable.userId, status: applicationsTable.status })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, applicationId))
    .limit(1);

  const [updated] = await db
    .update(applicationsTable)
    .set(updateData)
    .where(eq(applicationsTable.id, applicationId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Application not found" }); return; }

  // Send notification to applicant if status changed
  if (status && appBefore && appBefore.status !== status) {
    if (status === "approved") {
      await createNotification(
        appBefore.userId,
        "application_approved",
        "Заявка одобрена",
        `Ваша заявка на участие в «${event.title}» одобрена!`,
        eventId,
      );
    } else if (status === "rejected") {
      await createNotification(
        appBefore.userId,
        "application_rejected",
        "Заявка отклонена",
        `Ваша заявка на участие в «${event.title}» отклонена.`,
        eventId,
      );
    }
  }

  const [result] = await getApplicationsWithDetails(eq(applicationsTable.id, updated.id));
  res.json(result);
});

// DELETE /api/events/:eventId/applications/:applicationId
router.delete("/events/:eventId/applications/:applicationId", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const eventId = parseInt(req.params.eventId);
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(applicationId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [event] = await db
    .select({ organizerId: eventsTable.organizerId })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);

  const isOrganizer = event?.organizerId === userId;

  if (isOrganizer) {
    await db.delete(applicationsTable).where(eq(applicationsTable.id, applicationId));
  } else {
    await db.delete(applicationsTable).where(
      and(eq(applicationsTable.id, applicationId), eq(applicationsTable.userId, userId)),
    );
  }

  res.json({ success: true });
});

// GET /api/users/me/applications
router.get("/users/me/applications", async (req, res) => {
  const userId = await getUserFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const result = await getApplicationsWithDetails(eq(applicationsTable.userId, userId));
  res.json(result);
});

export default router;
