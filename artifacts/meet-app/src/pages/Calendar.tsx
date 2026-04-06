import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { useGetEvents } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, MapPin, Users, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

const EVENT_IMAGES: Record<string, string> = {
  motorsport: "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
  exhibition: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
  cruise: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
  club: "https://images.unsplash.com/photo-1511407397940-d57f68e81203?w=800&q=80",
};

const DAYS_OF_WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function Calendar() {
  const [, setLocation] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { data: events = [] } = useGetEvents();

  // Days in current month view (Mon-start)
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Pad start to Monday
    const startDay = (start.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const prefixDays: Date[] = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(d.getDate() - (i + 1));
      prefixDays.push(d);
    }

    // Pad end to Sunday
    const endDay = (end.getDay() + 6) % 7;
    const suffixDays: Date[] = [];
    for (let i = 1; i <= 6 - endDay; i++) {
      const d = new Date(end);
      d.setDate(d.getDate() + i);
      suffixDays.push(d);
    }

    return [...prefixDays, ...days, ...suffixDays];
  }, [currentMonth]);

  const eventsForDay = (day: Date) =>
    events.filter(ev => isSameDay(parseISO(ev.date as string), day));

  const selectedEvents = selectedDate ? eventsForDay(selectedDate) : [];

  // Events this month for the list below
  const monthEvents = useMemo(() =>
    events.filter(ev => isSameMonth(parseISO(ev.date as string), currentMonth))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events, currentMonth]
  );

  const displayEvents = selectedDate ? selectedEvents : monthEvents;

  return (
    <Layout>
      <div className="pt-3 px-5 pb-2">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-black text-gradient">Календарь</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {selectedDate
                ? `${eventsForDay(selectedDate).length} событий`
                : `${monthEvents.length} в этом месяце`}
            </p>
          </div>
          <button
            onClick={() => setLocation("/events/create")}
            className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-glow text-white active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDate(null); }}
            className="w-10 h-10 glass-panel rounded-full flex items-center justify-center active:scale-90 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          <h2 className="text-xl font-black capitalize">
            {format(currentMonth, "LLLL yyyy", { locale: ru })}
          </h2>
          <button
            onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDate(null); }}
            className="w-10 h-10 glass-panel rounded-full flex items-center justify-center active:scale-90 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-white/30 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1 mb-5">
          {calendarDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isTodayDate = isToday(day);
            const dayEvents = eventsForDay(day);
            const hasEvents = dayEvents.length > 0 && isCurrentMonth;

            return (
              <button
                key={i}
                onClick={() => {
                  if (!isCurrentMonth) return;
                  setSelectedDate(isSelected ? null : day);
                }}
                className={cn(
                  "relative flex flex-col items-center py-2 rounded-2xl transition-all active:scale-90",
                  !isCurrentMonth && "opacity-20 pointer-events-none",
                  isSelected && "bg-primary shadow-glow",
                  !isSelected && isTodayDate && "bg-white/10",
                  !isSelected && !isTodayDate && hasEvents && "bg-white/5",
                )}
              >
                {/* overflow badge — top-right, frosted pill */}
                {hasEvents && dayEvents.length > 6 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-px rounded-full bg-black/50 border border-white/15 backdrop-blur-sm text-[8px] font-bold text-white/45 leading-none">
                    +{dayEvents.length - 6}
                  </span>
                )}
                <span className={cn(
                  "text-sm font-bold leading-none",
                  isSelected ? "text-white" : isTodayDate ? "text-primary" : "text-white/80"
                )}>
                  {format(day, "d")}
                </span>
                {/* Event dots — up to 6, 2 rows of 3 */}
                {hasEvents && (() => {
                  const dotColor = isSelected ? "rgba(255,255,255,0.8)" : undefined;
                  const shown = dayEvents.slice(0, 6);
                  const rows: typeof shown[] = [];
                  for (let i = 0; i < shown.length; i += 3) rows.push(shown.slice(i, i + 3));
                  return (
                    <div className="flex flex-col items-center gap-0.5 mt-1">
                      {rows.map((row, ri) => (
                        <div key={ri} className="flex gap-0.5">
                          {row.map((ev, j) => (
                            <div
                              key={j}
                              className="w-1 h-1 rounded-full flex-shrink-0"
                              style={{ background: dotColor || CATEGORY_COLORS[ev.category] || "#e53935" }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-white/8 mb-4" />

      {/* Events list */}
      <div className="px-4 pb-4 flex flex-col gap-3">
        {selectedDate && selectedEvents.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="text-3xl mb-3">🏁</div>
            <p className="text-white/40 font-bold">Нет событий в этот день</p>
          </div>
        ) : (
          <>
            {selectedDate && (
              <p className="text-white/50 text-sm font-bold px-1 mb-1">
                {format(selectedDate, "d MMMM, EEEE", { locale: ru })}
              </p>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDate?.toISOString() || "all"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3"
              >
                {displayEvents.map(ev => {
                  const color = CATEGORY_COLORS[ev.category] || "#e53935";
                  const img = ev.coverImageUrl || EVENT_IMAGES[ev.category] || EVENT_IMAGES.motorsport;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setLocation(`/events/${ev.id}`)}
                      className="group w-full text-left relative rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
                      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                    >
                      <div className="absolute inset-0">
                        <img src={img} alt={ev.title} className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-[#0f0f0f]/90 to-transparent" />
                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
                      </div>
                      <div className="relative p-4 flex items-center gap-4">
                        {/* Date block */}
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
                          style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
                          <span className="text-[18px] font-black leading-none" style={{ color }}>
                            {format(parseISO(ev.date as string), "d")}
                          </span>
                          <span className="text-[9px] font-bold text-white/40 uppercase">
                            {format(parseISO(ev.date as string), "MMM", { locale: ru })}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color }}>
                              {CATEGORY_LABELS[ev.category] || ev.category}
                            </span>
                          </div>
                          <h3 className="font-black text-white text-sm leading-tight truncate mb-1.5 group-hover:text-primary transition-colors">
                            {ev.title}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] text-white/40">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(parseISO(ev.date as string), "HH:mm")}
                            </span>
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </span>
                          </div>
                        </div>

                        {/* Participants */}
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <span className="text-xs font-black" style={{ color }}>{ev.applicationsCount}</span>
                          <span className="text-[8px] text-white/30">чел.</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </Layout>
  );
}
