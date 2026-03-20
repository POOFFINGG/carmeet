import { useLocation, Link } from "wouter";
import { useGetMyCars, useGetMyApplications, useGetMe } from "@workspace/api-client-react";
import { Plus, ChevronRight, Settings, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/Navigation";

export default function Garage() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: cars, isLoading: carsLoading } = useGetMyCars({ query: { enabled: !!user && user.role !== "viewer" } });
  const { data: apps, isLoading: appsLoading } = useGetMyApplications({ query: { enabled: !!user } });

  const primaryCar = cars?.find(c => c.isPrimary) || cars?.[0];
  const carPhoto = primaryCar?.photoUrl || `${import.meta.env.BASE_URL}images/default-car.png`;

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">

      {/* ── Static dark background ── */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 60%, #1a1a2e 0%, #0d0d0d 70%)"
        }}
      />
      {/* Subtle grid lines for garage feel */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* ── Top bar: avatar + name + settings ── */}
      <div className="relative z-10 pt-12 px-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/profile")}
            className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center font-black text-base text-primary active:scale-90 transition-all"
          >
            {user?.displayName?.[0]?.toUpperCase() || "?"}
          </button>
          <div>
            <p className="text-white/40 text-[10px] font-medium leading-none mb-0.5">
              {user?.role === "organizer" ? "Организатор" : user?.role === "participant" ? "Участник" : "Зритель"}
            </p>
            <h2 className="text-lg font-black text-white leading-none">{user?.displayName || "Гараж"}</h2>
          </div>
        </div>
        <button
          onClick={() => setLocation("/settings")}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 active:scale-90 transition-all"
        >
          <Settings className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* ── Car PNG — center of screen ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        {!carsLoading && (primaryCar || user?.role !== "viewer") ? (
          <img
            src={carPhoto}
            alt="My Car"
            className="w-full max-h-[46vh] object-contain drop-shadow-[0_20px_60px_rgba(229,57,53,0.25)]"
            onError={(e) => {
              e.currentTarget.src = "";
              e.currentTarget.style.display = "none";
            }}
          />
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

      {/* ── Bottom overlay: all text + applications ── */}
      <div className="relative z-10 flex-shrink-0 px-5 pb-28">

        {/* Car info */}
        {primaryCar && (
          <div className="mb-5">
            <span className="inline-flex bg-primary/90 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider mb-2">
              Основное авто
            </span>
            <h1 className="text-4xl font-black text-white leading-tight">
              {primaryCar.make} <span className="text-white/60 font-bold">{primaryCar.model}</span>
            </h1>
            <p className="text-white/35 text-sm mt-0.5">
              {[primaryCar.year && `${primaryCar.year} г.`, primaryCar.color].filter(Boolean).join(" · ")}
            </p>
          </div>
        )}

        {!primaryCar && !carsLoading && user?.role !== "viewer" && (
          <div className="mb-5">
            <h3 className="text-2xl font-black text-white mb-1">Добавьте авто</h3>
            <p className="text-white/40 text-sm mb-4">Покажите свой проект сообществу</p>
            <button className="px-7 py-3 bg-primary rounded-2xl font-black text-white active:scale-95 transition-all">
              + Добавить авто
            </button>
          </div>
        )}

        {user?.role === "viewer" && (
          <div className="mb-5">
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
                <div
                  key={app.id}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl p-3.5 flex items-center justify-between border border-white/8"
                >
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
