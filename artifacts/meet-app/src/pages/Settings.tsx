import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Car, UserCog, Tag, MessageCircle, ChevronRight, Check, ShieldCheck } from "lucide-react";
import { useGetMe, useGetMyCars } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getTgUser } from "@/lib/utils";

const CATEGORIES = [
  { id: "motorsport", label: "Автоспорт", emoji: "🏁" },
  { id: "exhibition", label: "Выставки", emoji: "🏆" },
  { id: "cruise", label: "Покатушки", emoji: "🚗" },
  { id: "club", label: "Автоклубы", emoji: "🤝" },
];

const ROLES = [
  { id: "viewer", label: "Зритель", desc: "Смотрю события, не участвую" },
  { id: "participant", label: "Участник", desc: "Участвую в событиях с авто" },
  { id: "organizer", label: "Организатор", desc: "Создаю и провожу события" },
];

type Section = null | "role" | "categories";

export default function Settings() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: cars } = useGetMyCars({ query: { enabled: !!user && user.role !== "viewer", retry: false } });

  const [section, setSection] = useState<Section>(null);
  const [selectedRole, setSelectedRole] = useState(user?.role ?? "viewer");
  const [selectedCats, setSelectedCats] = useState<string[]>(user?.interestCategories ?? []);
  const [saving, setSaving] = useState(false);

  const tgUser = getTgUser();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isAdmin = ["1000001", "tg_123456789"].includes(tgUser.id);

  async function patchUser(body: object) {
    setSaving(true);
    try {
      await fetch(`${BASE}/api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": tgUser.id,
        },
        body: JSON.stringify(body),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    } finally {
      setSaving(false);
    }
  }

  async function saveRole() {
    await patchUser({ role: selectedRole });
    setSection(null);
  }

  async function saveCategories() {
    await patchUser({ interestCategories: selectedCats });
    setSection(null);
  }

  function toggleCat(id: string) {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  // ── Sub-screens ────────────────────────────────────────────────────────────
  if (section === "role") {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
        <div className="pt-12 px-5 pb-4 flex items-center gap-3 border-b border-white/6">
          <button onClick={() => setSection(null)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-lg font-black text-white">Изменить роль</h1>
        </div>

        <div className="flex-1 px-5 pt-6 flex flex-col gap-3">
          {ROLES.map(role => {
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  "w-full text-left rounded-2xl p-4 border transition-all active:scale-[0.98]",
                  isSelected
                    ? "bg-primary/12 border-primary/50"
                    : "bg-white/4 border-white/8"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn("font-black text-base", isSelected ? "text-primary" : "text-white")}>
                      {role.label}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">{role.desc}</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? "border-primary bg-primary" : "border-white/20"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </div>
                {role.id === "participant" && !cars?.length && isSelected && (
                  <p className="text-yellow-400/80 text-xs mt-2 pt-2 border-t border-white/8">
                    После сохранения добавьте авто в гараже
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-5 pb-10 pt-4">
          <button
            onClick={saveRole}
            disabled={saving}
            className="w-full py-3.5 bg-primary rounded-2xl font-black text-white active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    );
  }

  if (section === "categories") {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
        <div className="pt-12 px-5 pb-4 flex items-center gap-3 border-b border-white/6">
          <button onClick={() => setSection(null)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-lg font-black text-white">Категории интересов</h1>
        </div>

        <p className="px-5 pt-4 pb-2 text-white/40 text-sm">
          Влияет на рекомендации и уведомления
        </p>

        <div className="flex-1 px-5 pt-2 flex flex-col gap-3">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCats.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCat(cat.id)}
                className={cn(
                  "w-full text-left rounded-2xl p-4 border transition-all active:scale-[0.98] flex items-center justify-between",
                  isSelected
                    ? "bg-primary/12 border-primary/50"
                    : "bg-white/4 border-white/8"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className={cn("font-bold text-base", isSelected ? "text-primary" : "text-white")}>
                    {cat.label}
                  </span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                  isSelected ? "border-primary bg-primary" : "border-white/20"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-5 pb-10 pt-4">
          <button
            onClick={saveCategories}
            disabled={saving || selectedCats.length === 0}
            className="w-full py-3.5 bg-primary rounded-2xl font-black text-white active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "Сохраняем..." : `Сохранить (${selectedCats.length})`}
          </button>
        </div>
      </div>
    );
  }

  // ── Main settings screen ───────────────────────────────────────────────────
  const roleLabel = ROLES.find(r => r.id === (user?.role ?? "viewer"))?.label ?? "—";
  const catsLabel = (user?.interestCategories ?? [])
    .map(c => CATEGORIES.find(cat => cat.id === c)?.label)
    .filter(Boolean)
    .join(", ") || "Не выбраны";

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      {/* Header */}
      <div className="pt-12 px-5 pb-5 flex items-center gap-3 border-b border-white/6">
        <button
          onClick={() => setLocation("/garage")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>
        <h1 className="text-xl font-black text-white">Настройки</h1>
      </div>

      <div className="flex-1 px-5 pt-6 flex flex-col gap-5">

        {/* ── Автомобиль ── */}
        <div>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-2 px-1">Автомобиль</p>
          <div className="bg-white/4 rounded-2xl border border-white/6 overflow-hidden">
            <button
              onClick={() => setLocation("/settings/car")}
              className="w-full flex items-center justify-between px-4 py-4 active:bg-white/4 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Car className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Изменить автомобиль</p>
                  <p className="text-white/35 text-xs mt-0.5">
                    {cars?.[0] ? `${cars[0].make} ${cars[0].model}` : "Не добавлен"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25" />
            </button>
          </div>
        </div>

        {/* ── Профиль ── */}
        <div>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-2 px-1">Профиль</p>
          <div className="bg-white/4 rounded-2xl border border-white/6 overflow-hidden divide-y divide-white/6">
            <button
              onClick={() => { setSelectedRole(user?.role ?? "viewer"); setSection("role"); }}
              className="w-full flex items-center justify-between px-4 py-4 active:bg-white/4 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <UserCog className="w-4.5 h-4.5 text-violet-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Изменить роль</p>
                  <p className="text-white/35 text-xs mt-0.5">{roleLabel}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25" />
            </button>

            <button
              onClick={() => { setSelectedCats(user?.interestCategories ?? []); setSection("categories"); }}
              className="w-full flex items-center justify-between px-4 py-4 active:bg-white/4 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                  <Tag className="w-4.5 h-4.5 text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Категории интересов</p>
                  <p className="text-white/35 text-xs mt-0.5 max-w-[180px] truncate">{catsLabel}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25" />
            </button>
          </div>
        </div>

        {/* ── Поддержка ── */}
        <div>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-2 px-1">Поддержка</p>
          <div className="bg-white/4 rounded-2xl border border-white/6 overflow-hidden">
            <a
              href="https://t.me/meet_support"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-4 active:bg-white/4 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <MessageCircle className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Обратная связь</p>
                  <p className="text-white/35 text-xs mt-0.5">Написать администраторам</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25" />
            </a>
          </div>
        </div>

        {/* ── Администрирование (только для adminов) ── */}
        {isAdmin && (
          <div>
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-2 px-1">Администрирование</p>
            <div className="bg-white/4 rounded-2xl border border-white/6 overflow-hidden">
              <button
                onClick={() => setLocation("/admin")}
                className="w-full flex items-center justify-between px-4 py-4 active:bg-white/4 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
                    <ShieldCheck className="w-4.5 h-4.5 text-orange-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">Модерация AI-изображений</p>
                    <p className="text-white/35 text-xs mt-0.5">Одобрить или отклонить</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/25" />
              </button>
            </div>
          </div>
        )}

        {/* App version */}
        <p className="text-center text-white/15 text-xs mt-2">MEET v1.0 · Авто комьюнити</p>
      </div>
    </div>
  );
}
