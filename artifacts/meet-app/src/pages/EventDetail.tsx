import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import {
  useGetEvent, useApplyToEvent, useGetMe, useGetEventApplications,
  useGetMyCars, useCancelApplication, useGetMyApplications, useGetUserById
} from "@workspace/api-client-react";
import {
  ChevronLeft, MapPin, Calendar as CalIcon, Users, ShieldCheck,
  Clock, Lock, ExternalLink, CheckCircle2, HelpCircle, XCircle, Star, Settings2,
  Navigation, X, Car as CarIcon, Eye as EyeIcon, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getTgUser } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function useCountdown(startDate: string, endDate?: string | null) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function calc() {
      const now = Date.now();
      const start = new Date(startDate).getTime();
      const end = endDate ? new Date(endDate).getTime() : null;

      if (now < start) {
        const diff = start - now;
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        if (d > 0) setTimeLeft(`Начнётся через ${d}д ${h}ч`);
        else if (h > 0) setTimeLeft(`Начнётся через ${h}ч ${m}м`);
        else setTimeLeft(`Начнётся через ${m}м`);
      } else if (end && now < end) {
        const diff = end - now;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        if (h > 0) setTimeLeft(`Идёт ещё ${h}ч ${m}м`);
        else setTimeLeft(`Идёт ещё ${m}м`);
      } else {
        setTimeLeft("Идёт сейчас");
      }
    }
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [startDate, endDate]);

  return timeLeft;
}

