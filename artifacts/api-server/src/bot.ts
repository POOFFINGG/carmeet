import { Bot, webhookCallback } from "grammy";

const MINI_APP_URL = process.env.MINI_APP_URL ?? "https://auto-meet.ru";

export function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.warn("BOT_TOKEN not set — bot disabled");
    return null;
  }

  const bot = new Bot(token);

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
