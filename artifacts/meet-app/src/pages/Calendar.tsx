import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { useGetEvents } from "@workspace/api-client-react";
import { MapPin, Users, Plus, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "Все", emoji: "🏁" },
  { id: "motorsport", label: "Автоспорт", emoji: "🏎" },
  { id: "exhibition", label: "Выставки", emoji: "🚗" },
  { id: "cruise", label: "Покатушки", emoji: "🛣" },
  { id: "club", label: "Автоклубы", emoji: "🔧" },
];

const cities = ["Все города", "Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Краснодар"];

const CATEGORY_COLORS: Record<string, string> = {
  motorsport: "#e53935",
  exhibition: "#1976d2",
  cruise: "#388e3c",
  club: "#f57c00",
};

const EVENT_IMAGES: Record<string, string> = {
  motorsport: "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
  exhibition: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
  cruise: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
  club: "https://images.unsplash.com/photo-1511407397940-d57f68e81203?w=800&q=80",
};

export default function Calendar() {
  const [, setLocation] = useLocation();
  const [activeCat, setActiveCat] = useState("all");
  const [activeCity, setActiveCity] = useState("Все города");

  const { data: events, isLoading } = useGetEvents();

  const filteredEvents = events?.filter(ev => {
    const catMatch = activeCat === "all" || ev.category === activeCat;
    const cityMatch = activeCity === "Все города" || ev.location.toLowerCase().includes(activeCity.toLowerCase());
    return catMatch && cityMatch;
  });

  return (
    <Layout>
      <div className="pt-12 px-4 pb-4">
        <div className="flex justify-between items-center mb-6 px-2">
          <div>
            <h1 className="text-3xl font-black text-gradient">Мероприятия</h1>
            <p className="text-white/40 text-sm mt-0.5">{filteredEvents?.length || 0} событий</p>
          </div>
          <button
            onClick={() => setLocation("/events/create")}
            className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-glow text-white hover:bg-primary/80 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Category filter */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-3 px-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 active:scale-95",
                activeCat === c.id
                  ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                  : "glass-panel text-white/60 hover:text-white"
              )}
            >
              <span className="text-base">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* City filter */}
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-2 px-1">
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setActiveCity(city)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all duration-200 active:scale-95",
                activeCity === city
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-white/5 border border-white/8 text-white/50 hover:text-white/80 hover:border-white/20"
              )}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div className="px-4 pb-8 flex flex-col gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-52 rounded-3xl bg-white/5 animate-pulse" />
          ))
        ) : filteredEvents?.length ? (
          filteredEvents.map((ev) => {
            const color = CATEGORY_COLORS[ev.category] || "#e53935";
            const catLabel = categories.find(c => c.id === ev.category)?.label || ev.category;
            const img = ev.coverImageUrl || EVENT_IMAGES[ev.category] || EVENT_IMAGES.motorsport;

            return (
              <button
                key={ev.id}
                onClick={() => setLocation(`/events/${ev.id}`)}
                className="group w-full text-left relative rounded-3xl overflow-hidden active:scale-[0.98] transition-transform duration-150 cursor-pointer"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
              >
                {/* Background image */}
                <div className="absolute inset-0">
                  <img
                    src={img}
                    alt={ev.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0" style={{
                    background: `linear-gradient(to top, rgba(18,18,18,0.98) 0%, rgba(18,18,18,0.7) 50%, rgba(18,18,18,0.2) 100%)`
                  }} />
                  {/* Color accent line at top */}
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
                </div>

                {/* Content */}
                <div className="relative p-5 min-h-[200px] flex flex-col">
                  {/* Top: category + date */}
                  <div className="flex items-start justify-between mb-auto">
                    <div className="flex gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider"
                        style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
                      >
                        {catLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 glass-panel px-2.5 py-1.5 rounded-xl ml-2 flex-shrink-0">
                      <Clock className="w-3 h-3 text-white/60" />
                      <span className="text-[10px] font-bold text-white/70">
                        {format(new Date(ev.date), "d MMM", { locale: ru })}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: title + meta */}
                  <div className="mt-16">
                    <h3 className="text-xl font-black text-white leading-tight mb-3 group-hover:text-primary transition-colors">
                      {ev.title}
                    </h3>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs font-medium text-white/50">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{ev.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>{ev.applicationsCount} / {ev.maxParticipants || "∞"}</span>
                        </div>
                      </div>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-x-1"
                        style={{ background: `${color}22`, border: `1px solid ${color}40` }}
                      >
                        <ChevronRight className="w-4 h-4" style={{ color }} />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-2xl">🏁</div>
            <p className="text-white/50 font-bold text-lg">Нет мероприятий</p>
            <p className="text-white/30 text-sm mt-1">Попробуйте изменить фильтры</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
