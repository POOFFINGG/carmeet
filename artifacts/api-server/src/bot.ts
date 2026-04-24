import { Bot, webhookCallback } from "grammy";
import { db } from "@workspace/db";
import { applicationsTable, usersTable, eventsTable, notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const MINI_APP_URL = process.env.MINI_APP_URL ?? "https://auto-meet.ru";

let _bot: Bot | null = null;

export function getBot(): Bot | null { return _bot; }

export function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.warn("BOT_TOKEN not set — bot disabled");
    return null;
  }

  const bot = new Bot(token);
  _bot = bot;

  bot.command("start", async (ctx) => {
    await ctx.reply("Добро пожаловать в CarMeet! 🚗\nОткрой приложение:", {
      reply_markup: {
        inline_keyboard: [[
          { text: "🏎 Открыть CarMeet", web_app: { url: MINI_APP_URL } },
        ]],
      },
    });
  });

  bot.command("garage", async (ctx) => {
    await ctx.reply("Твой гараж:", {
      reply_markup: {
        inline_keyboard: [[
          { text: "🚘 Мой гараж", web_app: { url: `${MINI_APP_URL}/garage` } },
        ]],
      },
    });
  });

  // Handle approve/reject inline buttons from application notifications
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;

    try {
      if (data.startsWith("approve_")) {
        const appId = parseInt(data.replace("approve_", ""));
        const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, appId)).limit(1);
        if (!app) { await ctx.answerCallbackQuery("Заявка не найдена"); return; }

        await db.update(applicationsTable).set({ status: "approved" }).where(eq(applicationsTable.id, appId));

        // Notify applicant
        const [applicant] = await db.select({ telegramId: usersTable.telegramId }).from(usersTable).where(eq(usersTable.id, app.userId)).limit(1);
        const [event] = await db.select({ title: eventsTable.title }).from(eventsTable).where(eq(eventsTable.id, app.eventId)).limit(1);

        if (applicant && event) {
          await db.insert(notificationsTable).values({
            userId: app.userId,
            type: "application_approved",
            title: "Заявка одобрена",
            message: `Ваша заявка на участие в «${event.title}» одобрена!`,
            eventId: app.eventId,
          });
          try {
            await bot.api.sendMessage(applicant.telegramId, `✅ Ваша заявка на «${event.title}» одобрена!`, {
              reply_markup: {
                inline_keyboard: [[
                  { text: "🏎 Открыть событие", web_app: { url: `${MINI_APP_URL}/events/${app.eventId}` } },
                ]],
              },
            });
          } catch {}
        }

        await ctx.answerCallbackQuery("✅ Заявка одобрена");
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });

      } else if (data.startsWith("decline_invite_")) {
        await ctx.answerCallbackQuery("Понято, вы отказались от приглашения");
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });

      } else if (data.startsWith("reject_")) {
        const appId = parseInt(data.replace("reject_", ""));
        const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, appId)).limit(1);
        if (!app) { await ctx.answerCallbackQuery("Заявка не найдена"); return; }

        await db.update(applicationsTable).set({ status: "rejected" }).where(eq(applicationsTable.id, appId));

        const [applicant] = await db.select({ telegramId: usersTable.telegramId }).from(usersTable).where(eq(usersTable.id, app.userId)).limit(1);
        const [event] = await db.select({ title: eventsTable.title }).from(eventsTable).where(eq(eventsTable.id, app.eventId)).limit(1);

        if (applicant && event) {
          await db.insert(notificationsTable).values({
            userId: app.userId,
            type: "application_rejected",
            title: "Заявка отклонена",
            message: `Ваша заявка на участие в «${event.title}» отклонена.`,
            eventId: app.eventId,
          });
          try {
            await bot.api.sendMessage(applicant.telegramId, `❌ Ваша заявка на «${event.title}» отклонена.`);
          } catch {}
        }

        await ctx.answerCallbackQuery("❌ Заявка отклонена");
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
      }
    } catch (err) {
      console.error("callback_query error:", err);
      await ctx.answerCallbackQuery("Произошла ошибка");
    }
  });

  bot.on("message", async (ctx) => {
    await ctx.reply("Используй кнопку ниже чтобы открыть приложение 👇", {
      reply_markup: {
        keyboard: [[
          { text: "🏎 CarMeet", web_app: { url: MINI_APP_URL } },
        ]],
        resize_keyboard: true,
      },
    });
  });

  return bot;
}

export { webhookCallback };
