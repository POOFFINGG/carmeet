import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Check, X, Loader2 } from "lucide-react";
import { getTgUser } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const ADMIN_IDS = ["1000001", "tg_123456789"];

type CarMod = {
  id: number;
  make: string;
  model: string;
  year?: number;
  aiStyledImageUrl?: string;
  sourcePhotos: string[];
  aiStatus: string;
  username: string;
  displayName: string;
};

export default function Admin() {
  const [, setLocation] = useLocation();
  const tgUser = getTgUser();
  const isAdmin = ADMIN_IDS.includes(tgUser.id);

  const [cars, setCars] = useState<CarMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/moderation`, {
        headers: { "x-telegram-id": tgUser.id },
      });
      const data = await res.json();
      setCars(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function approve(carId: number) {
    setActing(carId);
    await fetch(`${BASE_URL}/api/admin/moderation/${carId}/approve`, {
      method: "POST",
      headers: { "x-telegram-id": tgUser.id },
    });
    setCars(prev => prev.filter(c => c.id !== carId));
    setActing(null);
  }

  async function reject(carId: number) {
    setActing(carId);
    await fetch(`${BASE_URL}/api/admin/moderation/${carId}/reject`, {
      method: "POST",
      headers: { "x-telegram-id": tgUser.id },
    });
    setCars(prev => prev.filter(c => c.id !== carId));
    setActing(null);
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <p className="text-white/40">Доступ запрещён</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      {/* Header */}
      <div className="pt-12 px-5 pb-4 flex items-center gap-3 border-b border-white/6">
        <button onClick={() => setLocation("/garage")} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white">Модерация</h1>
          <p className="text-white/30 text-xs">AI-изображения на проверке</p>
        </div>
        <div className="ml-auto bg-primary/20 text-primary text-xs font-black px-2.5 py-1 rounded-lg">
          {cars.length}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : cars.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-white font-black text-xl">Всё проверено</p>
          <p className="text-white/30 text-sm">Нет изображений на модерации</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {cars.map(car => (
            <div key={car.id} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
              {/* User info */}
              <div className="px-4 pt-4 pb-3 border-b border-white/6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-black text-primary text-sm">
                  {car.displayName?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{car.displayName}</p>
                  <p className="text-white/40 text-xs">@{car.username}</p>
                </div>
                <div className="ml-auto text-white/50 text-sm font-bold">
                  {car.make} {car.model} {car.year || ""}
                </div>
              </div>

              {/* Generated image */}
              {car.aiStyledImageUrl && (
                <div className="px-4 pt-4">
                  <p className="text-white/30 text-xs mb-2 font-bold uppercase tracking-wider">AI-результат</p>
                  <img
                    src={car.aiStyledImageUrl}
                    alt="Generated"
                    className="w-full h-48 object-contain bg-black/30 rounded-xl"
                  />
                </div>
              )}

              {/* Source photos */}
              {car.sourcePhotos?.length > 0 && (
                <div className="px-4 pt-3">
                  <p className="text-white/30 text-xs mb-2 font-bold uppercase tracking-wider">Исходные фото</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {car.sourcePhotos.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt={`Фото ${i+1}`} className="w-full aspect-square object-cover rounded-lg" />
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-4 py-4 flex gap-3">
                <button
                  onClick={() => approve(car.id)}
                  disabled={acting === car.id}
                  className="flex-1 py-3 bg-green-600/20 border border-green-500/30 rounded-xl font-bold text-green-400 text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {acting === car.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Одобрить
                </button>
                <button
                  onClick={() => reject(car.id)}
                  disabled={acting === car.id}
                  className="flex-1 py-3 bg-red-600/20 border border-red-500/30 rounded-xl font-bold text-red-400 text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {acting === car.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
