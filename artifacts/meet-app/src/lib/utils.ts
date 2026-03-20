import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getTgUser = () => {
  // Simulate Telegram WebApp User
  return {
    id: "tg_123456789",
    username: "speedracer",
    first_name: "Alex",
    last_name: "G"
  };
};
