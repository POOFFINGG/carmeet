import { useLocation, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useGetMyCars, useGetMyApplications, useGetMe } from "@workspace/api-client-react";
import { Plus, ChevronRight, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Garage() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: cars, isLoading: carsLoading } = useGetMyCars({ query: { enabled: !!user && user.role !== "viewer" } });
  const { data: apps, isLoading: appsLoading } = useGetMyApplications({ query: { enabled: !!user } });

  return (
    <Layout>
      <div className="pt-12 px-6 pb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLocation("/profile")}
            className="w-10 h-10 rounded-full bg-secondary border border-white/10 flex items-center justify-center text-primary font-black text-lg shadow-glow"
          >
            {user?.displayName?.[0] || "U"}
          </button>
          <div>
            <h1 className="text-3xl font-black text-gradient">Гараж</h1>
            <p className="text-muted-foreground font-medium text-sm mt-1">С возвращением, {user?.displayName}</p>
          </div>
        </div>
        <Button variant="glass" size="icon" className="rounded-full">
          <Settings className="w-5 h-5 text-white/70" />
        </Button>
      </div>

      <div className="px-6 mb-8">
        {user?.role === "viewer" ? (
          <div className="w-full aspect-video rounded-3xl relative overflow-hidden glass-panel flex flex-col items-center justify-center text-center p-6 border-white/20">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
              <Zap size={36} />
            </div>
            <h3 className="text-2xl font-bold">Режим зрителя</h3>
            <p className="text-muted-foreground mt-2 text-sm">Найдите события и присоединяйтесь.</p>
          </div>
        ) : carsLoading ? (
          <div className="w-full aspect-video rounded-3xl bg-secondary animate-pulse" />
        ) : cars?.length ? (
          <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden group shadow-2xl shadow-black">
            <img 
              src={cars[0].photoUrl || `${import.meta.env.BASE_URL}images/default-car.png`} 
              alt="My Car" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="inline-block px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg mb-2 shadow-glow uppercase tracking-wider">
                Основное авто
              </div>
              <h2 className="text-3xl font-black text-white">{cars[0].make}</h2>
              <p className="text-white/80 font-medium">{cars[0].model}</p>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video rounded-3xl glass-panel flex flex-col items-center justify-center p-6 text-center border-dashed border-2 border-white/20">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Plus size={24} className="text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg mb-1">Добавьте первый автомобиль</h3>
            <p className="text-sm text-muted-foreground mb-4">Покажите свой проект сообществу</p>
            <Button size="sm">Добавить авто</Button>
          </div>
        )}
      </div>

      <div className="px-6 space-y-6">
        <div className="flex justify-between items-end">
          <h3 className="text-xl font-bold">Мои заявки</h3>
          <Link href="/profile" className="text-sm text-primary font-bold hover:underline">Все</Link>
        </div>

        <div className="space-y-3">
          {appsLoading ? (
            <div className="h-20 bg-secondary rounded-2xl animate-pulse" />
          ) : apps?.length ? (
            apps.map(app => (
              <div key={app.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">{app.eventTitle || "Событие"}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 capitalize">
                      {app.type === "viewer" ? "Зритель" : "Участник"}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded font-bold",
                      app.status === "approved" ? "bg-green-500/20 text-green-400" :
                      app.status === "rejected" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    )}>
                      {app.status === "approved" ? "Одобрено" : app.status === "rejected" ? "Отклонено" : "На рассмотрении"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground w-5 h-5" />
              </div>
            ))
          ) : (
            <div className="text-center py-8 glass-panel rounded-2xl">
              <p className="text-muted-foreground font-medium">Нет активных заявок</p>
              <Link href="/events">
                <Button variant="outline" size="sm" className="mt-4">Найти события</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
