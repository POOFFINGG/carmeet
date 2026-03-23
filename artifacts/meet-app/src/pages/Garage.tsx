import { useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useGetMyCars, useGetMyApplications, useGetMe } from "@workspace/api-client-react";
import { Plus, ChevronRight, Settings, Car, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTgUser } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/Navigation";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");


const AI_STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending_moderation: { label: "На модерации", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  approved: { label: "Одобрено", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  rejected: { label: "Отклонено", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function Garage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const tgUser = getTgUser();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);

  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: cars, isLoading: carsLoading } = useGetMyCars({ query: { enabled: !!user && user.role !== "viewer" } });
  const { data: apps, isLoading: appsLoading } = useGetMyApplications({ query: { enabled: !!user } });

  const primaryCar = cars?.find(c => c.isPrimary) || cars?.[0];
  // Active car = explicitly selected OR primary
  const activeCar = (selectedCarId ? cars?.find(c => c.id === selectedCarId) : null) ?? primaryCar;

  // Decide which image to show:
  // - If AI approved/pending/result_ready → aiStyledImageUrl (owner always sees it)
  // - Otherwise → default-car.png
  const showAiBadge = activeCar?.aiStatus && activeCar.aiStatus !== "none" && activeCar.aiStatus !== "generating";
  const carDisplayUrl =
    activeCar?.aiStatus === "approved" || activeCar?.aiStatus === "pending_moderation" || activeCar?.aiStatus === "result_ready"
      ? (activeCar.aiStyledImageUrl || `${import.meta.env.BASE_URL}images/default-car.png`)
      : `${import.meta.env.BASE_URL}images/default-car.png`;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await fetch(`${BASE_URL}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-telegram-id": tgUser.id },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">

      {/* ── Topbar ── */}
      <div className="pt-12 px-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-11 h-11 rounded-full bg-primary/20 border-2 border-primary overflow-hidden flex items-center justify-center font-black text-lg text-primary active:scale-90 transition-all"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.displayName?.[0]?.toUpperCase() || "?"}</span>
              )}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
          <div>
            <p className="text-white/40 text-[10px] font-medium leading-none mb-0.5">
              {user?.role === "organizer" ? "Организатор" : user?.role === "participant" ? "Участник" : "Зритель"}
            </p>
            <h2 className="text-lg font-black text-white leading-none">
              @{user?.username || user?.displayName || "—"}
            </h2>
          </div>
        </div>
        <button
          onClick={() => setLocation("/settings")}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 active:scale-90 transition-all"
        >
          <Settings className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* ── Garage panel — contained background with car inside ── */}
      <div className="relative mx-0 mt-3 overflow-hidden flex-shrink-0" style={{ height: "310px" }}>
        {/* Garage photo */}
        <img
          src={`${import.meta.env.BASE_URL}garage-bg.png`}
          alt="" aria-hidden
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "cover", objectPosition: "center 60%" }}
        />
        {/* Edge fades — blend into dark bg */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to right, rgba(13,13,13,0.7) 0%, transparent 18%, transparent 82%, rgba(13,13,13,0.7) 100%)" }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(13,13,13,0.6) 0%, transparent 22%, transparent 65%, rgba(13,13,13,0.8) 100%)" }} />

        {/* Car — centered horizontally, shifted slightly below center */}
        {!carsLoading && activeCar ? (
          <div className="absolute inset-0 flex items-center justify-center px-5 pt-10">
            <div className="relative w-full">
              <img
                key={activeCar?.id}
                src={carDisplayUrl}
                alt="My Car"
                className="w-full object-contain transition-opacity duration-300"
                style={{
                  maxHeight: "260px",
                  filter: "drop-shadow(0 18px 32px rgba(0,0,0,0.85)) drop-shadow(0 4px 10px rgba(0,0,0,0.6))",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}images/default-car.png`;
                }}
              />
              {showAiBadge && activeCar && (
                <div className="absolute top-0 right-0">
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-lg border",
                    AI_STATUS_BADGE[activeCar.aiStatus]?.color ?? "bg-white/10 text-white/50 border-white/10"
                  )}>
                    {AI_STATUS_BADGE[activeCar.aiStatus]?.label ?? activeCar.aiStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : !carsLoading && user?.role === "viewer" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Car className="w-16 h-16 text-white/15" />
            <p className="text-white/30 text-sm">Режим зрителя</p>
          </div>
        ) : !carsLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
              <Plus className="w-7 h-7 text-white/25" />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Bottom info ── */}
      <div className="flex-1 px-5 pt-4 pb-28">

        {activeCar && (
          <div className="mb-3">
            <span className="inline-flex bg-primary/90 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider mb-1.5">
              {activeCar.isPrimary ? "Основное авто" : "Второй автомобиль"}
            </span>
            <h1 className="text-3xl font-black text-white leading-tight">
              {activeCar.make} <span className="text-white/60 font-bold">{activeCar.model}</span>
            </h1>
          </div>
        )}

        {/* ── Car switcher strip (if >1 cars) ── */}
        {cars && cars.length > 1 && (
          <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {cars.map(car => {
              const isActive = car.id === (activeCar?.id);
              return (
                <button
                  key={car.id}
                  onClick={() => setSelectedCarId(car.id)}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all active:scale-95",
                    isActive
                      ? "bg-primary/15 border-primary/50"
                      : "bg-white/5 border-white/8"
                  )}
                >
                  <div className={cn(
                    "w-14 h-9 rounded-xl flex items-center justify-center",
                    isActive ? "bg-primary/10" : "bg-white/5"
                  )}>
                    <Car className={cn("w-6 h-6", isActive ? "text-primary" : "text-white/30")} />
                  </div>
                  <div className="text-center min-w-0">
                    <p className={cn("text-[10px] font-black leading-none truncate max-w-[64px]", isActive ? "text-white" : "text-white/50")}>
                      {car.make}
                    </p>
                    <p className={cn("text-[9px] leading-none mt-0.5 truncate max-w-[64px]", isActive ? "text-white/50" : "text-white/25")}>
                      {car.model}
                    </p>
                  </div>
                  {car.isPrimary && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
            {/* Add car button */}
            <button
              onClick={() => setLocation("/settings/car")}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border border-dashed border-white/12 bg-white/3 active:scale-95 transition-all w-[72px]"
            >
              <Plus className="w-5 h-5 text-white/25" />
              <p className="text-[9px] text-white/25 font-bold">Добавить</p>
            </button>
          </div>
        )}

        {!activeCar && !carsLoading && user?.role !== "viewer" && (
          <div className="mb-4">
            <h3 className="text-2xl font-black text-white mb-1">Добавьте авто</h3>
            <p className="text-white/40 text-sm mb-4">Покажите свой проект сообществу</p>
            <button
              onClick={() => setLocation("/settings/car")}
              className="px-7 py-3 bg-primary rounded-2xl font-black text-white active:scale-95 transition-all"
            >
              + Добавить авто
            </button>
          </div>
        )}

        {user?.role === "viewer" && (
          <div className="mb-4">
            <h3 className="text-2xl font-black text-white mb-1">Режим зрителя</h3>
            <p className="text-white/40 text-sm mb-4">Найдите события и присоединяйтесь</p>
            <button
              onClick={() => setLocation("/events")}
              className="px-7 py-3 bg-primary rounded-2xl font-black text-white active:scale-95 transition-all"
            >
              Найти события
            </button>
          </div>
        )}

        {/* Applications */}
        {!appsLoading && apps && apps.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-black text-white">Мои заявки</h3>
              <Link href="/profile" className="text-xs text-primary font-bold">Все</Link>
            </div>
            <div className="flex flex-col gap-2">
              {apps.slice(0, 1).map(app => (
                <div key={app.id} className="bg-white/5 backdrop-blur-xl rounded-2xl p-3.5 flex items-center justify-between border border-white/8">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-sm truncate">{app.eventTitle || "Событие"}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/8 text-white/50">
                        {app.type === "viewer" ? "Зритель" : "Участник"}
                      </span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-lg font-bold",
                        app.status === "approved" ? "bg-green-500/15 text-green-400" :
                        app.status === "rejected" ? "bg-red-500/15 text-red-400" :
                        "bg-yellow-500/15 text-yellow-400"
                      )}>
                        {app.status === "approved" ? "Одобрено" :
                          app.status === "rejected" ? "Отклонено" : "На рассмотрении"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="text-white/30 w-4 h-4 flex-shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!appsLoading && (!apps || apps.length === 0) && user?.role !== "viewer" && (
          <button
            onClick={() => setLocation("/events")}
            className="w-full bg-white/5 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between border border-white/8 active:scale-[0.98] transition-all"
          >
            <div>
              <p className="font-black text-white text-sm">Нет активных заявок</p>
              <p className="text-white/40 text-xs mt-0.5">Найдите события → запишитесь</p>
            </div>
            <div className="w-8 h-8 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-primary" />
            </div>
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
