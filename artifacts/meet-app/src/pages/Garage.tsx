import { useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useGetMyCars, useGetMyApplications, useGetMe } from "@workspace/api-client-react";
import { Plus, ChevronRight, Settings, Car, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTgUser } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/Navigation";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function NFSBackground() {
  return (
    <>
      <style>{`
        @keyframes nfs-flicker {
          0%,100% { opacity:1 }
          92%      { opacity:1 }
          93%      { opacity:0.55 }
          94%      { opacity:1 }
          96%      { opacity:0.7 }
          97%      { opacity:1 }
        }
        @keyframes nfs-pulse {
          0%,100% { opacity:0.55 }
          50%      { opacity:0.9 }
        }
        @keyframes nfs-scanline {
          0%   { transform: translateY(-100%) }
          100% { transform: translateY(100vh) }
        }
        .nfs-neon-left  { animation: nfs-flicker 7s infinite; }
        .nfs-neon-right { animation: nfs-flicker 7s 0.3s infinite; }
        .nfs-glow-pulse { animation: nfs-pulse 3s ease-in-out infinite; }
      `}</style>

      {/* Base: very dark purple-black */}
      <div className="absolute inset-0" style={{ background: "#04000c" }} />

      {/* SVG scene */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Purple neon glow filter */}
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="12" result="blur2" in="SourceGraphic" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neon-glow-sm" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="floor-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="ambient" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="35" />
          </filter>

          {/* Perspective floor gradient */}
          <linearGradient id="floor-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e0020" />
            <stop offset="60%" stopColor="#07000f" />
            <stop offset="100%" stopColor="#030008" />
          </linearGradient>

          {/* Ceiling gradient */}
          <linearGradient id="ceil-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#080015" />
            <stop offset="100%" stopColor="#04000c" />
          </linearGradient>

          {/* Left wall gradient */}
          <linearGradient id="wall-left" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#060012" />
            <stop offset="100%" stopColor="#04000c" />
          </linearGradient>

          {/* Right wall gradient */}
          <linearGradient id="wall-right" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#04000c" />
            <stop offset="100%" stopColor="#060012" />
          </linearGradient>

          {/* Floor reflection gradient */}
          <linearGradient id="reflect-left" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9900ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#9900ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="reflect-right" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ccff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00ccff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── CEILING ── */}
        <polygon points="0,0 390,0 255,340 135,340" fill="url(#ceil-grad)" />

        {/* ── LEFT WALL ── */}
        <polygon points="0,0 135,340 0,844" fill="url(#wall-left)" />

        {/* ── RIGHT WALL ── */}
        <polygon points="390,0 255,340 390,844" fill="url(#wall-right)" />

        {/* ── FLOOR ── */}
        <polygon points="135,340 255,340 390,844 0,844" fill="url(#floor-grad)" />

        {/* ── Perspective grid lines on floor ── */}
        {/* Vanishing point: (195, 340) */}
        {[0.18, 0.34, 0.52, 0.7].map((t, i) => {
          const lx = t * 390;
          const rx = 390 - t * 390;
          const yBot = 844;
          const vx = 195, vy = 340;
          return (
            <g key={i} opacity={0.07 + i * 0.015}>
              <line x1={vx} y1={vy} x2={lx} y2={yBot} stroke="#9944ff" strokeWidth="1" />
              <line x1={vx} y1={vy} x2={rx} y2={yBot} stroke="#9944ff" strokeWidth="1" />
            </g>
          );
        })}

        {/* Horizontal floor grid lines */}
        {[0.18, 0.36, 0.56, 0.78].map((t, i) => {
          const y = 340 + t * (844 - 340);
          const spread = t * 195;
          const lx = 195 - spread;
          const rx = 195 + spread;
          return (
            <line key={i} x1={lx} y1={y} x2={rx} y2={y}
              stroke="#9944ff" strokeWidth="0.8" opacity={0.06 + i * 0.02} />
          );
        })}

        {/* ── Perspective grid on ceiling ── */}
        {[0.2, 0.42, 0.64].map((t, i) => {
          const lx = t * 195;
          const rx = 390 - lx;
          return (
            <g key={i} opacity={0.05 + i * 0.01}>
              <line x1={195} y1={340} x2={lx} y2={0} stroke="#6600cc" strokeWidth="0.8" />
              <line x1={195} y1={340} x2={rx} y2={0} stroke="#6600cc" strokeWidth="0.8" />
            </g>
          );
        })}

        {/* ── Ceiling neon strip (left) — PURPLE ── */}
        <g className="nfs-neon-left" filter="url(#neon-glow)">
          <line x1="0" y1="2" x2="135" y2="340" stroke="#cc44ff" strokeWidth="2.5" />
          <line x1="0" y1="2" x2="135" y2="340" stroke="#aa00ff" strokeWidth="1" opacity="0.9" />
        </g>

        {/* ── Ceiling neon strip (right) — CYAN ── */}
        <g className="nfs-neon-right" filter="url(#neon-glow)">
          <line x1="390" y1="2" x2="255" y2="340" stroke="#44ccff" strokeWidth="2.5" />
          <line x1="390" y1="2" x2="255" y2="340" stroke="#0099ee" strokeWidth="1" opacity="0.9" />
        </g>

        {/* ── Wall neon strip (left wall, horizontal at mid-height) ── */}
        <g className="nfs-neon-left">
          <line x1="2" y1="422" x2="75" y2="422" stroke="#cc44ff" strokeWidth="1.5" filter="url(#neon-glow-sm)" />
          <line x1="2" y1="422" x2="75" y2="422" stroke="#ffffff" strokeWidth="0.5" opacity="0.6" />
          {/* Second strip lower */}
          <line x1="2" y1="590" x2="42" y2="590" stroke="#cc44ff" strokeWidth="1.5" filter="url(#neon-glow-sm)" />
        </g>

        {/* ── Wall neon strip (right wall) ── */}
        <g className="nfs-neon-right">
          <line x1="388" y1="422" x2="315" y2="422" stroke="#44ccff" strokeWidth="1.5" filter="url(#neon-glow-sm)" />
          <line x1="388" y1="422" x2="315" y2="422" stroke="#ffffff" strokeWidth="0.5" opacity="0.6" />
          <line x1="388" y1="590" x2="348" y2="590" stroke="#44ccff" strokeWidth="1.5" filter="url(#neon-glow-sm)" />
        </g>

        {/* ── Pillars (left) ── */}
        <polygon points="0,0 18,0 85,340 66,340" fill="#0a001a" opacity="0.9" />
        <line x1="18" y1="0" x2="85" y2="340" stroke="#9900ff" strokeWidth="1.2" opacity="0.5" filter="url(#neon-glow-sm)" />

        {/* ── Pillars (right) ── */}
        <polygon points="390,0 372,0 305,340 324,340" fill="#0a001a" opacity="0.9" />
        <line x1="372" y1="0" x2="305" y2="340" stroke="#00aaff" strokeWidth="1.2" opacity="0.5" filter="url(#neon-glow-sm)" />

        {/* ── Floor neon edge lines ── */}
        {/* Left floor edge neon */}
        <g className="nfs-neon-left">
          <line x1="135" y1="340" x2="0" y2="844" stroke="#9900ff" strokeWidth="1.8" filter="url(#neon-glow-sm)" opacity="0.85" />
          <line x1="135" y1="340" x2="0" y2="844" stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
        </g>

        {/* Right floor edge neon */}
        <g className="nfs-neon-right">
          <line x1="255" y1="340" x2="390" y2="844" stroke="#00ccff" strokeWidth="1.8" filter="url(#neon-glow-sm)" opacity="0.85" />
          <line x1="255" y1="340" x2="390" y2="844" stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
        </g>

        {/* ── Floor neon reflection strips (wet concrete effect) ── */}
        {/* Left reflection */}
        <g className="nfs-neon-left" opacity="0.5">
          <line x1="135" y1="345" x2="0" y2="849" stroke="#9900ff" strokeWidth="8" filter="url(#floor-glow)" opacity="0.3" />
        </g>
        {/* Right reflection */}
        <g className="nfs-neon-right" opacity="0.5">
          <line x1="255" y1="345" x2="390" y2="849" stroke="#00ccff" strokeWidth="8" filter="url(#floor-glow)" opacity="0.25" />
        </g>

        {/* ── Ambient purple glow at vanishing point ── */}
        <ellipse cx="195" cy="330" rx="180" ry="120" fill="#8800cc" opacity="0.1" filter="url(#ambient)" className="nfs-glow-pulse" />
        <ellipse cx="195" cy="330" rx="80" ry="50" fill="#aa44ff" opacity="0.15" filter="url(#ambient)" />

        {/* ── Ceiling center neon seam ── */}
        <g className="nfs-neon-left" filter="url(#neon-glow)">
          <line x1="195" y1="0" x2="195" y2="340" stroke="#cc44ff" strokeWidth="1" opacity="0.4" />
        </g>

        {/* ── Floor center neon seam ── */}
        <g className="nfs-neon-right" filter="url(#neon-glow-sm)">
          <line x1="195" y1="340" x2="195" y2="844" stroke="#6622aa" strokeWidth="1" opacity="0.35" />
        </g>

        {/* ── Horizontal ceiling bands ── */}
        {[80, 160, 240].map((y, i) => {
          const t = y / 340;
          const half = t * 130;
          const lx = 195 - half - (1 - t) * 195;
          const rx = 195 + half + (1 - t) * 195;
          return (
            <line key={i} x1={lx} y1={y} x2={rx} y2={y}
              stroke="#5500aa" strokeWidth="0.7" opacity={0.12 - i * 0.03} />
          );
        })}

        {/* ── Scanline vignette overlay ── */}
        <rect width="390" height="844"
          fill="none"
          stroke="transparent"
          style={{
            background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 3px)"
          }}
          opacity="0.5"
        />

        {/* ── Corner darkness vignette ── */}
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="30%" stopColor="transparent" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
          </radialGradient>
        </defs>
        <rect width="390" height="844" fill="url(#vignette)" />
      </svg>

      {/* Scanlines overlay (CSS) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 4px)",
          zIndex: 1,
        }}
      />
    </>
  );
}

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
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      {/* ── NFS Underground garage background ── */}
      <NFSBackground />

      {/* ── Top bar ── */}
      <div className="relative z-10 pt-12 px-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Avatar — click to upload */}
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
              {/* Camera overlay hint */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>

          <div>
            <p className="text-white/40 text-[10px] font-medium leading-none mb-0.5">
              {user?.role === "organizer" ? "Организатор" : user?.role === "participant" ? "Участник" : "Зритель"}
            </p>
            {/* Nick — not a link, just text */}
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

      {/* ── Car image — center ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-4">
        {!carsLoading && (activeCar || user?.role !== "viewer") ? (
          <div className="relative w-full">
            <img
              key={activeCar?.id}
              src={carDisplayUrl}
              alt="My Car"
              className="w-full max-h-[44vh] object-contain transition-opacity duration-300"
              style={{ filter: "drop-shadow(0 8px 32px rgba(153,0,255,0.35)) drop-shadow(0 2px 12px rgba(0,170,255,0.2))" }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}images/default-car.png`;
              }}
            />
            {/* AI status badge */}
            {showAiBadge && activeCar && (
              <div className="absolute top-2 right-2">
                <span className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-lg border",
                  AI_STATUS_BADGE[activeCar.aiStatus]?.color ?? "bg-white/10 text-white/50 border-white/10"
                )}>
                  {AI_STATUS_BADGE[activeCar.aiStatus]?.label ?? activeCar.aiStatus}
                </span>
              </div>
            )}
          </div>
        ) : user?.role === "viewer" ? (
          <div className="flex flex-col items-center text-center gap-3">
            <Car className="w-20 h-20 text-white/10" />
            <p className="text-white/30 text-sm">Режим зрителя</p>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/15 flex items-center justify-center">
            <Plus className="w-8 h-8 text-white/25" />
          </div>
        )}
      </div>

      {/* ── Bottom: car info + car switcher + applications ── */}
      <div className="relative z-10 flex-shrink-0 px-5 pb-28">

        {activeCar && (
          <div className="mb-4">
            <span className="inline-flex bg-primary/90 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider mb-2">
              {activeCar.isPrimary ? "Основное авто" : "Второй автомобиль"}
            </span>
            <h1 className="text-4xl font-black text-white leading-tight">
              {activeCar.make} <span className="text-white/60 font-bold">{activeCar.model}</span>
            </h1>
            <p className="text-white/35 text-sm mt-0.5">
              {[activeCar.year && `${activeCar.year} г.`, activeCar.color].filter(Boolean).join(" · ")}
            </p>
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
              {apps.slice(0, 2).map(app => (
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
