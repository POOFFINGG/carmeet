import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Check, Lock, Globe, Users, Zap } from "lucide-react";
import { useCreateEvent } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "motorsport", label: "Автоспорт", emoji: "🏁" },
  { id: "exhibition", label: "Выставки", emoji: "🏆" },
  { id: "cruise", label: "Покатушки", emoji: "🚗" },
  { id: "club", label: "Автоклубы", emoji: "🤝" },
];

const SUBCATEGORIES: Record<string, { id: string; label: string }[]> = {
  motorsport: [
    { id: "drag", label: "Дрэг" },
    { id: "drift", label: "Дрифт" },
    { id: "circuit", label: "Кольцо" },
    { id: "rally", label: "Ралли" },
    { id: "track_day", label: "Трек-дэй" },
  ],
  exhibition: [
    { id: "meetup", label: "Митап" },
    { id: "show", label: "Шоу" },
    { id: "concours", label: "Конкурс" },
  ],
  cruise: [
    { id: "city", label: "По городу" },
    { id: "mountain", label: "Горная трасса" },
    { id: "night", label: "Ночные" },
    { id: "convoy", label: "Колонна" },
  ],
  club: [
    { id: "meeting", label: "Встреча клуба" },
    { id: "training", label: "Тренировка" },
    { id: "social", label: "Соц. событие" },
  ],
};

const schema = z.object({
  title: z.string().min(3, "Минимум 3 символа"),
  description: z.string().optional(),
  category: z.enum(["motorsport", "exhibition", "cruise", "club"]),
  subcategories: z.array(z.string()).min(1, "Выберите хотя бы один тип"),
  date: z.string().min(1, "Укажите дату"),
  endDate: z.string().optional(),
  location: z.string().min(3, "Укажите место"),
  maxParticipants: z.coerce.number().optional(),
  priceParticipants: z.coerce.number().optional(),
  priceViewers: z.coerce.number().optional(),
  isPrivate: z.boolean().default(false),
  autoAccept: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { mutateAsync: createEvent, isPending } = useCreateEvent();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "cruise",
      subcategories: [],
      isPrivate: false,
      autoAccept: false,
    }
  });

  const { watch, setValue, register, handleSubmit, formState: { errors } } = form;
  const category = watch("category");
  const subcategories = watch("subcategories") || [];
  const isPrivate = watch("isPrivate");
  const autoAccept = watch("autoAccept");

  function toggleSubcat(id: string) {
    if (subcategories.includes(id)) {
      setValue("subcategories", subcategories.filter(s => s !== id));
    } else {
      setValue("subcategories", [...subcategories, id]);
    }
  }

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await createEvent({
        data: {
          title: data.title,
          description: data.description || null,
          category: data.category,
          subcategories: data.subcategories,
          date: new Date(data.date).toISOString(),
          endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
          location: data.location,
          maxParticipants: data.maxParticipants || null,
          isPrivate: data.isPrivate,
          autoAccept: data.autoAccept,
          priceParticipants: data.priceParticipants || null,
          priceViewers: data.priceViewers || null,
        }
      });
      setLocation(`/events/${res.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const subs = SUBCATEGORIES[category] || [];

  return (
    <Layout showNav={false}>
      <div className="pt-12 px-6 pb-32">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => window.history.back()} className="w-10 h-10 glass-panel rounded-full flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black">Создать событие</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Название события</label>
            <Input {...register("title")} placeholder="Ночной заезд 2025" />
            {errors.title && <p className="text-primary text-xs">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Описание</label>
            <textarea
              {...register("description")}
              placeholder="Расскажите о событии, правилах, требованиях..."
              rows={4}
              className="flex w-full rounded-xl border-2 border-border bg-background/50 px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-primary text-white resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Категория</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setValue("category", cat.id as any); setValue("subcategories", []); }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-sm font-semibold",
                      isSelected ? "border-primary bg-primary/10 text-primary" : "border-white/10 bg-white/4 text-white/70"
                    )}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategories */}
          {subs.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80">Тип события</label>
              <div className="flex flex-wrap gap-2">
                {subs.map(sub => {
                  const isSelected = subcategories.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => toggleSubcat(sub.id)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-all flex items-center gap-1.5",
                        isSelected ? "border-primary bg-primary/10 text-primary" : "border-white/10 bg-white/4 text-white/60"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {sub.label}
                    </button>
                  );
                })}
              </div>
              {errors.subcategories && <p className="text-primary text-xs">{errors.subcategories.message}</p>}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80">Начало</label>
              <Input type="datetime-local" {...register("date")} />
              {errors.date && <p className="text-primary text-xs">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80">Конец (необяз.)</label>
              <Input type="datetime-local" {...register("endDate")} />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Место проведения</label>
            <Input {...register("location")} placeholder="Центральная площадь, ул. Ленина 1" />
            {errors.location && <p className="text-primary text-xs">{errors.location.message}</p>}
          </div>

          {/* Max participants */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Макс. участников (необязательно)</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input type="number" {...register("maxParticipants")} placeholder="100" className="pl-10" />
            </div>
          </div>

          {/* Prices */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Стоимость участия (₽)</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-white/40">Для участников</label>
                <Input type="number" {...register("priceParticipants")} placeholder="0 (бесплатно)" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/40">Для зрителей</label>
                <Input type="number" {...register("priceViewers")} placeholder="0 (бесплатно)" />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white/80">Настройки доступа</label>

            <button
              type="button"
              onClick={() => setValue("isPrivate", !isPrivate)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                isPrivate ? "border-primary/50 bg-primary/8" : "border-white/10 bg-white/4"
              )}
            >
              <div className="flex items-center gap-3">
                {isPrivate ? <Lock className="w-5 h-5 text-primary" /> : <Globe className="w-5 h-5 text-white/50" />}
                <div className="text-left">
                  <p className={cn("font-bold text-sm", isPrivate ? "text-primary" : "text-white")}>
                    {isPrivate ? "Закрытое событие" : "Открытое событие"}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {isPrivate ? "Только по приглашению" : "Доступно всем"}
                  </p>
                </div>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full border-2 transition-all relative",
                isPrivate ? "border-primary bg-primary" : "border-white/20 bg-white/10"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                  isPrivate ? "left-[26px]" : "left-0.5"
                )} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setValue("autoAccept", !autoAccept)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                autoAccept ? "border-green-500/50 bg-green-500/8" : "border-white/10 bg-white/4"
              )}
            >
              <div className="flex items-center gap-3">
                <Zap className={cn("w-5 h-5", autoAccept ? "text-green-400" : "text-white/50")} />
                <div className="text-left">
                  <p className={cn("font-bold text-sm", autoAccept ? "text-green-400" : "text-white")}>
                    Авто-одобрение заявок
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {autoAccept ? "Заявки принимаются автоматически" : "Вы проверяете каждую заявку"}
                  </p>
                </div>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full border-2 transition-all relative",
                autoAccept ? "border-green-500 bg-green-500" : "border-white/20 bg-white/10"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                  autoAccept ? "left-[26px]" : "left-0.5"
                )} />
              </div>
            </button>
          </div>

          <Button type="submit" size="lg" className="w-full mt-4" isLoading={isPending}>
            Опубликовать событие
          </Button>
        </form>
      </div>
    </Layout>
  );
}
