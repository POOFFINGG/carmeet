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
  // Fallback for dev or when Telegram is not available
  return { id: "tg_123456789", username: "speedracer", first_name: "Alex", last_name: "G" };
};
