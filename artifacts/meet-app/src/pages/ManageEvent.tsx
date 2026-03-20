import { useState } from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { useGetEventApplications, useUpdateApplication, useGetEvent, useCancelApplication } from "@workspace/api-client-react";
import { ChevronLeft, Check, X, Users, Eye, Car, Clock, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "all" | "pending" | "participant" | "viewer";

export default function ManageEvent() {
  const [, params] = useRoute("/events/:id/manage");
  const eventId = Number(params?.id);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [processing, setProcessing] = useState<number | null>(null);

  const { data: event } = useGetEvent(eventId, { query: { enabled: !!eventId } });
  const { data: applications, isLoading } = useGetEventApplications(eventId, { query: { enabled: !!eventId } });
  const { mutateAsync: updateApp } = useUpdateApplication();
  const { mutateAsync: cancelApp } = useCancelApplication();

  async function approve(appId: number) {
    setProcessing(appId);
    try {
      await updateApp({ eventId, applicationId: appId, data: { status: "approved" } });
      await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/applications`] });
    } finally {
      setProcessing(null);
    }
  }

  async function reject(appId: number) {
    setProcessing(appId);
    try {
      await updateApp({ eventId, applicationId: appId, data: { status: "rejected" } });
      await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/applications`] });
    } finally {
      setProcessing(null);
    }
  }

  async function remove(appId: number) {
    setProcessing(appId);
    try {
      await cancelApp({ eventId, applicationId: appId });
      await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/applications`] });
    } finally {
      setProcessing(null);
    }
  }

  const filtered = applications?.filter(a => {
    if (tab === "pending") return a.status === "pending";
    if (tab === "participant") return a.type === "participant";
    if (tab === "viewer") return a.type === "viewer";
    return true;
  }) || [];

  const pendingCount = applications?.filter(a => a.status === "pending").length || 0;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "pending", label: `Ожидают (${pendingCount})`, icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "participant", label: "Участники", icon: <Car className="w-3.5 h-3.5" /> },
    { id: "viewer", label: "Зрители", icon: <Eye className="w-3.5 h-3.5" /> },
    { id: "all", label: "Все", icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <Layout showNav={false}>
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
        {/* Header */}
        <div className="pt-12 px-5 pb-4 flex items-center gap-3 border-b border-white/6">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white truncate">{event?.title || "Управление"}</h1>
            <p className="text-white/35 text-xs">{applications?.length || 0} заявок всего</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="px-5 pt-4 pb-3 grid grid-cols-3 gap-3">
          {[
            { label: "Ожидают", count: applications?.filter(a => a.status === "pending").length || 0, color: "text-yellow-400" },
            { label: "Одобрено", count: applications?.filter(a => a.status === "approved").length || 0, color: "text-green-400" },
            { label: "Отклонено", count: applications?.filter(a => a.status === "rejected").length || 0, color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/4 rounded-2xl p-3 text-center border border-white/6">
              <p className={cn("text-2xl font-black", s.color)}>{s.count}</p>
              <p className="text-white/40 text-[10px] font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all flex-shrink-0",
                  tab === t.id
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-white/4 border-white/8 text-white/50"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 px-5 pb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-white/10 mb-3" />
              <p className="text-white/30 font-bold">Нет заявок</p>
              <p className="text-white/15 text-sm mt-1">В этой категории пусто</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(app => (
                <div key={app.id} className="bg-white/4 rounded-2xl border border-white/6 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-black text-primary flex-shrink-0">
                      {app.userName?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{app.userName || "Пользователь"}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-lg",
                          app.type === "participant" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"
                        )}>
                          {app.type === "participant" ? "Участник" : "Зритель"}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-lg",
                          app.status === "approved" ? "bg-green-500/15 text-green-400" :
                          app.status === "rejected" ? "bg-red-500/15 text-red-400" :
                          "bg-yellow-500/15 text-yellow-400"
                        )}>
                          {app.status === "approved" ? "Одобрен" : app.status === "rejected" ? "Отклонён" : "Ожидает"}
                        </span>
                        {app.attendanceStatus && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/8 text-white/50">
                            {app.attendanceStatus === "going" ? "Точно придёт" :
                             app.attendanceStatus === "thinking" ? "Не уверен" : "Не придёт"}
                          </span>
                        )}
                      </div>
                      {(app.carMake || app.carModel) && (
                        <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
                          <Car className="w-3 h-3" /> {app.carMake} {app.carModel}
                        </p>
                      )}
                      {app.comment && (
                        <p className="text-white/50 text-xs mt-1.5 italic">"{app.comment}"</p>
                      )}
                    </div>
                  </div>

                  {app.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(app.id)}
                        disabled={processing === app.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500/15 border border-green-500/30 text-green-400 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        Одобрить
                      </button>
                      <button
                        onClick={() => reject(app.id)}
                        disabled={processing === app.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        Отклонить
                      </button>
                    </div>
                  )}

                  {app.status !== "pending" && (
                    <div className="flex gap-2">
                      {app.status === "rejected" && (
                        <button
                          onClick={() => approve(app.id)}
                          disabled={processing === app.id}
                          className="flex-1 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400/70 rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                        >
                          Одобрить
                        </button>
                      )}
                      {app.status === "approved" && (
                        <button
                          onClick={() => reject(app.id)}
                          disabled={processing === app.id}
                          className="flex-1 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400/70 rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                        >
                          Отклонить
                        </button>
                      )}
                      <button
                        onClick={() => remove(app.id)}
                        disabled={processing === app.id}
                        className="px-4 py-2.5 bg-white/4 border border-white/8 text-white/40 rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