export default function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const [, setLocation] = useLocation();
  const eventId = Number(params?.id);
  const queryClient = useQueryClient();
  const tgUser = getTgUser();

  const { data: user } = useGetMe();
  const { data: event, isLoading } = useGetEvent(eventId, { query: { enabled: !!eventId } });
  const { data: cars } = useGetMyCars({ query: { enabled: !!user && user.role !== "viewer" } });
  const { data: myApps } = useGetMyApplications();
  const { data: eventApps } = useGetEventApplications(eventId, { query: { enabled: !!eventId } });
  const { mutateAsync: apply, isPending: isApplying } = useApplyToEvent();
  const { mutateAsync: cancel, isPending: isCancelling } = useCancelApplication();

  const countdown = useCountdown(event?.date || "", event?.endDate);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const myApp = myApps?.find(a => a.eventId === eventId);
  const primaryCar = cars?.find(c => c.isPrimary) || cars?.[0];

  const approvedParticipants = eventApps?.filter(a => a.status === "approved" && a.type === "participant") || [];

  const isOrganizer = user?.id === event?.organizerId;

  function getRouteUrl() {
    if (event?.lat && event?.lng) {
      return `https://yandex.ru/maps/?rtext=~${event.lat},${event.lng}&rtt=auto`;
    }
    return `https://yandex.ru/maps/?text=${encodeURIComponent(event?.location || "")}`;
  }
  const catMap: Record<string, string> = {
    motorsport: "Автоспорт", exhibition: "Выставки", cruise: "Покатушки", club: "Автоклубы"
  };

  async function applyAs(type: "participant" | "viewer", attendanceStatus: "going" | "thinking" | "not_going") {
    if (!user || !event) return;
    try {
      await apply({
        eventId,
        data: {
          type,
          carId: type === "participant" && primaryCar ? primaryCar.id : null,
          attendanceStatus,
        }
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me/applications"] });
      await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/applications`] });
    } catch (err) {
      console.error(err);
    }
  }

  async function cancelApplication() {
    if (!myApp || !event) return;
    try {
      await cancel({ eventId, applicationId: myApp.id });
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me/applications"] });
      await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/applications`] });
    } catch (err) {
      console.error(err);
    }
  }

  if (isLoading || !event) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  const isPast = new Date(event.date) < new Date();

  return (
    <Layout showNav={false}>
      {/* Hero */}
      <div className="relative h-72 flex-shrink-0">
        <button
          onClick={() => window.history.back()}
          className="absolute top-5 left-5 z-20 w-10 h-10 glass-panel rounded-full flex items-center justify-center text-white backdrop-blur-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {isOrganizer && (
          <button
            onClick={() => setLocation(`/events/${eventId}/manage`)}
            className="absolute top-5 right-5 z-20 w-10 h-10 glass-panel rounded-full flex items-center justify-center text-white backdrop-blur-xl"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        )}

        <img
          src={event.coverImageUrl || "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80"}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Private badge */}
        {event.isPrivate && (
          <div className="absolute bottom-4 left-6 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-xl border border-white/15">
            <Lock className="w-3.5 h-3.5 text-white/70" />
            <span className="text-xs text-white/70 font-semibold">По приглашению</span>
          </div>
        )}
      </div>

      <div className="px-6 -mt-6 relative z-10 pb-36">
        {/* Category + countdown */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-shrink-0 px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg shadow-glow uppercase tracking-wider">
            {catMap[event.category] || event.category}
          </div>
          {!isPast && (
            <div className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1 bg-white/8 rounded-xl border border-white/10">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-white">{countdown}</span>
            </div>
          )}
        </div>

        <h1 className="text-3xl font-black leading-tight mb-3">{event.title}</h1>

        {event.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {event.subcategories.map(sub => (
              <span key={sub} className="px-3 py-1 glass-panel text-xs font-semibold rounded-full text-white/80">
                {sub}
              </span>
            ))}
          </div>
        )}

        {/* Info rows */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary flex-shrink-0">
              <CalIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white capitalize">
                {format(new Date(event.date), "EEEE, d MMMM yyyy", { locale: ru })}
              </p>
              <p className="text-muted-foreground">
                {format(new Date(event.date), "HH:mm")}
                {event.endDate && ` — ${format(new Date(event.endDate), "HH:mm")}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white">{event.location}</p>
              <a
                href={getRouteUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary font-semibold hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                Проложить маршрут
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white">{event.applicationsCount} участников</p>
              <p className="text-muted-foreground">
                Макс. {event.maxParticipants || "Не ограничено"}
                {event.viewersCount > 0 && ` · ${event.viewersCount} зрителей`}
              </p>
            </div>
          </div>
        </div>

        {/* Prices */}
        {(event.priceParticipants != null || event.priceViewers != null) && (
          <div className="glass-panel p-4 rounded-2xl mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Стоимость участия</p>
            <div className="grid grid-cols-2 gap-3">
              {event.priceParticipants != null && (
                <div className="text-center">
                  <p className="text-2xl font-black text-white">
                    {event.priceParticipants === 0 ? "Бесплатно" : `${event.priceParticipants} ₽`}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">Участник</p>
                </div>
              )}
              {event.priceViewers != null && (
                <div className="text-center">
                  <p className="text-2xl font-black text-white">
                    {event.priceViewers === 0 ? "Бесплатно" : `${event.priceViewers} ₽`}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">Зритель</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Organizer */}
        <div className="glass-panel p-5 rounded-2xl mb-5">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Организатор
          </h3>
          <p className="text-white/80 text-sm font-semibold mb-2">{event.organizerName}</p>
          {event.organizerContact && (
            <a
              href={event.organizerContact}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary text-sm font-semibold hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Написать организатору
            </a>
          )}
          {event.organizerLink && (
            <a
              href={event.organizerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary text-sm font-semibold hover:underline mt-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              Страница события
            </a>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">О мероприятии</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">{event.description}</p>
          </div>
        )}

        {/* Approved participants */}
        {approvedParticipants.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">Участники</h3>
            <div className="space-y-2">
              {approvedParticipants.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedUserId(app.userId)}
                  className="w-full flex items-center gap-3 glass-panel p-3 rounded-xl active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
                    {app.userName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-bold truncate">{app.userName || "Участник"}</p>
                    {(app.carMake || app.carModel) && (
                      <p className="text-white/40 text-xs truncate">{app.carMake} {app.carModel}</p>
                    )}
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    {app.attendanceStatus === "going" && (
                      <span className="flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-green-400 -mr-1.5" />
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </span>
                    )}
                    {app.attendanceStatus === "thinking" && (
                      <span className="flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-yellow-400 -mr-1.5" />
                        <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                      </span>
                    )}
                    {app.attendanceStatus === "not_going" && (
                      <span className="flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-red-400 -mr-1.5" />
                        <CheckCircle2 className="w-4 h-4 text-red-400" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Participant profile modal */}
        {selectedUserId && (
          <ParticipantModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        )}
      </div>

      {/* Bottom action area */}
      {!isOrganizer && !isPast && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
          {event.isPrivate && !myApp ? (
            <div className="w-full max-w-md mx-auto glass-panel rounded-2xl p-4 text-center">
              <Lock className="w-6 h-6 text-white/40 mx-auto mb-2" />
              <p className="text-white/50 text-sm font-semibold">Закрытое событие</p>
              <p className="text-white/30 text-xs mt-1">Участие только по приглашению организатора</p>
            </div>
          ) : myApp ? (
            <div className="w-full max-w-md mx-auto space-y-2">
              {/* Current attendance status */}
              <div className={cn(
                "flex items-center gap-3 p-3.5 rounded-2xl border",
                myApp.attendanceStatus === "going" ? "bg-green-500/10 border-green-500/30" :
                myApp.attendanceStatus === "thinking" ? "bg-yellow-500/10 border-yellow-500/30" :
                "bg-red-500/10 border-red-500/30"
              )}>
                {myApp.attendanceStatus === "going" && (
                  <span className="flex items-center flex-shrink-0">
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-400 -mr-1" />
                    <CheckCircle2 className="w-4.5 h-4.5 text-green-400" />
                  </span>
                )}
                {myApp.attendanceStatus === "thinking" && (
                  <span className="flex items-center flex-shrink-0">
                    <CheckCircle2 className="w-4.5 h-4.5 text-yellow-400 -mr-1" />
                    <CheckCircle2 className="w-4.5 h-4.5 text-yellow-400" />
                  </span>
                )}
                {myApp.attendanceStatus === "not_going" && (
                  <span className="flex items-center flex-shrink-0">
                    <CheckCircle2 className="w-4.5 h-4.5 text-red-400 -mr-1" />
                    <CheckCircle2 className="w-4.5 h-4.5 text-red-400" />
                  </span>
                )}
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">
                    {myApp.attendanceStatus === "going" ? "Точно буду" :
                     myApp.attendanceStatus === "thinking" ? "Пока не знаю" : "Принят, но не приеду"}
                  </p>
                  <p className="text-white/40 text-xs">
                    Статус: {myApp.status === "approved" ? "Одобрено" : myApp.status === "rejected" ? "Отклонено" : "На рассмотрении"}
                    {myApp.type === "participant" && " · с проектом"}
                  </p>
                </div>
                <button
                  onClick={cancelApplication}
                  disabled={isCancelling}
                  className="text-white/30 text-xs font-semibold hover:text-white/70 transition-colors"
                >
                  Отменить
                </button>
              </div>

              {/* Change status buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => applyAs(myApp.type as "participant" | "viewer", "going")}
                  disabled={isApplying || myApp.attendanceStatus === "going"}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-bold transition-all border",
                    myApp.attendanceStatus === "going"
                      ? "bg-green-500/20 border-green-500/40 text-green-400"
                      : "bg-white/5 border-white/10 text-white/60 active:scale-95"
                  )}
                >
                  Точно буду
                </button>
                <button
                  onClick={() => applyAs(myApp.type as "participant" | "viewer", "thinking")}
                  disabled={isApplying || myApp.attendanceStatus === "thinking"}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-bold transition-all border",
                    myApp.attendanceStatus === "thinking"
                      ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                      : "bg-white/5 border-white/10 text-white/60 active:scale-95"
                  )}
                >
                  Не знаю
                </button>
                <button
                  onClick={() => applyAs(myApp.type as "participant" | "viewer", "not_going")}
                  disabled={isApplying || myApp.attendanceStatus === "not_going"}
                  className={cn(
                    "py-2.5 rounded-xl text-xs font-bold transition-all border",
                    myApp.attendanceStatus === "not_going"
                      ? "bg-red-500/20 border-red-500/40 text-red-400"
                      : "bg-white/5 border-white/10 text-white/60 active:scale-95"
                  )}
                >
                  Не приеду
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md mx-auto space-y-2.5">
              {/* Пойду (as viewer) */}
              <Button
                size="lg"
                className="w-full"
                onClick={() => applyAs("viewer", "going")}
                isLoading={isApplying}
              >
                <CheckCircle2 className="mr-2 w-5 h-5" /> Пойду как зритель
              </Button>

              {/* Участвовать с проектом (if participant/organizer) */}
              {user?.role !== "viewer" && primaryCar && (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-primary/40 text-primary"
                  onClick={() => applyAs("participant", "going")}
                  isLoading={isApplying}
                >
                  <Star className="mr-2 w-5 h-5" /> Хочу участвовать с проектом
                </Button>
              )}

              {/* Не знаю / Не приеду */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyAs("viewer", "thinking")}
                  disabled={isApplying}
                  className="py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/60 active:scale-95 transition-all"
                >
                  <HelpCircle className="w-4 h-4 inline mr-1.5" />
                  Пока не знаю
                </button>
                <button
                  onClick={() => applyAs("viewer", "not_going")}
                  disabled={isApplying}
                  className="py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/60 active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4 inline mr-1.5" />
                  Не приеду
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isOrganizer && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
          <Button
            size="lg"
            className="w-full"
            onClick={() => setLocation(`/events/${eventId}/manage`)}
          >
            <Settings2 className="mr-2 w-5 h-5" /> Управление заявками
          </Button>
        </div>
      )}
    </Layout>
  );
}

function ParticipantModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data: profile, isLoading } = useGetUserById(userId);

  const roleMap: Record<string, { label: string; icon: React.ReactNode }> = {
    organizer: { label: "Организатор", icon: <ShieldCheck className="w-4 h-4" /> },
    participant: { label: "Участник", icon: <Flag className="w-4 h-4" /> },
    viewer: { label: "Зритель", icon: <EyeIcon className="w-4 h-4" /> },
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-t-3xl p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center active:scale-90 transition-all"
        >
          <X className="w-4 h-4 text-white/50" />
        </button>

        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : profile ? (
          <div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center font-black text-primary text-2xl overflow-hidden flex-shrink-0">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (profile.displayName?.[0] || "?").toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{profile.displayName}</h3>
                {profile.username && (
                  <p className="text-white/40 text-sm">@{profile.username}</p>
                )}
                {profile.role && (
                  <div className="flex items-center gap-1.5 mt-1 text-primary text-xs font-bold">
                    {roleMap[profile.role]?.icon}
                    {roleMap[profile.role]?.label}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-white/30 text-center py-4">Профиль не найден</p>
        )}
      </div>
    </div>
  );
}
