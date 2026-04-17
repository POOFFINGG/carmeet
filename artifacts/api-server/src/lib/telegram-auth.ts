import crypto from "crypto";

export function validateTelegramInitData(initData: string, botToken: string): Record<string, string> | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (expectedHash !== hash) return null;

  // Check auth_date not older than 24h
  const authDate = Number(params.get("auth_date") ?? 0);
  if (Date.now() / 1000 - authDate > 86400) return null;

  const result: Record<string, string> = {};
  for (const [k, v] of entries) result[k] = v;
  return result;
}

export function getTelegramUserFromInitData(initData: string, botToken: string): { id: string } | null {
  const data = validateTelegramInitData(initData, botToken);
  if (!data?.user) return null;
  try {
    const user = JSON.parse(data.user);
    return { id: String(user.id) };
  } catch {
    return null;
  }
}
