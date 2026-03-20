import { useLocation, Link } from "wouter";
import { useGetMyCars, useGetMyApplications, useGetMe } from "@workspace/api-client-react";
import { Plus, ChevronRight, Settings } from "lucide-react";
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
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Dark bg + car image centered/contained so whole car is visible */}
      <div className="absolute inset-0 bg-[#0d0d0d]">
        {!carsLoading && (primaryCar || user?.role !== "viewer") && (
          <img
            src={carPhoto}
            alt="My Car"
            className="w-full h-full object-contain"
            style={{ objectPosition: "center 42%" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        {/* Gradient: darken top and bottom, leave middle clear */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.0) 28%, rgba(13,13,13,0.0) 52%, rgba(13,13,13,0.88) 72%, rgba(13,13,13,1) 100%)"
        }} />
      </div>

      {/* Top bar: avatar + name + settings */}
      <div className="relative z-10 pt-12 px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/profile")}
            className="w-11 h-11 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center font-black text-lg text-primary shadow-glow backdrop-blur-md active:scale-90 transition-all"
          >
            {user?.displayName?.[0]?.toUpperCase() || "?"}
          </button>
          <div>
            <p className="text-white/50 text-xs font-medium leading-none mb-0.5">
              {user?.role === "organizer" ? "Организатор" : user?.role === "participant" ? "Участник" : "Зритель"}
            </p>
            <h2 className="text-xl font-black text-white leading-none">
              {user?.displayName || "Гараж"}
            </h2>
          </div>
        </div>
        <button
          onClick={() => setLocation("/profile")}
          className="w-10 h-10 glass-panel rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 active:scale-90 transition-all"
        >
          <Settings className="w-4.5 h-4.5 text-white/60" />
        </button>
      </div>

      {user?.role === "viewer" && (
        <div className="relative z-10 mt-[28vh] px-5 flex flex-col items-center text-center">
          <h3 className="text-3xl font-black text-white mb-2">Режим зрителя</h3>
          <p className="text-white/50 text-sm">Найдите события и присоединяйтесь</p>
          <button
            onClick={() => setLocation("/events")}
            className="mt-6 px-8 py-3 bg-primary rounded-2xl font-black text-white shadow-glow active:scale-95 transition-all"
          >
            Найти события
          </button>
        </div>
      )}

      {/* Bottom content: car info + applications */}
      <div className="relative z-10 absolute bottom-0 left-0 right-0 px-5 pb-28">

        {/* Car name block */}
        {primaryCar && (
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 bg-primary/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-xl mb-2 shadow-glow uppercase tracking-wider">
              Основное авто
            </div>
            <h1 className="text-4xl font-black text-white leading-tight drop-shadow-2xl">
              {primaryCar.make} <span className="text-white/70">{primaryCar.model}</span>
            </h1>
            {primaryCar.year && (
              <p className="text-white/40 text-sm font-medium mt-0.5">{primaryCar.year} г.{primaryCar.color ? ` · ${primaryCar.color}` : ""}</p>
            )}
          </div>
        )}

        {!primaryCar && !carsLoading && user?.role !== "viewer" && (
          <div className="mb-4 flex flex-col items-start">
            <h3 className="text-2xl font-black text-white mb-1">Добавьте авто</h3>
            <p className="text-white/50 text-sm mb-4">Покажите свой проект сообществу</p>
            <button className="px-8 py-3 bg-primary rounded-2xl font-black text-white shadow-glow active:scale-95 transition-all">
              + Добавить авто
            </button>
          </div>
        )}

        {/* My applications */}
        {!appsLoading && apps && apps.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-black text-white">Мои заявки</h3>
              <Link href="/profile" className="text-xs text-primary font-bold">Все</Link>
            </div>
            <div className="flex flex-col gap-2">
              {apps.slice(0, 2).map(app => (
                <div
                  key={app.id}
                  className="glass-panel backdrop-blur-xl rounded-2xl p-3.5 flex items-center justify-between border border-white/8"
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

        {/* No apps CTA */}
        {!appsLoading && (!apps || apps.length === 0) && (
          <button
            onClick={() => setLocation("/events")}
            className="w-full glass-panel backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between border border-white/8 active:scale-[0.98] transition-all"
          >
            <div>
              <p className="font-black text-white text-sm">Нет активных заявок</p>
              <p className="text-white/40 text-xs mt-0.5">Найдите события → запишитесь</p>
            </div>
            <div className="w-9 h-9 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-primary" />
            </div>
          </button>
        )}
      </div>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}
