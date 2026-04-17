import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setExtraHeadersGetter } from "@workspace/api-client-react";
import { getTgUser } from "@/lib/utils";

// Initialize Telegram WebApp
const tg = (window as any).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

setExtraHeadersGetter(() => {
  const tgUser = getTgUser();
  const initData = tg?.initData ?? "";
  return {
    "x-telegram-id": String(tgUser.id),
    ...(initData ? { "x-telegram-init-data": initData } : {}),
  };
});

createRoot(document.getElementById("root")!).render(<App />);
