import { Layout } from "@/components/Layout";
import { useGetMe, useGetMyNotifications } from "@workspace/api-client-react";
import { Settings, LogOut, Car, ShieldCheck, Eye, Bell } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { data: user } = useGetMe();
  const { data: notifications } = useGetMyNotifications();

  return (
    <Layout>
      <div className="pt-12 px-6 pb-6 flex justify-between items-center">
        <h1 className="text-3xl font-black text-gradient">Profile</h1>
        <button className="w-10 h-10 glass-panel rounded-full flex items-center justify-center">
          <Settings className="w-5 h-5 text-white/70" />
        </button>
      </div>

      <div className="px-6 mb-8">
        <div className="glass-panel p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10" />
          
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center border-2 border-primary/50 text-2xl font-black text-primary shadow-glow relative z-10">
            {user?.displayName?.[0] || "U"}
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold">{user?.displayName}</h2>
            <p className="text-muted-foreground text-sm">@{user?.username}</p>
            <div className="flex items-center gap-1 mt-2 text-xs font-bold uppercase tracking-wider text-primary">
              {user?.role === "organizer" && <ShieldCheck className="w-4 h-4" />}
              {user?.role === "participant" && <Car className="w-4 h-4" />}
              {user?.role === "viewer" && <Eye className="w-4 h-4" />}
              <span>{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mb-8">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" /> Notifications
        </h3>
        <div className="space-y-3">
          {notifications?.length ? notifications.map(notif => (
            <div key={notif.id} className="p-4 glass-panel rounded-2xl">
              <p className="font-bold text-sm text-white mb-1">{notif.title}</p>
              <p className="text-xs text-muted-foreground mb-2">{notif.message}</p>
              <p className="text-[10px] text-white/40">{format(new Date(notif.createdAt), "MMM d, HH:mm")}</p>
            </div>
          )) : (
            <div className="p-6 glass-panel rounded-2xl text-center">
              <p className="text-muted-foreground text-sm">No new notifications</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-6">
        <button className="w-full p-4 glass-panel rounded-2xl flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-bold">Sign Out</span>
        </button>
      </div>
    </Layout>
  );
}
