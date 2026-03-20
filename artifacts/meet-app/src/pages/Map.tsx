import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetEvents } from "@workspace/api-client-react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { data: events } = useGetEvents();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [56.946, 24.105],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom control position
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !events) return;
    // Clear existing markers (except tile layers)
    mapInstanceRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker) layer.remove();
    });
    events.forEach(ev => {
      if (!ev.lat || !ev.lng) return;
      const categoryColors: Record<string, string> = {
        motorsport: "#e53935",
        exhibition: "#1976d2",
        cruise: "#388e3c",
        club: "#f57c00",
      };
      const color = categoryColors[ev.category] || "#e53935";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:36px;height:36px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4);"></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });
      L.marker([ev.lat, ev.lng], { icon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div style="font-family:'Geologica',sans-serif;min-width:180px;padding:4px">
            <div style="font-weight:800;font-size:14px;margin-bottom:4px;color:#1f1f1f">${ev.title}</div>
            <div style="font-size:11px;color:#666;margin-bottom:2px">📅 ${new Date(ev.date).toLocaleDateString('ru-RU')}</div>
            <div style="font-size:11px;color:#666">📍 ${ev.location}</div>
          </div>
        `);
    });
  }, [events]);

  return (
    <div className="relative h-screen w-full flex flex-col">
      <style>
        {`
          .leaflet-container {
            z-index: 1;
            font-family: var(--font-sans);
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
          }
          .leaflet-popup-content {
            margin: 12px;
          }
        `}
      </style>
      
      {/* Search bar overlay */}
      <div className="absolute top-12 left-4 right-4 z-[1000] flex gap-2">
        <div className="relative flex-1 shadow-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input className="pl-12 bg-card/90 backdrop-blur-xl border-white/10 h-12 rounded-2xl text-foreground placeholder:text-muted-foreground" placeholder="Поиск событий..." />
        </div>
      </div>
      
      {/* Map container */}
      <div ref={mapRef} className="flex-1 w-full" style={{ minHeight: "100vh" }} />
      
      {/* Bottom overlay for nav spacing */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none z-[999]" />
    </div>
  );
}
