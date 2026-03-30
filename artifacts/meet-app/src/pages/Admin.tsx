import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, Check, X, Loader2, Users, CalendarDays,
  Car, ShieldCheck, Search, ChevronRight, Ban,
  LayoutDashboard, ImagePlay, LogOut, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const TOKEN_KEY = "meet_admin_token";

type Tab = "dashboard" | "moderation" | "users" | "events";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stats = {
  users: { total: number; viewers: number; participants: number; organizers: number };
  events: { total: number; upcoming: number; ongoing: number; finished: number; cancelled: number };
  cars: { total: number; pendingModeration: number; approved: number };
};

type CarMod = {
  id: number;
  make: string;
  model: string;
  year?: number;
  aiStyledImageUrl?: string;
  sourcePhotos: string[];
  aiStatus: string;
  username: string;
  displayName: string;
};

type AdminUser = {
  id: number;
  telegramId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: "viewer" | "participant" | "organizer";
  onboardingComplete: boolean;
  createdAt: string;
};

type AdminEvent = {
  id: number;
  title: string;
  category: string;
  date: string;
  location: string;
  status: "upcoming" | "ongoing" | "finished" | "cancelled";
  maxParticipants?: number;
  isPrivate: boolean;
  organizerUsername: string;
  organizerDisplayName: string;
  createdAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  viewer: "bg-white/10 text-white/50",
  participant: "bg-blue-500/15 text-blue-400",
  organizer: "bg-purple-500/15 text-purple-400",
};
const ROLE_LABELS: Record<string, string> = {
  viewer: "Зритель",
  participant: "Участник",
  organizer: "Организатор",
};
const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-green-500/15 text-green-400",
  ongoing: "bg-yellow-500/15 text-yellow-400",
  finished: "bg-white/10 text-white/40",
  cancelled: "bg-red-500/15 text-red-400",
};
const STATUS_LABELS: Record<string, string> = {
  upcoming: "Скоро",
  ongoing: "Идёт",
  finished: "Завершено",
  cancelled: "Отменено",
};
const CAT_LABELS: Record<string, string> = {
  motorsport: "Автоспорт",
  exhibition: "Выставка",
  cruise: "Покатушки",
  club: "Клуб",
};

// Emits a custom event when admin token is rejected so the main component can force re-login
const UNAUTH_EVENT = "admin:unauthorized";

async function adminFetch(path: string, opts?: RequestInit): Promise<Response> {
  const token = sessionStorage.getItem(TOKEN_KEY) ?? "";
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token,
      ...(opts?.headers ?? {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    window.dispatchEvent(new Event(UNAUTH_EVENT));
  }
  return res;
}

// ── Login screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.ok) {
        const { token } = await res.json();
        sessionStorage.setItem(TOKEN_KEY, token);
        onSuccess(token);
      } else {
        setError("Неверный логин или пароль");
        setPassword("");
        passRef.current?.focus();
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      <div className="pt-12 px-5">
        <button
          onClick={() => setLocation("/settings")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        {/* Icon + heading */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="w-20 h-20 rounded-3xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">Вход в панель</h1>
            <p className="text-white/35 text-sm mt-1.5">Только для администраторов</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/40 text-xs font-bold uppercase tracking-widest px-1">
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(""); }}
              autoComplete="username"
              placeholder="admin"
              onKeyDown={e => e.key === "Enter" && passRef.current?.focus()}
              className={cn(
                "w-full bg-white/5 border rounded-2xl px-4 py-4 text-white text-base placeholder:text-white/20 outline-none transition-all",
                error ? "border-red-500/50" : "border-white/10 focus:border-primary/50"
              )}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/40 text-xs font-bold uppercase tracking-widest px-1">
              Пароль
            </label>
            <div className="relative">
              <input
                ref={passRef}
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(
                  "w-full bg-white/5 border rounded-2xl px-4 py-4 pr-12 text-white text-base placeholder:text-white/20 outline-none transition-all",
                  error ? "border-red-500/50" : "border-white/10 focus:border-primary/50"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 active:text-white/60 transition-colors"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center font-medium -mt-1">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-4 bg-primary rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 mt-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/stats")
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats) return <Empty text="Не удалось загрузить статистику" />;

  return (
    <div className="px-5 py-5 flex flex-col gap-5">
      <section>
        <SectionTitle icon={<Users className="w-4 h-4 text-violet-400" />} label="Пользователи" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Всего" value={stats.users.total} accent="text-white" />
          <StatCard label="Зрители" value={stats.users.viewers} accent="text-white/50" />
          <StatCard label="Участники" value={stats.users.participants} accent="text-blue-400" />
          <StatCard label="Организаторы" value={stats.users.organizers} accent="text-purple-400" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<CalendarDays className="w-4 h-4 text-cyan-400" />} label="События" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Всего" value={stats.events.total} accent="text-white" />
          <StatCard label="Скоро" value={stats.events.upcoming} accent="text-green-400" />
          <StatCard label="Идут" value={stats.events.ongoing} accent="text-yellow-400" />
          <StatCard label="Отменены" value={stats.events.cancelled} accent="text-red-400" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<Car className="w-4 h-4 text-orange-400" />} label="Автомобили" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Всего" value={stats.cars.total} accent="text-white" />
          <StatCard label="На модерации" value={stats.cars.pendingModeration} accent="text-orange-400" />
          <StatCard label="Одобрено AI" value={stats.cars.approved} accent="text-green-400" />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-4">
      <p className="text-white/35 text-xs mb-1">{label}</p>
      <p className={cn("text-3xl font-black", accent)}>{value}</p>
    </div>
  );
}

