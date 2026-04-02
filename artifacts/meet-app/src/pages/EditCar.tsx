import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, Plus, X, Loader2, Check, RefreshCw, Car, Trash2 } from "lucide-react";
import { useGetMe, useGetMyCars } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getTgUser } from "@/lib/utils";
import { CAR_DATABASE, CAR_MAKES } from "@/lib/cars-data";

const SILHOUETTE_COLORS = [
  { hex: "#e53935", label: "Красный" },
  { hex: "#1565C0", label: "Синий" },
  { hex: "#2E7D32", label: "Зелёный" },
  { hex: "#F9A825", label: "Жёлтый" },
  { hex: "#ffffff", label: "Белый" },
  { hex: "#212121", label: "Чёрный" },
  { hex: "#546E7A", label: "Серый" },
  { hex: "#6A1B9A", label: "Фиолетовый" },
];

const MAX_ATTEMPTS = 10;
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

type Stage = "edit" | "photos" | "generating" | "result" | "silhouette";

export default function EditCar() {
  const [, setLocation] = useLocation();
  const { carId: carIdParam } = useParams<{ carId?: string }>();
  const queryClient = useQueryClient();
  const tgUser = getTgUser();
  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: cars } = useGetMyCars({ query: { enabled: !!user, retry: false } });

  const isNewMode = carIdParam === "new";
  const primaryCar = cars?.find(c => c.isPrimary) || cars?.[0];
  const targetCar = isNewMode ? null
    : carIdParam ? cars?.find(c => c.id === parseInt(carIdParam))
    : primaryCar;

  const [stage, setStage] = useState<Stage>("edit");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [silColor, setSilColor] = useState("#e53935");
  const [photos, setPhotos] = useState<string[]>([]);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdCarId, setCreatedCarId] = useState<number | null>(null);
  const [makeQuery, setMakeQuery] = useState("");
  const [showMakeSuggestions, setShowMakeSuggestions] = useState(false);
  const [modelQuery, setModelQuery] = useState("");
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  useEffect(() => {
    if (initialized) return;
    if (isNewMode) { setInitialized(true); return; }
    if (targetCar) {
      setMake(targetCar.make ?? "");
      setModel(targetCar.model ?? "");
      setYear(targetCar.year?.toString() ?? "");
      setColor(targetCar.color ?? "");
      setSilColor(targetCar.silhouetteColor ?? "#e53935");
      setAttempts(targetCar.aiGenerationAttempts ?? 0);
      setInitialized(true);
    }
  }, [isNewMode, targetCar, initialized]);

  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const filteredMakes = CAR_MAKES.filter(m => m.toLowerCase().includes(makeQuery.toLowerCase()) && makeQuery.length > 0);
  const availableModels = CAR_DATABASE[make] ?? [];
  const filteredModels = modelQuery.length > 0
    ? availableModels.filter(m => m.toLowerCase().includes(modelQuery.toLowerCase()))
    : availableModels.slice(0, 8);

  async function apiCall(path: string, method = "GET", body?: object) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-telegram-id": tgUser.id },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async function saveCar() {
    setSaving(true);
    try {
      const isFirstCar = !cars?.length;
      if (!isNewMode && targetCar) {
        await apiCall(`/api/cars/${targetCar.id}`, "PUT", { make, model, year: year ? parseInt(year) : null, color, silhouetteColor: silColor, isPrimary: targetCar.isPrimary });
      } else {
        await apiCall("/api/cars", "POST", { make, model, year: year ? parseInt(year) : null, color, silhouetteColor: silColor, isPrimary: isFirstCar });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      setLocation("/garage");
    } finally {
      setSaving(false);
    }
  }

  function handlePhotoSlot(idx: number) {
    fileRefs[idx].current?.click();
  }

  function handlePhotoFile(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум 10 МБ.");
      return;
    }

    // Validate type
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Допустимые форматы: JPG, PNG.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotos(prev => {
        const next = [...prev];
        next[idx] = dataUrl;
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  async function generate() {
    if (attempts >= MAX_ATTEMPTS) return;
    setStage("generating");

    // Save car data first if not saved
    let carId = targetCar?.id;
    if (!carId) {
      const isFirstCar = !cars?.length;
      const created = await apiCall("/api/cars", "POST", { make, model, year: year ? parseInt(year) : null, color, silhouetteColor: silColor, isPrimary: isFirstCar });
      carId = created.id;
      setCreatedCarId(created.id);
      await queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
    }

    try {
      // Call real AI pipeline (takes 5–15 seconds)
      const result = await apiCall(`/api/cars/${carId}/generate`, "POST", { sourcePhotos: photos });

      if (result.error) {
        alert(result.error + (result.details ? "\n\n" + result.details : ""));
        setStage("photos");
        return;
      }

      const newAttempts = result.attemptsUsed ?? (attempts + 1);
      setGeneratedUrl(result.aiStyledImageUrl);
      setAttempts(newAttempts);
      setStage("result");
    } catch {
      alert("Не удалось обработать фото. Попробуйте другое.");
      setStage("photos");
    }
  }

  async function acceptResult() {
    const carId = targetCar?.id ?? createdCarId;
    if (!carId) return;
    setSaving(true);
    await apiCall(`/api/cars/${carId}/accept`, "POST");
    await queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
    setSaving(false);
    setLocation("/garage");
  }

  async function deleteCar() {
    if (!targetCar) return;
    if (!confirm(`Удалить ${targetCar.make} ${targetCar.model}? Это действие нельзя отменить.`)) return;
    await apiCall(`/api/cars/${targetCar.id}`, "DELETE");
    await queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
    setLocation("/garage");
  }

  async function useSilhouette() {
    const carId = targetCar?.id ?? createdCarId;
    if (carId) {
      await apiCall(`/api/cars/${carId}/use-silhouette`, "POST", { silhouetteColor: silColor });
      await queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
    }
    setLocation("/garage");
  }

  // ── Stage: GENERATING ─────────────────────────────────────────────────────
  if (stage === "generating") {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white mb-2">Ставим машину в гараж...</h2>
          <p className="text-white/40 text-sm">Это займёт 5–15 секунд</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
        </div>
      </div>
    );
  }

  // ── Stage: RESULT ─────────────────────────────────────────────────────────
  if (stage === "result" && generatedUrl) {
    const attemptsLeft = MAX_ATTEMPTS - attempts;
    const exhausted = attemptsLeft <= 0;
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
        <div className="pt-12 px-5 pb-4 flex items-center gap-3 border-b border-white/6">
          <button onClick={() => setStage("photos")} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-lg font-black text-white">Результат генерации</h1>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <img src={generatedUrl} alt="Generated" className="w-full max-h-[50vh] object-contain" />
        </div>

        <div className="px-5 pb-4">
          <div className="bg-white/4 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-white/50 text-sm">Попытки</span>
            <span className="text-white font-bold text-sm">{attempts} / {MAX_ATTEMPTS}</span>
          </div>

          {exhausted && (
            <p className="text-yellow-400/80 text-xs text-center mb-3">
              Попытки исчерпаны. Вы можете принять текущий результат или использовать силуэт.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={acceptResult}
              disabled={saving}
              className="w-full py-3.5 bg-primary rounded-2xl font-black text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              Принять
            </button>
            {!exhausted ? (
              <button
                onClick={() => setStage("photos")}
                className="w-full py-3.5 bg-white/6 border border-white/10 rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Попробовать ещё раз ({attemptsLeft} осталось)
              </button>
            ) : (
              <button
                onClick={useSilhouette}
                className="w-full py-3.5 bg-white/6 border border-white/10 rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
              >
                Использовать силуэт
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Stage: PHOTOS ─────────────────────────────────────────────────────────
  if (stage === "photos") {
    const hasPhoto = photos.filter(Boolean).length >= 1;
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
        <div className="pt-12 px-5 pb-4 flex items-center gap-3 border-b border-white/6">
          <button onClick={() => setStage("edit")} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-lg font-black text-white">Загрузка фотографии</h1>
        </div>

        <div className="px-5 pt-5 pb-2">
          <p className="text-white/50 text-sm leading-relaxed">
            Загрузите <span className="text-white font-bold">фото вашего автомобиля</span> — с любого ракурса. Нейросеть приведёт его к единому виду и поставит в гараж.
          </p>
          <p className="text-white/30 text-xs mt-1">JPG, PNG · до 10 МБ · мин. 640×480</p>
        </div>

        <div className="px-5 pt-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i}>
              <input
                ref={fileRefs[i]}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={e => handlePhotoFile(i, e)}
              />
              <button
                onClick={() => handlePhotoSlot(i)}
                className={cn(
                  "w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 overflow-hidden transition-all active:scale-95",
                  photos[i] ? "border-transparent" : "border-white/15 bg-white/3",
                  i === 0 && !photos[i] && "border-primary/30 bg-primary/5"
                )}
              >
                {photos[i] ? (
                  <div className="relative w-full h-full">
                    <img src={photos[i]} alt={`Фото ${i+1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={e => { e.stopPropagation(); setPhotos(prev => { const n=[...prev]; n[i]=""; return n; }); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Plus className={cn("w-7 h-7", i === 0 ? "text-primary/50" : "text-white/25")} />
                    <span className={cn("text-xs", i === 0 ? "text-primary/50 font-bold" : "text-white/30")}>
                      {i === 0 ? "Основное фото" : `Фото ${i+1}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 pb-10 pt-6">
          <button
            onClick={generate}
            disabled={!hasPhoto || attempts >= MAX_ATTEMPTS}
            className="w-full py-3.5 bg-primary rounded-2xl font-black text-white active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {attempts >= MAX_ATTEMPTS ? "Попытки исчерпаны" : "Поставить в гараж"}
          </button>
        </div>
      </div>
    );
  }

  // ── Stage: EDIT (default) ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      <div className="pt-12 px-5 pb-4 flex items-center gap-3 border-b border-white/6">
        <button onClick={() => setLocation(isNewMode ? "/garage" : "/settings")} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>
        <h1 className="text-lg font-black text-white">{isNewMode ? "Новое авто" : "Изменить автомобиль"}</h1>
      </div>

      <div className="flex-1 px-5 pt-5 flex flex-col gap-5 overflow-y-auto">
        {/* Make */}
        <div className="relative">
          <label className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2 block">Марка</label>
          <input
            value={makeQuery || make}
            onChange={e => { setMakeQuery(e.target.value); setMake(e.target.value); setShowMakeSuggestions(true); setModel(""); setModelQuery(""); }}
            onBlur={() => setTimeout(() => setShowMakeSuggestions(false), 150)}
            placeholder="Например: Lada, BMW..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white font-medium placeholder-white/20 outline-none focus:border-primary/50 transition-colors"
          />
          {showMakeSuggestions && filteredMakes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden z-20 shadow-xl">
              {filteredMakes.slice(0, 5).map(m => (
                <button key={m} onMouseDown={() => { setMake(m); setMakeQuery(""); setShowMakeSuggestions(false); setModel(""); setModelQuery(""); }}
                  className="w-full text-left px-4 py-3 text-white/80 text-sm hover:bg-white/5 transition-colors">
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model */}
        <div className="relative">
          <label className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2 block">Модель</label>
          <input
            value={modelQuery || model}
            onChange={e => { setModelQuery(e.target.value); setModel(e.target.value); setShowModelSuggestions(true); }}
            onFocus={() => { if (availableModels.length > 0) setShowModelSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowModelSuggestions(false), 150)}
            placeholder="Например: 2109, M5..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white font-medium placeholder-white/20 outline-none focus:border-primary/50 transition-colors"
          />
          {showModelSuggestions && filteredModels.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden z-20 shadow-xl max-h-48 overflow-y-auto">
              {filteredModels.slice(0, 8).map(m => (
                <button key={m} onMouseDown={() => { setModel(m); setModelQuery(""); setShowModelSuggestions(false); }}
                  className="w-full text-left px-4 py-3 text-white/80 text-sm hover:bg-white/5 transition-colors">
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Year + Color */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2 block">Год</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="1995"
              min="1900" max="2025"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white font-medium placeholder-white/20 outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2 block">Цвет</label>
            <input
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="Белый"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white font-medium placeholder-white/20 outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Silhouette color */}
        <div>
          <label className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3 block">Цвет силуэта</label>
          <div className="flex gap-2 flex-wrap">
            {SILHOUETTE_COLORS.map(sc => (
              <button
                key={sc.hex}
                onClick={() => setSilColor(sc.hex)}
                title={sc.label}
                className={cn(
                  "w-9 h-9 rounded-full border-2 transition-all active:scale-90",
                  silColor === sc.hex ? "border-white scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: sc.hex }}
              />
            ))}
          </div>
        </div>

        {/* AI Generation block */}
        <div className="bg-white/4 rounded-2xl border border-white/8 p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-black text-sm">AI-стилизация</h3>
            <span className="text-white/30 text-xs">{attempts}/{MAX_ATTEMPTS} попыток</span>
          </div>
          <p className="text-white/40 text-xs mb-4 leading-relaxed">
            Загрузите фото вашего авто — нейросеть приведёт ракурс к единому виду и поставит машину в гараж.
          </p>
          {targetCar?.aiStatus === "pending_moderation" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 mb-3 text-yellow-400 text-xs font-medium">
              🕐 На модерации
            </div>
          )}
          {targetCar?.aiStatus === "approved" && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 mb-3 text-green-400 text-xs font-medium">
              ✓ Одобрено
            </div>
          )}
          {targetCar?.aiStatus === "rejected" && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3 text-red-400 text-xs font-medium">
              ✕ Отклонено — загрузите новые фото
            </div>
          )}
          <button
            onClick={() => setStage("photos")}
            disabled={attempts >= MAX_ATTEMPTS && targetCar?.aiStatus === "pending_moderation"}
            className="w-full py-3 bg-primary/15 border border-primary/30 rounded-xl font-bold text-primary text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            <Car className="w-4 h-4" />
            {targetCar?.aiStyledImageUrl ? "Перегенерировать" : "Загрузить фото"}
          </button>
        </div>
      </div>

      <div className="px-5 pb-10 pt-4 flex flex-col gap-3">
        <button
          onClick={saveCar}
          disabled={saving || !make || !model}
          className="w-full py-3.5 bg-primary rounded-2xl font-black text-white active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
        {!isNewMode && targetCar && (
          <button
            onClick={deleteCar}
            className="w-full py-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl font-bold text-red-400 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Удалить автомобиль
          </button>
        )}
      </div>
    </div>
  );
}
