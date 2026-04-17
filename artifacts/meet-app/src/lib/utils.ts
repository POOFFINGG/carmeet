import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getTgUser = () => {
  const tg = (window as any).Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  if (user) {
    return {
      id: String(user.id),
      username: user.username ?? `user${user.id}`,
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
    };
  }
  // Dev fallback (localhost only)
  if (import.meta.env.DEV) {
    return { id: "tg_123456789", username: "speedracer", first_name: "Alex", last_name: "G" };
  }
  throw new Error("Telegram WebApp not available");
};
