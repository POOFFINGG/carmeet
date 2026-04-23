import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { createBot, webhookCallback } from "./bot";
import { startNotificationScheduler } from "./services/notification-scheduler";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve generated images
app.use(
  "/api/uploads",
  express.static(path.resolve(process.cwd(), "uploads")),
);

app.use("/api", router);

// Telegram bot webhook + notification scheduler
const bot = createBot();
if (bot) {
  app.use("/bot", webhookCallback(bot, "express"));
  logger.info("Bot webhook registered at /bot");
  startNotificationScheduler(bot);
}

export default app;
