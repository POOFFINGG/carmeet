import { db } from "@workspace/db";
import { eventsTable, applicationsTable, usersTable } from "@workspace/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { Bot } from "grammy";

const MINI_APP_URL = process.env.MINI_APP_URL ?? "https://auto-meet.ru";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateRangeWindow(daysFromNow: number): { from: string; to: string } {
  const now = new Date();
  const from = addDays(now, daysFromNow);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setHours(23, 59, 59, 999);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

async function sendReminders(bot: Bot, daysAhead: number) {
  const { from, to } = dateRangeWindow(daysAhead);

  // Events starting in this window
  const events = await db.select().from(eventsTable)
    .where(and(
      gte(eventsTable.date, from),
      lte(eventsTable.date, to),
      eq(eventsTable.status, "upcoming"),
    ));

  if (events.length === 0) return;

  const eventIds = events.map(e => e.id);

  // Approved attendees
  const apps = await db.select({
    userId: applicationsTable.userId,
    eventId: applicationsTable.eventId,
  }).from(applicationsTable)
    .where(and(
      inArray(applicationsTable.eventId, eventIds),
      eq(applicationsTable.status, "approved"),
    ));

  if (apps.length === 0) return;

  const userIds = [...new Set(apps.map(a => a.userId))];
  const users = await db.select({ id: usersTable.id, telegramId: usersTable.telegramId })
    .from(usersTable)
    .where(inArray(usersTable.id, userIds));

  const telegramIdMap = new Map(users.map(u => [u.id, u.telegramId]));
  const eventMap = new Map(events.map(e => [e.id, e]));

  for (const app of apps) {
    const telegramId = telegramIdMap.get(app.userId);
    const event = eventMap.get(app.eventId);
    if (!telegramId || !event) continue;

    const label = daysAhead === 7 ? `Через неделю` : `Завтра`;
    const text = `${label}: *${event.title}*\n📅 ${event.date}\n📍 ${event.location}`;

    try {
      await bot.api.sendMessage(telegramId, text, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "Открыть", web_app: { url: `${MINI_APP_URL}/events/${event.id}` } },
          ]],
        },
      });
    } catch (e: any) {
      console.warn(`Reminder send failed for ${telegramId}:`, e.message);
    }
  }

  console.log(`Sent ${daysAhead}d reminders for ${apps.length} attendees across ${events.length} events`);
}

export function startNotificationScheduler(bot: Bot) {
  // Check every hour
  const INTERVAL_MS = 60 * 60 * 1000;

  async function tick() {
    try {
      await sendReminders(bot, 7);
      await sendReminders(bot, 1);
    } catch (e: any) {
      console.error("Notification scheduler error:", e.message);
    }
  }

  tick(); // run on start
  setInterval(tick, INTERVAL_MS);
  console.log("Notification scheduler started (hourly)");
}
