import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetMyCars, useGetMe } from "@workspace/api-client-react";
import { Plus, Settings, Car, Camera, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTgUser } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/Navigation";
import hummerImg from "@assets/9003368582ac3463e0bbfc01325d2e7d_1775136075973.jpg";

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
  const { data: cars, isLoading: carsLoading } = useGetMyCars({ query: { enabled: !!user } });

  const primaryCar = cars?.find(c => c.isPrimary) || cars?.[0];
  const activeCar = (selectedCarId ? cars?.find(c => c.id === selectedCarId) : null) ?? primaryCar;

  const showAiBadge = activeCar?.aiStatus && activeCar.aiStatus !== "none" && activeCar.aiStatus !== "generating";
  const hasAiImage = (activeCar?.aiStatus === "approved" || activeCar?.aiStatus === "pending_moderation" || activeCar?.aiStatus === "result_ready") && activeCar?.aiStyledImageUrl;
  const carDisplayUrl = hasAiImage
    ? activeCar.aiStyledImageUrl
    : `${import.meta.env.BASE_URL}new-angle-Photoroom.png`;

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
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#0d0d0d]">

      {/* ── Background: composed JPEG (car already placed) or hummer photo ── */}
      <img
        src={hasAiImage ? carDisplayUrl : hummerImg}
        alt="" aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center"
        onError={(e) => {
          (e.target as HTMLImageElement).src = hummerImg;
        }}
      />

      {/* Edge fades */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(13,13,13,0.6) 0%, transparent 20%, transparent 80%, rgba(13,13,13,0.6) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(13,13,13,0.6) 0%, transparent 30%, transparent 55%, rgba(13,13,13,0.92) 100%)" }} />

      {/* ── AI status badge (when car is in the composed JPEG background) ── */}
      {showAiBadge && activeCar && hasAiImage && (
        <div className="absolute z-10 right-5" style={{ top: "32%" }}>
          <span className={cn(
            "text-[10px] font-bold px-2.5 py-1 rounded-lg border",
            AI_STATUS_BADGE[activeCar.aiStatus]?.color ?? "bg-white/10 text-white/50 border-white/10"
          )}>
            {AI_STATUS_BADGE[activeCar.aiStatus]?.label ?? activeCar.aiStatus}
          </span>
        </div>
      )}

      {/* ── Car overlay: hidden (car shown as background) ── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-4 pointer-events-none">
        {false ? (
          <div className="relative w-full pointer-events-auto">
            <img
              key={activeCar?.id}
              src={carDisplayUrl}
              alt="My Car"
              className="w-full object-contain transition-opacity duration-300"
              style={{
                maxHeight: "75vh",
                filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.9)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))",
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
        ) : !carsLoading && !activeCar ? (
          <button
            onClick={() => setLocation("/settings/car/new")}
            className="flex flex-col items-center gap-3 active:scale-95 transition-all pointer-events-auto"
          >
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/60 flex items-center justify-center">
              <Plus className="w-7 h-7 text-white/70" />
            </div>
            <p className="text-white/70 text-sm font-bold">Добавить авто</p>
          </button>
        ) : null}
      </div>

      {/* ── Main content layer ── */}
      <div className="relative z-20 flex-1 flex flex-col">

        {/* Topbar */}
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

        {/* Spacer — pushes bottom info down; car is rendered absolutely above */}
        <div className="flex-1" />

        {/* ── Bottom info: car name + switcher ── */}
        <div className="px-5 pb-28 flex-shrink-0">

          {activeCar && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex bg-primary/90 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                  {activeCar.isPrimary ? "Основное авто" : "Второй автомобиль"}
                </span>
                <button
                  onClick={() => setLocation(`/settings/car/${activeCar.id}`)}
                  className="w-7 h-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center active:scale-90 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5 text-white/50" />
                </button>
              </div>
              <h1 className="text-3xl font-black text-white leading-tight">
                {activeCar.make} <span className="text-white/60 font-bold">{activeCar.model}</span>
              </h1>
              {(activeCar.year || activeCar.color) && (
                <p className="text-white/35 text-sm mt-0.5">
                  {[activeCar.year && `${activeCar.year} г.`, activeCar.color].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          )}

          {/* Car switcher strip */}
          {!carsLoading && (
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {cars?.map(car => {
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
              <button
                onClick={() => setLocation("/settings/car/new")}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border border-dashed border-white/12 bg-white/3 active:scale-95 transition-all w-[72px]"
              >
                <Plus className="w-5 h-5 text-white/25" />
                <p className="text-[9px] text-white/25 font-bold">Добавить</p>
              </button>
            </div>
          )}


        </div>
      </div>

      <BottomNav />
    </div>
  );
}
