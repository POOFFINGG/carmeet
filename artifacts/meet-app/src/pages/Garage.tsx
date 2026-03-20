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
        @keyframes mw-lamp {
          0%,100% { opacity:1 }
          82%      { opacity:1 }
          83%      { opacity:0.88 }
          84%      { opacity:1 }
          91%      { opacity:0.94 }
          92%      { opacity:1 }
        }
        @keyframes mw-dust {
          0%   { opacity:0; transform:translateY(0) translateX(0); }
          20%  { opacity:0.5; }
          100% { opacity:0; transform:translateY(-60px) translateX(12px); }
        }
        .mw-lamp { animation: mw-lamp 9s infinite; }
        .mw-dust-a { animation: mw-dust 5s 0s infinite; }
        .mw-dust-b { animation: mw-dust 6s 1.8s infinite; }
        .mw-dust-c { animation: mw-dust 4.5s 3.2s infinite; }
      `}</style>

      {/* Base */}
      <div className="absolute inset-0" style={{ background: "#0b0b08" }} />

      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main spotlight from lamp */}
          <radialGradient id="g-lamp" cx="50%" cy="0%" r="75%" fx="50%" fy="2%">
            <stop offset="0%"   stopColor="#d4aa60" stopOpacity="0.45" />
            <stop offset="30%"  stopColor="#a07838" stopOpacity="0.18" />
            <stop offset="70%"  stopColor="#604520" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Floor gradient */}
          <linearGradient id="g-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#242118" />
            <stop offset="40%"  stopColor="#1a1813" />
            <stop offset="100%" stopColor="#0d0c09" />
          </linearGradient>

          {/* Floor center light patch */}
          <radialGradient id="g-floor-light" cx="50%" cy="5%" r="65%">
            <stop offset="0%"   stopColor="#9a7830" stopOpacity="0.22" />
            <stop offset="55%"  stopColor="#604820" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Back wall gradient */}
          <linearGradient id="g-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#252420" />
            <stop offset="100%" stopColor="#1a1916" />
          </linearGradient>

          {/* Left wall (side) */}
          <linearGradient id="g-wl" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0d0c0a" />
            <stop offset="100%" stopColor="#1a1916" />
          </linearGradient>

          {/* Right wall (side) */}
          <linearGradient id="g-wr" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#1a1916" />
            <stop offset="100%" stopColor="#0d0c0a" />
          </linearGradient>

          {/* Ceiling */}
          <linearGradient id="g-ceil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#131210" />
            <stop offset="100%" stopColor="#0f0e0c" />
          </linearGradient>

          {/* Vignette */}
          <radialGradient id="g-vig" cx="50%" cy="48%" r="62%">
            <stop offset="20%"  stopColor="transparent" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.92" />
          </radialGradient>

          {/* Soft blur */}
          <filter id="f-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="f-med"  x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* ═══ BASE FILL ═══ */}
        <rect width="390" height="844" fill="#0b0b08" />

        {/* ═══ GEOMETRY: ceiling / walls / floor ═══ */}
        {/* VP at (195, 310) */}

        {/* Ceiling trapezoid */}
        <polygon points="0,0 390,0 300,310 90,310" fill="url(#g-ceil)" />

        {/* Left side wall */}
        <polygon points="0,0 90,310 0,844" fill="url(#g-wl)" />

        {/* Right side wall */}
        <polygon points="390,0 300,310 390,844" fill="url(#g-wr)" />

        {/* Back wall (center trapezoid going to horizon) */}
        <polygon points="30,0 360,0 300,310 90,310" fill="url(#g-wall)" />

        {/* Floor */}
        <polygon points="0,310 390,310 390,844 0,844" fill="url(#g-floor)" />

        {/* ═══ BACK WALL DETAILS ═══ */}

        {/* Horizontal panel seams */}
        {[55, 120, 185, 248, 295].map((y, i) => {
          const shrink = y / 310;
          const x1 = 30 + shrink * 165;
          const x2 = 360 - shrink * 165;
          return (
            <line key={i} x1={x1} y1={y} x2={x2} y2={y}
              stroke="#2e2c26" strokeWidth={1.5 - i * 0.18} opacity={0.7 - i * 0.06} />
          );
        })}

        {/* Vertical corrugation lines on back wall */}
        {[-2, -1, 0, 1, 2].map((off, i) => {
          const bx = 195 + off * 52;
          const tx = 195 + off * 68;
          return (
            <line key={i} x1={bx} y1={310} x2={tx} y2={0}
              stroke="#232118" strokeWidth="1" opacity={0.5 - Math.abs(off) * 0.08} />
          );
        })}

        {/* Large graffiti X mark on wall — very dark */}
        <g opacity="0.35" transform="translate(68,100) rotate(-8)">
          <line x1="0" y1="0" x2="28" y2="38" stroke="#1e1d1a" strokeWidth="6" strokeLinecap="round" />
          <line x1="28" y1="0" x2="0" y2="38" stroke="#1e1d1a" strokeWidth="6" strokeLinecap="round" />
        </g>
        {/* Spray marks right side */}
        <g opacity="0.25" transform="translate(280,160)">
          <line x1="0" y1="0" x2="22" y2="0" stroke="#201f1c" strokeWidth="4" strokeLinecap="round" />
          <line x1="0" y1="9" x2="18" y2="9" stroke="#201f1c" strokeWidth="4" strokeLinecap="round" />
          <line x1="0" y1="18" x2="22" y2="18" stroke="#201f1c" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Warning tape strip at floor-wall junction */}
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={i} x={i * 28} y={307} width="14" height="5"
            fill="#3a3010" opacity="0.6" />
        ))}

        {/* ═══ CEILING ELEMENTS ═══ */}

        {/* Main horizontal duct (fat, center-left) */}
        <rect x="0" y="8" width="260" height="26" fill="#232220" rx="2" />
        <rect x="0" y="8" width="260" height="3" fill="#302e28" opacity="0.7" />
        <rect x="0" y="31" width="260" height="3" fill="#141310" opacity="0.9" />

        {/* Second duct (right, thinner) */}
        <rect x="180" y="44" width="210" height="18" fill="#1e1d1b" rx="2" />
        <rect x="180" y="44" width="210" height="2" fill="#2a2926" opacity="0.7" />
        <rect x="180" y="60" width="210" height="2" fill="#111110" opacity="0.9" />

        {/* Small pipe cross-brace */}
        <rect x="120" y="70" width="150" height="10" fill="#1b1a18" rx="1" />

        {/* Perspective pipes going to VP */}
        {[
          { x1: 72,  y1: 0, x2: 95,  y2: 310, w: 10 },
          { x1: 318, y1: 0, x2: 295, y2: 310, w: 10 },
          { x1: 38,  y1: 0, x2: 125, y2: 310, w: 7  },
          { x1: 352, y1: 0, x2: 265, y2: 310, w: 7  },
        ].map((p, i) => (
          <g key={i}>
            <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
              stroke="#252421" strokeWidth={p.w} strokeLinecap="square" />
            <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
              stroke="#181714" strokeWidth={p.w * 0.35} strokeLinecap="square"
              strokeDasharray="0" opacity="0.8" />
          </g>
        ))}

        {/* ═══ LAMP FIXTURE ═══ */}
        <g className="mw-lamp">
          {/* Hanging cable */}
          <line x1="195" y1="0" x2="195" y2="32" stroke="#1a1916" strokeWidth="3" />
          {/* Lamp housing */}
          <rect x="171" y="32" width="48" height="16" fill="#2a2824" rx="3" />
          <rect x="175" y="48" width="40" height="10" fill="#232120" rx="2" />
          {/* Bulb glow */}
          <ellipse cx="195" cy="58" rx="10" ry="5" fill="#d4aa60" opacity="0.9" />
          <ellipse cx="195" cy="58" rx="18" ry="9" fill="#c09040" opacity="0.4" filter="url(#f-med)" />
          {/* Light cone */}
          <polygon points="175,58 80,390 310,390" fill="url(#g-lamp)" />
          {/* Soft secondary cone */}
          <ellipse cx="195" cy="370" rx="130" ry="35"
            fill="#c09040" opacity="0.07" filter="url(#f-soft)" />
        </g>

        {/* ═══ FLOOR DETAILS ═══ */}

        {/* Floor perspective lines */}
        {[-3.2, -2.2, -1.2, 0, 1.2, 2.2, 3.2].map((m, i) => (
          <line key={i}
            x1={195} y1={310}
            x2={195 + m * 65} y2={844}
            stroke="#2a2820" strokeWidth="0.8" opacity="0.5" />
        ))}

        {/* Horizontal floor grid */}
        {[0.12, 0.26, 0.44, 0.64, 0.85].map((t, i) => {
          const y = 310 + t * 534;
          const s = t * 195;
          return (
            <line key={i} x1={195 - s} y1={y} x2={195 + s} y2={y}
              stroke="#282620" strokeWidth="0.7" opacity={0.35 + i * 0.06} />
          );
        })}

        {/* Oil/grease stains */}
        <ellipse cx="160" cy="510" rx="32" ry="11" fill="#080807" opacity="0.65" />
        <ellipse cx="245" cy="620" rx="24" ry="9"  fill="#090907" opacity="0.55" />
        <ellipse cx="195" cy="730" rx="42" ry="14" fill="#070706" opacity="0.7"  />
        <ellipse cx="120" cy="700" rx="18" ry="6"  fill="#080807" opacity="0.45" />

        {/* Floor light reflection */}
        <rect x="0" y="310" width="390" height="534" fill="url(#g-floor-light)" />

        {/* ═══ LEFT SIDE — Shelves & Barrels ═══ */}

        {/* Metal cabinet */}
        <rect x="0" y="190" width="62" height="140" fill="#181714" rx="1" />
        <rect x="3" y="193" width="56" height="134" fill="#1c1b18" rx="1" />
        {[220, 252, 284].map((y, i) => (
          <line key={i} x1="3" y1={y} x2="59" y2={y} stroke="#232120" strokeWidth="1.5" opacity="0.9" />
        ))}
        {/* Items on shelves */}
        <rect x="6"  y="196" width="14" height="21" fill="#201f1c" opacity="0.9" rx="1" />
        <rect x="23" y="198" width="18" height="19" fill="#1e1d1a" opacity="0.9" rx="1" />
        <rect x="44" y="200" width="12" height="17" fill="#1f1e1b" opacity="0.9" rx="1" />
        <rect x="6"  y="228" width="22" height="18" fill="#1d1c1a" opacity="0.8" />
        <rect x="32" y="230" width="16" height="16" fill="#1e1d1b" opacity="0.8" />
        <rect x="6"  y="258" width="10" height="20" fill="#1f1e1c" opacity="0.8" />
        <rect x="20" y="260" width="14" height="18" fill="#1e1d1b" opacity="0.8" />

        {/* Workbench */}
        <rect x="0" y="340" width="75" height="9" fill="#28261e" rx="1" />
        <rect x="0" y="349" width="75" height="55" fill="#1c1b18" />
        <rect x="4"  y="404" width="8"  height="90" fill="#181714" />
        <rect x="63" y="404" width="8"  height="90" fill="#181714" />
        {/* Tool on bench */}
        <rect x="8"  y="337" width="30" height="4" fill="#222018" rx="2" />
        <rect x="42" y="334" width="22" height="7" fill="#201f1c" rx="1" />

        {/* Barrel pair */}
        <g>
          <ellipse cx="32" cy="495" rx="30" ry="12" fill="#191816" />
          <rect x="2" y="450" width="60" height="47" fill="#191816" />
          <ellipse cx="32" cy="450" rx="30" ry="11" fill="#222018" />
          {[465, 480].map((y, i) => (
            <line key={i} x1="2" y1={y} x2="62" y2={y} stroke="#252320" strokeWidth="2.5" opacity="0.8" />
          ))}
          {/* Text stencil */}
          <text x="10" y="474" fontSize="8" fill="#141312" fontFamily="monospace" fontWeight="bold">OIL</text>
        </g>

        {/* ═══ RIGHT SIDE — Tire stacks ═══ */}

        {/* Stack 1 — 4 tires */}
        {[3, 2, 1, 0].map((i) => {
          const by = 182 + i * 30;
          return (
            <g key={i}>
              <ellipse cx="365" cy={by + 15} rx="27" ry="10" fill="#111110" />
              <rect x="338" y={by} width="54" height="20" fill="#161513" />
              <ellipse cx="365" cy={by} rx="27" ry="10" fill="#1c1b18" />
              <ellipse cx="365" cy={by} rx="14" ry="5"  fill="#0e0d0c" />
            </g>
          );
        })}

        {/* Stack 2 — 3 tires, leaning */}
        {[2, 1, 0].map((i) => {
          const by = 318 + i * 24;
          return (
            <g key={i} transform={`rotate(${-10 + i * 4} 352 380)`}>
              <ellipse cx="352" cy={by + 12} rx="23" ry="8" fill="#101010" />
              <rect x="329" y={by} width="46" height="17" fill="#141312" />
              <ellipse cx="352" cy={by} rx="23" ry="8" fill="#191817" />
              <ellipse cx="352" cy={by} rx="12" ry="4" fill="#0d0d0c" />
            </g>
          );
        })}

        {/* Single tire leaning against wall */}
        <ellipse cx="330" cy="420" rx="6" ry="25" fill="#161513" transform="rotate(15 330 420)" />
        <ellipse cx="330" cy="420" rx="18" ry="24" fill="#161513" transform="rotate(15 330 420)" />
        <ellipse cx="330" cy="420" rx="8"  ry="11" fill="#0d0d0b" transform="rotate(15 330 420)" />

        {/* Tool cabinet right */}
        <rect x="328" y="450" width="62" height="110" fill="#161513" rx="1" />
        <rect x="331" y="453" width="56" height="104" fill="#191816" rx="1" />
        {[480, 508, 536].map((y, i) => (
          <line key={i} x1="331" y1={y} x2="387" y2={y} stroke="#222018" strokeWidth="1.5" />
        ))}
        {/* Drawer handles */}
        {[493, 521].map((y, i) => (
          <rect key={i} x="353" y={y} width="20" height="3" fill="#282520" rx="1" opacity="0.9" />
        ))}

        {/* ═══ DUST PARTICLES in light beam ═══ */}
        <g className="mw-dust-a">
          <circle cx="182" cy="270" r="1.5" fill="#c8a050" opacity="0.5" />
          <circle cx="208" cy="230" r="1"   fill="#c0a048" opacity="0.4" />
          <circle cx="195" cy="310" r="1.2" fill="#b89040" opacity="0.35" />
        </g>
        <g className="mw-dust-b">
          <circle cx="175" cy="290" r="1.2" fill="#c0a048" opacity="0.45" />
          <circle cx="215" cy="260" r="1.5" fill="#b89040" opacity="0.3" />
        </g>
        <g className="mw-dust-c">
          <circle cx="200" cy="240" r="1"   fill="#c8a850" opacity="0.4" />
          <circle cx="188" cy="300" r="0.8" fill="#b89040" opacity="0.3" />
          <circle cx="210" cy="280" r="1.3" fill="#c09848" opacity="0.35" />
        </g>

        {/* ═══ VIGNETTE ═══ */}
        <rect width="390" height="844" fill="url(#g-vig)" />

        {/* Hard corner shadows */}
        <polygon points="0,0 140,0 0,360"   fill="#000" opacity="0.55" />
        <polygon points="390,0 250,0 390,360" fill="#000" opacity="0.55" />
        <polygon points="0,844 0,580 110,844"   fill="#000" opacity="0.65" />
        <polygon points="390,844 390,580 280,844" fill="#000" opacity="0.65" />
      </svg>

      {/* Film grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
          opacity: 0.045,
          mixBlendMode: "overlay",
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
              style={{ filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.85)) drop-shadow(0 4px 16px rgba(160,120,40,0.25))" }}
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
