import { useLocation, Link } from "wouter";
import { Bell, Calendar, Car, Map as MapIcon, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useGetMyCars, useGetMe } from "@workspace/api-client-react";

export function BottomNav() {
  const [location] = useLocation();
  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: cars } = useGetMyCars({ query: { enabled: !!user && user.role !== "viewer", retry: false } });
  const primaryCar = cars?.find(c => c.isPrimary) || cars?.[0];

  const leftTabs = [
    { href: "/notifications", icon: Bell, label: "Уведомл." },
    { href: "/events", icon: Calendar, label: "Календарь" },
  ];
  const rightTabs = [
    { href: "/map", icon: MapIcon, label: "Карта" },
    { href: "/news", icon: Newspaper, label: "Новости", external: true, externalHref: "https://t.me/AutoEventsLV" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full mx-4 mb-4 max-w-md">
        <div className="relative flex items-end justify-between backdrop-blur-3xl bg-black/50 border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-2 pt-3 pb-2">
          {/* Left tabs */}
          {leftTabs.map(tab => {
            const isActive = location === tab.href;
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center gap-1 py-1 outline-none">
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-white/40")} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("text-[9px] font-medium", isActive ? "text-primary" : "text-white/30")}>{tab.label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-primary" />}
              </Link>
            );
          })}

          {/* Center garage button */}
          <div className="flex-shrink-0 flex flex-col items-center -translate-y-3 mx-2">
            <Link href="/garage">
              <div className={cn(
                "w-16 h-16 rounded-full overflow-hidden border-2 transition-all",
                location === "/garage" ? "border-primary shadow-[0_0_20px_rgba(229,57,53,0.6)]" : "border-white/20 bg-secondary"
              )}>
                {primaryCar?.photoUrl ? (
                  <img src={primaryCar.photoUrl} alt="My Car" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary relative">
                    <img src={`${import.meta.env.BASE_URL}images/default-car.png`} alt="Car" className="w-full h-full object-cover opacity-50" onError={(e) => { e.currentTarget.style.display='none'; }} />
                    <Car className="w-7 h-7 text-primary absolute" />
                  </div>
                )}
              </div>
            </Link>
            <span className={cn("text-[9px] font-medium mt-1", location === "/garage" ? "text-primary" : "text-white/40")}>Гараж</span>
          </div>

          {/* Right tabs */}
          {rightTabs.map(tab => {
            const isActive = location === tab.href;
            const Icon = tab.icon;
            const content = (
              <>
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-white/40")} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("text-[9px] font-medium", isActive ? "text-primary" : "text-white/30")}>{tab.label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-primary" />}
              </>
            );
            if (tab.external) {
              return (
                <a key={tab.href} href={tab.externalHref} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center gap-1 py-1 outline-none">
                  {content}
                </a>
              );
            }
            return (
              <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center gap-1 py-1 outline-none">
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
