import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetMyCars, useGetMe } from "@workspace/api-client-react";
import { Plus, Settings, Camera } from "lucide-react";
import { getTgUser } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/Navigation";
import hummerImg from "@assets/9003368582ac3463e0bbfc01325d2e7d_1775136075973.jpg";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const SILHOUETTE_EMOJI: Record<string, string> = {
  bicycle: "🚲",
  scooter: "🛴",
  skateboard: "🛹",
  cart: "🛒",
};


export default function Garage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const tgUser = getTgUser();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: cars, isLoading: carsLoading } = useGetMyCars({ query: { enabled: !!user } });

  const activeCar = cars?.find(c => c.isPrimary) || cars?.[0];

  const hasAiImage = (activeCar?.aiStatus === "approved" || activeCar?.aiStatus === "pending_moderation" || activeCar?.aiStatus === "result_ready") && activeCar?.aiStyledImageUrl;
  const carDisplayUrl = hasAiImage
    ? (activeCar.aiStyledImageUrl ?? undefined)
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
        style={{  }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = hummerImg;
        }}
      />

      {/* Edge fades */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(13,13,13,0.6) 0%, transparent 20%, transparent 80%, rgba(13,13,13,0.6) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(13,13,13,0.6) 0%, transparent 30%, transparent 55%, rgba(13,13,13,0.92) 100%)" }} />


      {/* ── Viewer silhouette ── */}
      {user?.role === "viewer" && user?.viewerSilhouette && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[120px] leading-none opacity-80" style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.8))" }}>
              {SILHOUETTE_EMOJI[user.viewerSilhouette] ?? "🛒"}
            </span>
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Зритель</p>
          </div>
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
                className="relative w-11 h-11 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center font-black text-lg text-white/80 active:scale-90 transition-all"
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

        {/* Spacer */}
        <div className="flex-1" />
      </div>

      <BottomNav />
    </div>
  );
}
