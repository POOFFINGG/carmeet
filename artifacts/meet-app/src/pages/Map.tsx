import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetEvents } from "@workspace/api-client-react";
import { Search, X } from "lucide-react";
import { BottomNav } from "@/components/Navigation";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CATEGORY_COLORS: Record<string, string> = {
  motorsport: "#e53935",
  exhibition: "#1976d2",
  cruise: "#388e3c",
  club: "#f57c00",
};

const CATEGORY_LABELS: Record<string, string> = {
  motorsport: "Автоспорт",
  exhibition: "Выставки",
  cruise: "Покатушки",
  club: "Автоклубы",
};

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const { data: events } = useGetEvents();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [55.7558, 37.6173],
      zoom: 10,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

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

    const filtered = events.filter(ev => {
      if (!ev.lat || !ev.lng) return false;
      if (activeFilter && ev.category !== activeFilter) return false;
      if (search && !ev.title.toLowerCase().includes(search.toLowerCase()) && !ev.location.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    filtered.forEach(ev => {
      const color = CATEGORY_COLORS[ev.category] || "#e53935";
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:40px;height:48px;">
            <div style="
              width:40px;height:40px;
              background:${color};
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              border:3px solid white;
              box-shadow:0 4px 16px rgba(0,0,0,0.4);
            "></div>
            <div style="
              position:absolute;top:8px;left:8px;
              width:24px;height:24px;
              background:white;
              border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              font-size:11px;font-weight:800;color:${color};
            ">★</div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48],
      });

      L.marker([ev.lat, ev.lng], { icon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-family:'Geologica',sans-serif;min-width:200px;padding:4px 2px">
            <div style="
              display:inline-block;
              background:${color};
              color:white;
              font-size:9px;font-weight:800;
              padding:2px 8px;border-radius:6px;
              text-transform:uppercase;letter-spacing:0.05em;
              margin-bottom:8px;
            ">${CATEGORY_LABELS[ev.category] || ev.category}</div>
            <div style="font-weight:800;font-size:15px;margin-bottom:6px;color:#111;line-height:1.2">${ev.title}</div>
            <div style="font-size:12px;color:#555;margin-bottom:3px">📅 ${new Date(ev.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
            <div style="font-size:12px;color:#555">📍 ${ev.location}</div>
            <div style="font-size:11px;color:#888;margin-top:6px">👥 ${ev.applicationsCount} участников</div>
          </div>
        `, { maxWidth: 260 });
    });
  }, [events, activeFilter, search]);

  return (
    <div className="relative w-full flex flex-col" style={{ height: "100dvh" }}>
      <style>{`
        .leaflet-container { z-index: 1; }
        .leaflet-popup-content-wrapper { border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .leaflet-popup-content { margin: 14px 16px; }
        .leaflet-popup-tip { display: none; }
        .leaflet-control-zoom { border: none !important; margin-bottom: 100px !important; margin-right: 16px !important; }
        .leaflet-control-zoom a { 
          background: rgba(31,31,31,0.9) !important; 
          backdrop-filter: blur(12px);
          color: white !important; 
          border: 1px solid rgba(255,255,255,0.1) !important;
          width: 36px !important; height: 36px !important;
          line-height: 36px !important;
          font-size: 18px !important;
          border-radius: 10px !important;
          margin-bottom: 4px;
        }
        .leaflet-control-zoom a:hover { background: rgba(229,57,53,0.8) !important; }
      `}</style>

      {/* Search bar */}
      <div className="absolute top-12 left-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="relative shadow-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 z-10" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl text-white text-sm placeholder:text-white/40 outline-none focus:border-primary/60 transition-colors"
            placeholder="Поиск событий..."
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(activeFilter === key ? null : key)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all backdrop-blur-xl"
              style={{
                background: activeFilter === key ? CATEGORY_COLORS[key] : "rgba(0,0,0,0.6)",
                color: "white",
                border: `1px solid ${activeFilter === key ? CATEGORY_COLORS[key] : "rgba(255,255,255,0.1)"}`,
                boxShadow: activeFilter === key ? `0 0 12px ${CATEGORY_COLORS[key]}60` : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div ref={mapRef} className="flex-1 w-full" />

      {/* Bottom gradient for nav readability */}
      <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-[500]" />

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000]">
        <BottomNav />
      </div>
    </div>
  );
}
