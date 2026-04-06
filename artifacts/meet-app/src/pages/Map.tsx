import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetEvents } from "@workspace/api-client-react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { BottomNav } from "@/components/Navigation";
import { cn } from "@/lib/utils";

delete (L.Icon.Default.prototype as any)._getIconUrl;

const CATEGORY_COLORS: Record<string, string> = {
  motorsport: "#e53935",
  exhibition: "#7c4dff",
  cruise: "#00bcd4",
  club: "#ff9800",
};

const CATEGORY_LABELS: Record<string, string> = {
  motorsport: "Автоспорт",
  exhibition: "Выставки",
  cruise: "Покатушки",
  club: "Автоклубы",
};

type DateFilter = "all" | "today" | "week";

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [cityFilter, setCityFilter] = useState("");
  const { data: events } = useGetEvents();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [55.7558, 37.6173],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark CartoDB tiles — matches the mockup
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ position: "bottomleft", prefix: false })
      .addAttribution('© <a href="https://carto.com/">CARTO</a>')
      .addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !events) return;

    mapInstanceRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker) layer.remove();
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const filtered = events.filter(ev => {
      if (!ev.lat || !ev.lng) return false;
      if (activeFilter && ev.category !== activeFilter) return false;
      if (search && !ev.title.toLowerCase().includes(search.toLowerCase()) &&
        !ev.location.toLowerCase().includes(search.toLowerCase())) return false;
      if (cityFilter && !ev.location.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (dateFilter === "today") {
        const d = new Date(ev.date);
        if (d < todayStart || d >= new Date(todayStart.getTime() + 86400000)) return false;
      } else if (dateFilter === "week") {
        const d = new Date(ev.date);
        if (d < todayStart || d >= weekEnd) return false;
      }
      return true;
    });

    filtered.forEach(ev => {
      const color = CATEGORY_COLORS[ev.category] || "#e53935";
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width: 32px; height: 32px;
            background: ${color};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid rgba(255,255,255,0.9);
            box-shadow: 0 2px 12px ${color}88, 0 0 0 4px ${color}22;
          "></div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
      });

      L.marker([ev.lat, ev.lng], { icon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-family:'Geologica',sans-serif;min-width:210px;padding:2px">
            <div style="background:${color};color:white;font-size:9px;font-weight:800;
              padding:3px 10px;border-radius:8px;text-transform:uppercase;
              letter-spacing:0.08em;display:inline-block;margin-bottom:8px">
              ${CATEGORY_LABELS[ev.category] || ev.category}
            </div>
            <div style="font-weight:800;font-size:14px;color:#111;margin-bottom:5px;line-height:1.2">${ev.title}</div>
            <div style="font-size:11px;color:#666;margin-bottom:2px">
              📅 ${new Date(ev.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </div>
            <div style="font-size:11px;color:#666">📍 ${ev.location}</div>
            <div style="font-size:11px;color:${color};font-weight:700;margin-top:6px">👥 ${ev.applicationsCount} участников</div>
          </div>
        `, { maxWidth: 260 });
    });
  }, [events, activeFilter, search, dateFilter, cityFilter]);

  return (
    <div className="relative w-full flex flex-col" style={{ height: "100dvh" }}>
      <style>{`
        .leaflet-container { z-index: 1; background: #1a1a2e; }
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .leaflet-popup-content { margin: 14px 16px; }
        .leaflet-popup-tip-container { display: none; }
        .leaflet-control-zoom {
          border: none !important;
          margin-bottom: 110px !important;
          margin-right: 16px !important;
          display: flex; flex-direction: column; gap: 6px;
        }
        .leaflet-control-zoom a {
          width: 38px !important; height: 38px !important;
          line-height: 38px !important; font-size: 20px !important;
          background: rgba(18,18,30,0.9) !important;
          backdrop-filter: blur(16px) !important;
          color: white !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 12px !important;
        }
        .leaflet-control-zoom a:hover { background: #e53935 !important; border-color: #e53935 !important; }
        .leaflet-control-attribution { background: rgba(0,0,0,0.4) !important; color: rgba(255,255,255,0.3) !important; font-size: 8px !important; }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.4) !important; }
      `}</style>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pt-12 px-4 pb-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl text-white text-sm placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
              placeholder="Поиск на карте..."
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-2xl border transition-all flex-shrink-0",
              showFilters ? "bg-primary border-primary text-white" : "bg-black/60 border-white/10 text-white/60"
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="flex flex-col gap-2">
            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveFilter(null)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-2xl border transition-all",
                  !activeFilter ? "bg-white text-black border-white" : "bg-black/60 border-white/10 text-white/60"
                )}
              >
                Все
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-2xl border transition-all"
                  style={{
                    background: activeFilter === key ? CATEGORY_COLORS[key] : "rgba(0,0,0,0.6)",
                    borderColor: activeFilter === key ? CATEGORY_COLORS[key] : "rgba(255,255,255,0.1)",
                    color: "white",
                    boxShadow: activeFilter === key ? `0 0 16px ${CATEGORY_COLORS[key]}60` : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Date chips */}
            <div className="flex gap-2">
              {(["all", "today", "week"] as DateFilter[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d)}
                  className={cn(
                    "flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-2xl border transition-all",
                    dateFilter === d ? "bg-white text-black border-white" : "bg-black/60 border-white/10 text-white/60"
                  )}
                >
                  {d === "all" ? "Все даты" : d === "today" ? "Сегодня" : "Эта неделя"}
                </button>
              ))}
            </div>
            {/* City search */}
            <div className="relative">
              <input
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
                placeholder="Фильтр по городу..."
              />
              {cityFilter && (
                <button onClick={() => setCityFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 w-full" />

      {/* Legend */}
      <div className="absolute bottom-24 left-px z-[999] flex flex-col gap-1.5">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = events?.filter(e => e.category === key && e.lat && e.lng).length || 0;
          if (!count) return null;
          return (
            <div key={key} className="flex items-center gap-2 bg-black/60 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-white/8">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[key] }} />
              <span className="text-[10px] font-bold text-white/70">{label}</span>
              <span className="text-[10px] font-bold ml-auto pl-2" style={{ color: CATEGORY_COLORS[key] }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none z-[998]"
        style={{ background: "linear-gradient(to top, rgba(18,18,30,0.7) 0%, transparent 100%)" }} />

      {/* Nav */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000]">
        <BottomNav />
      </div>
    </div>
  );
}