// ── Moderation tab ────────────────────────────────────────────────────────────

function ModerationTab() {
  const [cars, setCars] = useState<CarMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminFetch("/api/admin/moderation")
      .then(r => r.json())
      .then(data => setCars(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(carId: number) {
    setActing(carId);
    await adminFetch(`/api/admin/moderation/${carId}/approve`, { method: "POST" });
    setCars(prev => prev.filter(c => c.id !== carId));
    setActing(null);
  }

  async function reject(carId: number) {
    setActing(carId);
    await adminFetch(`/api/admin/moderation/${carId}/reject`, { method: "POST" });
    setCars(prev => prev.filter(c => c.id !== carId));
    setActing(null);
  }

  if (loading) return <Spinner />;
  if (cars.length === 0) {
    return (
      <Empty
        icon={<Check className="w-8 h-8 text-green-400" />}
        iconBg="bg-green-500/10"
        text="Всё проверено"
        sub="Нет изображений на модерации"
      />
    );
  }

  return (
    <div className="px-5 py-5 flex flex-col gap-5">
      {cars.map(car => (
        <div key={car.id} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-white/6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-black text-primary text-sm">
              {car.displayName?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{car.displayName}</p>
              <p className="text-white/40 text-xs">@{car.username}</p>
            </div>
            <div className="ml-auto text-white/50 text-sm font-bold">
              {car.make} {car.model} {car.year || ""}
            </div>
          </div>

          {car.aiStyledImageUrl && (
            <div className="px-4 pt-4">
              <p className="text-white/30 text-xs mb-2 font-bold uppercase tracking-wider">AI-результат</p>
              <img src={car.aiStyledImageUrl} alt="Generated"
                className="w-full h-48 object-contain bg-black/30 rounded-xl" />
            </div>
          )}

          {car.sourcePhotos?.length > 0 && (
            <div className="px-4 pt-3">
              <p className="text-white/30 text-xs mb-2 font-bold uppercase tracking-wider">Исходные фото</p>
              <div className="grid grid-cols-4 gap-1.5">
                {car.sourcePhotos.slice(0, 4).map((url, i) => (
                  <img key={i} src={url} alt={`Фото ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-4 flex gap-3">
            <button onClick={() => approve(car.id)} disabled={acting === car.id}
              className="flex-1 py-3 bg-green-600/20 border border-green-500/30 rounded-xl font-bold text-green-400 text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
              {acting === car.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Одобрить
            </button>
            <button onClick={() => reject(car.id)} disabled={acting === car.id}
              className="flex-1 py-3 bg-red-600/20 border border-red-500/30 rounded-xl font-bold text-red-400 text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
              {acting === car.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Отклонить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [changingRole, setChangingRole] = useState<number | null>(null);
  const [rolePickUser, setRolePickUser] = useState<AdminUser | null>(null);

  const load = useCallback((q?: string) => {
    setLoading(true);
    const qs = q ? `?search=${encodeURIComponent(q)}` : "";
    adminFetch(`/api/admin/users${qs}`)
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  async function changeRole(userId: number, role: string) {
    setChangingRole(userId);
    const res = await adminFetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as any } : u));
    }
    setChangingRole(null);
    setRolePickUser(null);
  }

  if (rolePickUser) {
    return (
      <div className="px-5 py-5 flex flex-col gap-3">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setRolePickUser(null)}
            className="w-8 h-8 rounded-full bg-white/6 flex items-center justify-center active:scale-90 transition-all">
            <ChevronLeft className="w-4 h-4 text-white/70" />
          </button>
          <div>
            <p className="text-white font-bold text-sm">{rolePickUser.displayName}</p>
            <p className="text-white/40 text-xs">@{rolePickUser.username}</p>
          </div>
        </div>
        {(["viewer", "participant", "organizer"] as const).map(role => (
          <button key={role} onClick={() => changeRole(rolePickUser.id, role)}
            disabled={changingRole === rolePickUser.id}
            className={cn(
              "w-full flex items-center justify-between px-4 py-4 rounded-2xl border transition-all active:scale-[0.98]",
              rolePickUser.role === role ? "bg-primary/12 border-primary/40" : "bg-white/4 border-white/8"
            )}>
            <span className={cn("font-bold text-sm", rolePickUser.role === role ? "text-primary" : "text-white")}>
              {ROLE_LABELS[role]}
            </span>
            {changingRole === rolePickUser.id
              ? <Loader2 className="w-4 h-4 animate-spin text-white/40" />
              : rolePickUser.role === role ? <Check className="w-4 h-4 text-primary" /> : null}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-white/30 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени или @username"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none" />
        </div>
      </div>

      {loading ? <Spinner /> : users.length === 0 ? <Empty text="Пользователи не найдены" /> : (
        <div className="px-5 pb-5 flex flex-col gap-2">
          {users.map(user => (
            <button key={user.id} onClick={() => setRolePickUser(user)}
              className="w-full bg-white/4 border border-white/8 rounded-2xl px-4 py-3.5 flex items-center gap-3 active:scale-[0.99] transition-all text-left">
              <div className="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-black text-white/60 text-sm shrink-0">
                {user.displayName?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{user.displayName}</p>
                <p className="text-white/35 text-xs truncate">@{user.username}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg", ROLE_COLORS[user.role])}>
                  {ROLE_LABELS[user.role]}
                </span>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Events tab ────────────────────────────────────────────────────────────────

function EventsTab() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/events")
      .then(r => r.json())
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function cancelEvent(eventId: number) {
    setActing(eventId);
    const res = await adminFetch(`/api/admin/events/${eventId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (res.ok) {
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: "cancelled" } : e));
    }
    setActing(null);
    setConfirmCancel(null);
  }

  if (loading) return <Spinner />;
  if (events.length === 0) return <Empty text="Нет событий" />;

  return (
    <div className="px-5 py-5 flex flex-col gap-3">
      {events.map(ev => (
        <div key={ev.id} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-white font-bold text-sm leading-snug flex-1">{ev.title}</p>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0", STATUS_COLORS[ev.status])}>
                {STATUS_LABELS[ev.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white/30 text-xs">{CAT_LABELS[ev.category] ?? ev.category}</span>
              <span className="text-white/15 text-xs">·</span>
              <span className="text-white/30 text-xs">
                {new Date(ev.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {ev.isPrivate && <><span className="text-white/15 text-xs">·</span><span className="text-white/30 text-xs">Приватное</span></>}
            </div>
            <p className="text-white/25 text-xs mt-1 truncate">{ev.location}</p>
          </div>

          <div className="px-4 pb-3 border-t border-white/6 pt-3 flex items-center justify-between">
            <div>
              <p className="text-white/50 text-xs">Организатор</p>
              <p className="text-white/70 text-xs font-bold">@{ev.organizerUsername}</p>
            </div>
            {ev.status !== "cancelled" && ev.status !== "finished" && (
              confirmCancel === ev.id ? (
                <div className="flex gap-2">
                  <button onClick={() => setConfirmCancel(null)}
                    className="px-3 py-1.5 rounded-lg bg-white/8 text-white/50 text-xs font-bold active:scale-95 transition-all">
                    Нет
                  </button>
                  <button onClick={() => cancelEvent(ev.id)} disabled={acting === ev.id}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50">
                    {acting === ev.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Подтвердить
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmCancel(ev.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold active:scale-95 transition-all">
                  <Ban className="w-3.5 h-3.5" />
                  Отменить
                </button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <Loader2 className="w-7 h-7 text-primary animate-spin" />
    </div>
  );
}

function Empty({ text, sub, icon, iconBg }: {
  text: string; sub?: string;
  icon?: React.ReactNode; iconBg?: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-16 px-8">
      {icon && (
        <div className={cn("w-14 h-14 rounded-full flex items-center justify-center", iconBg ?? "bg-white/6")}>
          {icon}
        </div>
      )}
      <p className="text-white/50 font-bold text-sm">{text}</p>
      {sub && <p className="text-white/25 text-xs">{sub}</p>}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <p className="text-white/50 text-xs font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Admin() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [tab, setTab] = useState<Tab>("dashboard");

  // Auto-logout when any fetch receives 401/403
  useEffect(() => {
    function handleUnauth() {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken(null);
    }
    window.addEventListener(UNAUTH_EVENT, handleUnauth);
    return () => window.removeEventListener(UNAUTH_EVENT, handleUnauth);
  }, []);

  // Not logged in — show login screen
  if (!token) {
    return <LoginScreen onSuccess={t => setToken(t)} />;
  }

  async function logout() {
    await adminFetch("/api/admin/logout", { method: "POST" });
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Обзор", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "moderation", label: "Модерация", icon: <ImagePlay className="w-4 h-4" /> },
    { id: "users", label: "Юзеры", icon: <Users className="w-4 h-4" /> },
    { id: "events", label: "События", icon: <CalendarDays className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      {/* Header */}
      <div className="pt-12 px-5 pb-4 flex items-center gap-3 border-b border-white/6">
        <button onClick={() => setLocation("/settings")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white">Админ-панель</h1>
          <p className="text-white/30 text-xs">Управление сообществом</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-primary/15 border border-primary/25 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary text-xs font-bold">Admin</span>
          </div>
          <button onClick={logout}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/8 active:scale-90 transition-all"
            title="Выйти">
            <LogOut className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/6 px-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold transition-all",
              tab === t.id ? "text-primary border-b-2 border-primary" : "text-white/30"
            )}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "moderation" && <ModerationTab />}
        {tab === "users" && <UsersTab />}
        {tab === "events" && <EventsTab />}
      </div>
    </div>
  );
}
