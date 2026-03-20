import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { useGetEvents, EventCategory } from "@workspace/api-client-react";
import { MapPin, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "Все" },
  { id: EventCategory.motorsport, label: "Автоспорт" },
  { id: EventCategory.exhibition, label: "Выставки" },
  { id: EventCategory.cruise, label: "Покатушки" },
  { id: EventCategory.club, label: "Автоклубы" },
];

const cities = ["Все города", "Рига", "Юрмала", "Лиепая", "Даугавпилс", "Вентспилс"];

export default function Calendar() {
  const [activeCat, setActiveCat] = useState("all");
  const [activeCity, setActiveCity] = useState("Все города");
  
  const { data: events, isLoading } = useGetEvents({ 
    query: { queryKey: ["/api/events", activeCat !== "all" ? { category: activeCat } : {}] } 
  });

  const filteredEvents = events?.filter(ev => {
    if (activeCity === "Все города") return true;
    return ev.location.toLowerCase().includes(activeCity.toLowerCase());
  });

  return (
    <Layout>
      <div className="pt-12 px-4 pb-4">
        <div className="flex justify-between items-center mb-6 px-2">
          <h1 className="text-3xl font-black text-gradient">Мероприятия</h1>
          <Link href="/events/create">
            <button className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-glow text-white">
              <Plus className="w-6 h-6" />
            </button>
          </Link>
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 mb-2 px-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300",
                activeCat === c.id 
                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                  : "glass-panel text-white/70 hover:text-white"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Cities Filter */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 px-2">
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setActiveCity(city)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-300",
                activeCity === city 
                  ? "bg-white/20 text-white" 
                  : "bg-white/5 border border-white/5 text-white/60 hover:text-white"
              )}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4 pb-12 flex flex-col gap-4">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-40 rounded-3xl bg-secondary animate-pulse" />)
        ) : filteredEvents?.length ? (
          filteredEvents.map((ev) => (
            <Link key={ev.id} href={`/events/${ev.id}`}>
              <div className="group relative w-full rounded-3xl overflow-hidden glass-panel border border-white/5 hover:border-primary/50 transition-colors cursor-pointer block">
                {/* Event Image Placeholder using Unsplash */}
                <img 
                  src={ev.coverImageUrl || "https://images.unsplash.com/photo-1511407397940-d57f68e81203?w=800&q=80"} 
                  alt={ev.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent" />
                
                <div className="relative p-5 h-full flex flex-col justify-end min-h-[180px]">
                  <div className="flex gap-2 mb-auto">
                    <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider backdrop-blur-md">
                      {categories.find(c => c.id === ev.category)?.label || ev.category}
                    </span>
                    <span className="glass-panel text-white text-[10px] font-bold px-2 py-1 rounded-md">
                      {format(new Date(ev.date), "d MMM, HH:mm", { locale: ru })}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-primary transition-colors">
                    {ev.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs font-medium text-white/60">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {ev.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {ev.applicationsCount} / {ev.maxParticipants || "∞"}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            В этой категории нет мероприятий.
          </div>
        )}
      </div>
    </Layout>
  );
}
