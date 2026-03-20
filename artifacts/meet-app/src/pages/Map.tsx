import { Layout } from "@/components/Layout";
import { Search, SlidersHorizontal, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGetEvents } from "@workspace/api-client-react";

export default function MapView() {
  const { data: events } = useGetEvents();

  return (
    <Layout>
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/map-bg.png`}
          alt="Map"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full pointer-events-none">
        <div className="pt-12 px-4 flex gap-2 pointer-events-auto">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input className="pl-12 bg-card/80 backdrop-blur-xl border-white/10 h-12" placeholder="Search events..." />
          </div>
          <button className="h-12 w-12 rounded-xl bg-card/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/80 active:scale-95 transition-transform">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative pointer-events-auto">
          {events?.map((ev, i) => (
            <div 
              key={ev.id} 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ top: `${30 + (i * 20)}%`, left: `${20 + (i * 30)}%` }} // Dummy random placement
            >
              <div className="relative">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-glow z-10 relative border-2 border-white">
                  <MapPin className="text-white w-5 h-5" />
                </div>
                {/* Ping animation */}
                <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-50 z-0" />
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="glass-panel px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xl">
                    {ev.title}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
