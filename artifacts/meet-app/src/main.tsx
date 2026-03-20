import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setExtraHeadersGetter } from "@workspace/api-client-react";
import { getTgUser } from "@/lib/utils";

setExtraHeadersGetter(() => {
  const tgUser = getTgUser();
  return {
    "x-telegram-id": String(tgUser.id),
  };
});

createRoot(document.getElementById("root")!).render(<App />);
