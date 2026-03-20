import { useState } from "react";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { Layout } from "@/components/Layout";
import { useGetEvent, useApplyToEvent, useGetMe } from "@workspace/api-client-react";
import { ChevronLeft, MapPin, Calendar as CalIcon, Users, Flag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const eventId = Number(params?.id);
  
  const { data: user } = useGetMe();
  const { data: event, isLoading } = useGetEvent(eventId, { query: { enabled: !!eventId } });
  const { mutateAsync: apply, isPending } = useApplyToEvent();
  
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    if (!user || !event) return;
    try {
      await apply({
        eventId,
        data: {
          type: user.role === "viewer" ? "viewer" : "participant",
          // Send primary car ID if participant (mocking carId=1 for demo)
          carId: user.role !== "viewer" ? 1 : undefined,
        }
      });
      setApplied(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !event) {
    return <Layout><div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div></Layout>;
  }

  return (
    <Layout showNav={false}>
      <div className="relative h-72">
        <button onClick={() => window.history.back()} className="absolute top-12 left-6 z-20 w-10 h-10 glass-panel rounded-full flex items-center justify-center text-white backdrop-blur-xl">
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        {/* event crowd luxury cars */}
        <img 
          src={event.coverImageUrl || "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80"} 
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="px-6 -mt-12 relative z-10">
        <div className="inline-block px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg mb-3 shadow-glow uppercase tracking-wider">
          {event.category}
        </div>
        <h1 className="text-3xl font-black leading-tight mb-4">{event.title}</h1>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {event.subcategories.map(sub => (
            <span key={sub} className="px-3 py-1 glass-panel text-xs font-semibold rounded-full text-white/80">
              {sub}
            </span>
          ))}
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
              <CalIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white">{format(new Date(event.date), "EEEE, MMMM d, yyyy")}</p>
              <p className="text-muted-foreground">{format(new Date(event.date), "HH:mm")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white">{event.location}</p>
              <p className="text-muted-foreground">Get Directions</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white">{event.applicationsCount} Attending</p>
              <p className="text-muted-foreground">Max {event.maxParticipants || "Unlimited"}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl mb-8">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Organizer
          </h3>
          <p className="text-white/80 text-sm">{event.organizerName}</p>
        </div>

        <div className="mb-24">
          <h3 className="font-bold text-lg mb-2">About Event</h3>
          <p className="text-muted-foreground leading-relaxed text-sm">
            {event.description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/90 to-transparent flex justify-center z-50">
        <div className="w-full max-w-md">
          {applied ? (
            <Button size="lg" className="w-full bg-green-500 hover:bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] border-none" disabled>
              Application Submitted
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={handleApply} isLoading={isPending}>
              <Flag className="mr-2 w-5 h-5" /> Apply as {user?.role === "viewer" ? "Viewer" : "Participant"}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
