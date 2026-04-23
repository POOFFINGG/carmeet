import { useLocation } from "wouter";
import { useGetMyNotifications, useGetMyApplications, useGetMe } from "@workspace/api-client-react";
import { Bell, ChevronRight, ClipboardList, Send } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/Navigation";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { data: notifications, isLoading: notifLoading } = useGetMyNotifications();
  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: apps, isLoading: appsLoading } = useGetMyApplications({ query: { enabled: !!user } });

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="pt-12 px-5 pb-4">
          <h1 className="text-2xl font-black text-white">Уведомления</h1>
        </div>

        {/* Telegram bot CTA */}
        <div className="px-5 mb-4">
          <a
            href="https://t.me/automeet1bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-[#0088cc]/10 border border-[#0088cc]/25 rounded-2xl p-4 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-[#0088cc]/20 flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-[#0088cc]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">Telegram-бот</p>
              <p className="text-white/40 text-xs mt-0.5">Получайте уведомления прямо в Telegram</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
          </a>
        </div>

        {/* ── Мои заявки ── */}
        {!appsLoading && apps && apps.length > 0 && (
          <div className="px-5 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-black text-white uppercase tracking-widest text-white/40">Мои заявки</h2>
              <button
                onClick={() => setLocation("/profile")}
                className="text-xs text-primary font-bold"
              >
                Все
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {apps.map(app => (
                <div
                  key={app.id}
                  className="bg-white/5 rounded-2xl p-3.5 flex items-center justify-between border border-white/8"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-sm truncate">{app.eventTitle || "Событие"}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/8 text-white/50">
                        {app.type === "viewer" ? "Зритель" : "Участник"}
                      </span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-lg font-bold",
                        app.status === "approved" ? "bg-green-500/15 text-green-400" :
                        app.status === "rejected" ? "bg-red-500/15 text-red-400" :
                        "bg-yellow-500/15 text-yellow-400"
                      )}>
                        {app.status === "approved" ? "Одобрено" :
                          app.status === "rejected" ? "Отклонено" : "На рассмотрении"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="text-white/30 w-4 h-4 flex-shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!appsLoading && (!apps || apps.length === 0) && user?.role !== "viewer" && (
          <div className="px-5 mb-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-white/40 mb-3">Мои заявки</h2>
            <button
              onClick={() => setLocation("/events")}
              className="w-full bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/8 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-white/30" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Нет активных заявок</p>
                  <p className="text-white/40 text-xs mt-0.5">Найдите событие и запишитесь</p>
                </div>
              </div>
              <ChevronRight className="text-white/30 w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        )}

        {/* ── Уведомления системы ── */}
        <div className="px-5">
          {notifications && notifications.length > 0 && (
            <h2 className="text-sm font-black uppercase tracking-widest text-white/40 mb-3">Системные</h2>
          )}

          {notifLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : notifications?.length ? (
            <div className="flex flex-col gap-3">
              {notifications.map(notif => (
                <div key={notif.id} className="p-4 bg-white/5 rounded-2xl border border-white/8 relative overflow-hidden">
                  {!notif.read && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />}
                  <p className="font-bold text-white text-sm mb-1 pr-4">{notif.title}</p>
                  <p className="text-xs text-white/40 mb-2">{notif.message}</p>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider">
                    {format(new Date(notif.createdAt), "d MMM, HH:mm", { locale: ru })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Bell className="w-7 h-7 text-white/20" />
              </div>
              <p className="text-white/30 text-sm font-medium">Нет системных уведомлений</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
