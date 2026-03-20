import { useLocation, Link } from "wouter";
import { Bell, Calendar, Car, Map as MapIcon, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetMyCars, useGetMe } from "@workspace/api-client-react";

export function BottomNav() {
  const [location] = useLocation();
  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: cars } = useGetMyCars({
    query: { enabled: !!user && user.role !== "viewer", retry: false },
  });
  const primaryCar = cars?.find((c) => c.isPrimary) || cars?.[0];

  const isGarageActive = location === "/garage";

  const leftTabs = [
    { href: "/notifications", icon: Bell, label: "Уведомл." },
    { href: "/events", icon: Calendar, label: "Календарь" },
  ];
  const rightTabs = [
    { href: "/map", icon: MapIcon, label: "Карта" },
    {
      href: "/news",
      icon: Newspaper,
      label: "Новости",
      external: true,
      externalHref: "https://t.me/AutoEventsLV",
    },
  ];

  const tabClass = "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 outline-none min-w-0";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full mx-4 mb-4 max-w-md relative">

        {/* ── Center garage button — floats ABOVE the bar ── */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 flex flex-col items-center">
          <Link href="/garage" className="outline-none">
            <div
              className={cn(
                "w-14 h-14 rounded-full overflow-hidden border-2 transition-all active:scale-90",
                isGarageActive
                  ? "border-primary shadow-[0_0_20px_rgba(229,57,53,0.6)]"
                  : "border-white/25"
              )}
            >
              {primaryCar?.photoUrl ? (
                <img
                  src={primaryCar.photoUrl}
                  alt="My Car"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#2a2a2a] flex items-center justify-center relative">
                  <img
                    src={`${import.meta.env.BASE_URL}images/default-car.png`}
                    alt="Car"
                    className="w-full h-full object-cover opacity-60"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <Car className="w-6 h-6 text-primary absolute" />
                </div>
              )}
            </div>
          </Link>
          <span
            className={cn(
              "text-[9px] font-bold mt-1",
              isGarageActive ? "text-primary" : "text-white/40"
            )}
          >
            Гараж
          </span>
        </div>

        {/* ── Bar ── */}
        <div className="flex items-center justify-between backdrop-blur-3xl bg-black/55 border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] px-1 py-1">

          {/* Left tabs */}
          {leftTabs.map((tab) => {
            const isActive = location === tab.href;
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href} className={tabClass}>
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-white/40"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[9px] font-semibold",
                    isActive ? "text-primary" : "text-white/30"
                  )}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </Link>
            );
          })}

          {/* Centre spacer — same width as the floating button */}
          <div className="w-16 flex-shrink-0" />

          {/* Right tabs */}
          {rightTabs.map((tab) => {
            const isActive = location === tab.href;
            const Icon = tab.icon;
            const inner = (
              <>
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-white/40"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[9px] font-semibold",
                    isActive ? "text-primary" : "text-white/30"
                  )}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </>
            );

            if (tab.external) {
              return (
                <a
                  key={tab.href}
                  href={tab.externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={tabClass}
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link key={tab.href} href={tab.href} className={tabClass}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
