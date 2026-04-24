import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useGetEventApplications, useUpdateApplication, useGetEvent, useCancelApplication, useDeleteEvent, useUpdateEvent } from "@workspace/api-client-react";
import { ChevronLeft, Users, Eye, Car, Clock, UserCheck, UserX, Bell, UserPlus, AlertTriangle, Send, X, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getTgUser } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "all" | "pending" | "participant" | "viewer";

export default function ManageEvent() {
  const [, params] = useRoute("/events/:id/manage");
  const [, setLocation] = useLocation();
  const eventId = Number(params?.id);
  const queryClient = useQueryClient();
  const tgUser = getTgUser();
  const [tab, setTab] = useState<Tab>("pending");
  const [processing, setProcessing] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [isSendingNotify, setIsSendingNotify] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const { data: event } = useGetEvent(eventId, { query: { enabled: !!eventId } });
  const { data: applications, isLoading } = useGetEventApplications(eventId, { query: { enabled: !!eventId } });
  const { mutateAsync: updateApp } = useUpdateApplication();
  const { mutateAsync: cancelApp } = useCancelApplication();
  const { mutateAsync: deleteEvent, isPending: isCancelling } = useDeleteEvent();
  const { mutateAsync: updateEvent } = useUpdateEvent();

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

  async function cancelEvent() {
    try {
      await deleteEvent({ eventId });
      setLocation("/events");
    } catch (err) {
      console.error(err);
    }
  }

  async function sendNotification() {
    if (!notifyMessage.trim()) return;
    setIsSendingNotify(true);
    try {
      await fetch(`${BASE_URL}/api/events/${eventId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-id": tgUser.id },
        body: JSON.stringify({ message: notifyMessage }),
      });
      setNotifyMessage("");
      setShowNotifyModal(false);
    } finally {
      setIsSendingNotify(false);
    }
  }

  async function inviteUser() {
    if (!inviteUsername.trim()) return;
    setIsInviting(true);
    setInviteResult(null);
    try {
      const resp = await fetch(`${BASE_URL}/api/events/${eventId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-id": tgUser.id },
        body: JSON.stringify({ username: inviteUsername.replace(/^@/, "") }),
      });
      if (resp.ok) {
        setInviteResult("ok");
        setInviteUsername("");
      } else {
        const data = await resp.json();
        setInviteResult(data.error || "Ошибка");
      }
    } finally {
      setIsInviting(false);
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
          <button
            onClick={() => { setEditForm({ title: event?.title, description: event?.description, location: event?.location, date: event?.date, endDate: event?.endDate, priceParticipants: event?.priceParticipants, priceViewers: event?.priceViewers, organizerLink: event?.organizerLink }); setShowEditModal(true); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all"
          >
            <Pencil className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Action buttons row */}
        <div className="px-5 pt-4 pb-2 flex gap-2">
          <button
            onClick={() => setShowNotifyModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white/70 active:scale-95 transition-all"
          >
            <Bell className="w-4 h-4" /> Уведомить
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white/70 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Пригласить
          </button>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-bold text-red-400 active:scale-95 transition-all"
          >
            <AlertTriangle className="w-4 h-4" /> Отменить
          </button>
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

      {/* Cancel confirm dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" onClick={() => setShowCancelConfirm(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-black text-white text-center mb-2">Отменить событие?</h3>
            <p className="text-white/40 text-sm text-center mb-5">Все участники получат уведомление об отмене.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-white/8 border border-white/10 text-white/70 rounded-2xl font-bold text-sm"
              >
                Назад
              </button>
              <button
                onClick={cancelEvent}
                disabled={isCancelling}
                className="flex-1 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
              >
                {isCancelling ? "Отменяем..." : "Отменить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notify modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowNotifyModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-5" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">Уведомить участников</h3>
              <button onClick={() => setShowNotifyModal(false)} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>
            <textarea
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              placeholder="Текст уведомления..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm placeholder:text-white/30 outline-none focus:border-white/25 resize-none mb-4"
            />
            <button
              onClick={sendNotification}
              disabled={isSendingNotify || !notifyMessage.trim()}
              className="w-full py-3.5 bg-primary rounded-2xl font-black text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSendingNotify ? "Отправляем..." : "Отправить всем"}
            </button>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowInviteModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-5" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">Пригласить по нику</h3>
              <button onClick={() => setShowInviteModal(false)} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>
            <div className="flex gap-3 mb-3">
              <input
                value={inviteUsername}
                onChange={e => { setInviteUsername(e.target.value); setInviteResult(null); }}
                placeholder="@username"
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder:text-white/30 outline-none focus:border-white/25"
              />
              <button
                onClick={inviteUser}
                disabled={isInviting || !inviteUsername.trim()}
                className="px-5 py-3 bg-primary rounded-2xl font-bold text-white text-sm active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Позвать
              </button>
            </div>
            {inviteResult === "ok" && (
              <p className="text-green-400 text-xs font-bold px-2">Приглашение отправлено!</p>
            )}
            {inviteResult && inviteResult !== "ok" && (
              <p className="text-red-400 text-xs font-bold px-2">{inviteResult}</p>
            )}
          </div>
        </div>
      )}

      {/* Edit event modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
          <div className="w-full max-w-lg bg-[#1a1a1a] rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">Редактировать событие</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-white/50"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-3">
              {([
                { key: "title", label: "Название", type: "text" },
                { key: "date", label: "Дата начала", type: "date" },
                { key: "endDate", label: "Дата окончания", type: "date" },
                { key: "location", label: "Место", type: "text" },
                { key: "priceParticipants", label: "Цена для участников (₽)", type: "number" },
                { key: "priceViewers", label: "Цена для зрителей (₽)", type: "number" },
                { key: "organizerLink", label: "Ссылка организатора", type: "text" },
              ] as const).map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-white/50 text-xs mb-1 block">{label}</label>
                  <input
                    type={type}
                    value={editForm[key] ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50"
                  />
                </div>
              ))}
              <div>
                <label className="text-white/50 text-xs mb-1 block">Описание</label>
                <textarea
                  rows={3}
                  value={editForm.description ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 resize-none"
                />
              </div>
              <button
                disabled={isSavingEdit}
                onClick={async () => {
                  setIsSavingEdit(true);
                  try {
                    await updateEvent({ eventId, data: editForm as any });
                    await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
                    setShowEditModal(false);
                  } finally { setIsSavingEdit(false); }
                }}
                className="w-full py-3.5 bg-primary rounded-2xl font-black text-white text-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <Check className="w-4 h-4" /> {isSavingEdit ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
