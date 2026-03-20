import { Layout } from "@/components/Layout";
import { useGetMyNotifications } from "@workspace/api-client-react";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Notifications() {
  const { data: notifications, isLoading } = useGetMyNotifications();

  return (
    <Layout>
      <div className="pt-12 px-6 pb-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-black text-gradient">Уведомления</h1>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />)
          ) : notifications?.length ? (
            notifications.map(notif => (
              <div key={notif.id} className="p-5 glass-panel rounded-2xl relative overflow-hidden">
                {!notif.read && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />}
                <p className="font-bold text-white mb-2 pr-4">{notif.title}</p>
                <p className="text-sm text-muted-foreground mb-3">{notif.message}</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  {format(new Date(notif.createdAt), "d MMM, HH:mm", { locale: ru })}
                </p>
              </div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-muted-foreground font-medium">Нет уведомлений</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
