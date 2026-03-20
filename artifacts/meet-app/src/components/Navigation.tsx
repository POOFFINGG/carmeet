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

  const tabs = [
    { href: "/notifications", icon: Bell, label: "Уведомл." },
    { href: "/events", icon: Calendar, label: "Календарь" },
    { href: "/garage", label: "Гараж", isGarage: true },
    { href: "/map", icon: MapIcon, label: "Карта" },
    { href: "/news", icon: Newspaper, label: "Новости", external: true, externalHref: "https://t.me/AutoEventsLV" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full mx-4 mb-4 max-w-md">
        <div className="flex items-center justify-between backdrop-blur-3xl bg-black/60 border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] px-1 py-1">
          {tabs.map((tab) => {
            const isActive = location === tab.href;

            if (tab.isGarage) {
              return (
                <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 outline-none">
                  <div className={cn(
                    "w-9 h-9 rounded-full overflow-hidden border-2 transition-all active:scale-90",
                    isGarageActive ? "border-primary shadow-[0_0_16px_rgba(229,57,53,0.6)]" : "border-white/20"
                  )}>
                    {primaryCar?.photoUrl ? (
                      <img src={primaryCar.photoUrl} alt="Car" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#2a2a2a] flex items-center justify-center relative">
                        <img
                          src={`${import.meta.env.BASE_URL}images/default-car.png`}
                          alt="Car"
                          className="w-full h-full object-cover opacity-60"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                        <Car className="w-4 h-4 text-primary absolute" />
                      </div>
                    )}
                  </div>
                  <span className={cn("text-[9px] font-semibold", isGarageActive ? "text-primary" : "text-white/40")}>
                    Гараж
                  </span>
                  {isGarageActive && <div className="w-1 h-1 rounded-full bg-primary" />}
                </Link>
              );
            }

            const Icon = tab.icon!;
            const inner = (
              <>
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-white/40")} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("text-[9px] font-semibold", isActive ? "text-primary" : "text-white/30")}>{tab.label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-primary" />}
              </>
            );

            if (tab.external) {
              return (
                <a key={tab.href} href={tab.externalHref} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 outline-none">
                  {inner}
                </a>
              );
            }
            return (
              <Link key={tab.href} href={tab.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 outline-none">
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
