import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Eye, Flag, Shield, ChevronRight, Check } from "lucide-react";
import { useCompleteOnboarding, useAddCar } from "@workspace/api-client-react";
import { getTgUser, cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "motorsport", label: "Автоспорт", emoji: "🏁" },
  { id: "exhibition", label: "Выставки", emoji: "🏆" },
  { id: "cruise", label: "Покатушки", emoji: "🚗" },
  { id: "club", label: "Автоклубы", emoji: "🤝" },
];

const SILHOUETTES = [
  { id: "bicycle", label: "Велосипед", emoji: "🚲" },
  { id: "scooter", label: "Самокат", emoji: "🛴" },
  { id: "skateboard", label: "Скейт", emoji: "🛹" },
  { id: "cart", label: "Тележка", emoji: "🛒" },
];

const onboardingSchema = z.object({
  displayName: z.string().min(2, "Имя обязательно"),
  role: z.enum(["viewer", "participant", "organizer"]),
  viewerSilhouette: z.enum(["bicycle", "scooter", "skateboard", "cart"]).optional().nullable(),
  organizationName: z.string().optional().nullable(),
  contactLink: z.string().optional().nullable(),
  adminContact: z.string().optional().nullable(),
  make: z.string().optional(),
  model: z.string().optional(),
  interestCategories: z.array(z.string()).min(1, "Выберите хотя бы одну категорию"),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const tgUser = getTgUser();

  const { mutateAsync: completeOnboarding, isPending: isSavingProfile } = useCompleteOnboarding();
  const { mutateAsync: addCar, isPending: isAddingCar } = useAddCar();

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: tgUser.first_name,
      role: "viewer",
      interestCategories: [],
    },
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = form;
  const role = watch("role");
  const selectedCats = watch("interestCategories") || [];
  const selectedSilhouette = watch("viewerSilhouette");

  const totalSteps = 4;

  const onSubmit = async (data: OnboardingData) => {
    try {
      await completeOnboarding({
        data: {
          telegramId: tgUser.id,
          username: tgUser.username,
          displayName: data.displayName,
          role: data.role,
          viewerSilhouette: data.viewerSilhouette,
          organizationName: data.organizationName,
          contactLink: data.contactLink,
          adminContact: data.adminContact,
          interestCategories: data.interestCategories,
        }
      });

      if ((data.role === "participant" || data.role === "organizer") && data.make && data.model) {
        await addCar({
          data: {
            make: data.make,
            model: data.model,
            isPrimary: true,
            categories: ["street"]
          }
        });
      }

      setLocation("/garage");
    } catch (error) {
      console.error("Onboarding failed", error);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const isPending = isSavingProfile || isAddingCar;

  function toggleCat(id: string) {
    const cur = selectedCats;
    if (cur.includes(id)) {
      setValue("interestCategories", cur.filter(c => c !== id));
    } else {
      setValue("interestCategories", [...cur, id]);
    }
  }

  return (
    <Layout showNav={false}>
      <div className="flex-1 flex flex-col pt-12 px-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Добро пожаловать в MEET</h1>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={cn("h-1 w-7 rounded-full transition-all", step > i ? "bg-primary" : "bg-white/10")} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-3xl font-black mb-2 text-gradient">Создать профиль</h2>
              <p className="text-muted-foreground mb-8">Начнём с основного.</p>

              <div className="space-y-6 flex-1">
                <div className="flex justify-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-4 border-card relative overflow-hidden">
                    {tgUser.photo_url ? (
                      <img src={tgUser.photo_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/80">Имя</label>
                  <Input {...form.register("displayName")} placeholder="Ваше имя" />
                  {errors.displayName && <p className="text-primary text-xs">{errors.displayName.message}</p>}
                </div>
              </div>

              <Button size="lg" className="w-full mt-auto mb-6" onClick={nextStep} disabled={!watch("displayName") || watch("displayName").length < 2}>
                Далее <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-3xl font-black mb-2 text-gradient">Выбрать роль</h2>
              <p className="text-muted-foreground mb-8">Как вы участвуете в комьюнити?</p>

              <div className="space-y-4 flex-1">
                <RoleCard
                  icon={<Eye className="w-6 h-6" />}
                  title="Зритель"
                  description="Я хочу наблюдать и посещать события."
                  active={role === "viewer"}
                  onClick={() => setValue("role", "viewer")}
                />
                <RoleCard
                  icon={<Flag className="w-6 h-6" />}
                  title="Участник"
                  description="У меня есть авто и я хочу участвовать."
                  active={role === "participant"}
                  onClick={() => setValue("role", "participant")}
                />
                <RoleCard
                  icon={<Shield className="w-6 h-6" />}
                  title="Организатор"
                  description="Я организую мероприятия и управляю клубами."
                  active={role === "organizer"}
                  onClick={() => setValue("role", "organizer")}
                />
              </div>

              <div className="flex gap-4 mt-auto mb-6">
                <Button variant="outline" size="lg" onClick={prevStep} className="flex-1">Назад</Button>
                <Button size="lg" onClick={nextStep} className="flex-[2]">
                  Далее <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              {role === "viewer" ? (
                <>
                  <h2 className="text-3xl font-black mb-2 text-gradient">Выбрать силуэт</h2>
                  <p className="text-muted-foreground mb-6">Выберите иконку для профиля зрителя.</p>
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    {SILHOUETTES.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setValue("viewerSilhouette", s.id as any)}
                        className={cn(
                          "glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer border-2 transition-all",
                          selectedSilhouette === s.id ? "border-primary bg-primary/10 shadow-glow" : "border-transparent"
                        )}
                      >
                        <span className="text-4xl">{s.emoji}</span>
                        <span className="font-bold capitalize text-sm">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : role === "organizer" ? (
                <>
                  <h2 className="text-3xl font-black mb-2 text-gradient">Ваша организация</h2>
                  <p className="text-muted-foreground mb-6">Расскажите о себе как организаторе.</p>
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">Название организации / клуба</label>
                      <Input {...form.register("organizationName")} placeholder="Клуб или команда" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">Ссылка для связи (Telegram, VK, сайт)</label>
                      <Input {...form.register("contactLink")} placeholder="https://t.me/myclub" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">Контакт администратора</label>
                      <Input {...form.register("adminContact")} placeholder="@username или телефон" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/8">
                      <p className="text-sm font-semibold text-white/80 mb-3">Основной автомобиль (необязательно)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs text-white/50">Марка</label>
                          <Input {...form.register("make")} placeholder="BMW" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-white/50">Модель</label>
                          <Input {...form.register("model")} placeholder="M3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-black mb-2 text-gradient">Ваш гараж</h2>
                  <p className="text-muted-foreground mb-6">Добавьте основной автомобиль.</p>
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">Марка</label>
                      <Input {...form.register("make")} placeholder="например, BMW" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">Модель</label>
                      <Input {...form.register("model")} placeholder="например, M3" />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-4 mt-auto mb-6">
                <Button variant="outline" size="lg" onClick={prevStep} className="flex-1">Назад</Button>
                <Button size="lg" onClick={nextStep} className="flex-[2]">
                  Далее <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-3xl font-black mb-2 text-gradient">Интересы</h2>
              <p className="text-muted-foreground mb-6">Выберите категории событий, которые вам интересны.</p>

              <div className="space-y-3 flex-1">
                {CATEGORIES.map(cat => {
                  const isSelected = selectedCats.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCat(cat.id)}
                      className={cn(
                        "w-full text-left rounded-2xl p-4 border-2 transition-all active:scale-[0.98] flex items-center justify-between",
                        isSelected ? "border-primary bg-primary/10 shadow-glow" : "border-white/10 bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className={cn("font-bold text-base", isSelected ? "text-primary" : "text-white")}>
                          {cat.label}
                        </span>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        isSelected ? "border-primary bg-primary" : "border-white/20"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
                {errors.interestCategories && (
                  <p className="text-primary text-xs">{errors.interestCategories.message}</p>
                )}
              </div>

              <div className="flex gap-4 mt-auto mb-6">
                <Button variant="outline" size="lg" onClick={prevStep} className="flex-1" disabled={isPending}>Назад</Button>
                <Button
                  size="lg"
                  onClick={handleSubmit(onSubmit)}
                  className="flex-[2]"
                  isLoading={isPending}
                  disabled={selectedCats.length === 0}
                >
                  Завершить
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function RoleCard({ icon, title, description, active, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-center gap-4",
        active ? "border-primary bg-primary/10 shadow-glow" : "border-white/10 bg-card hover:bg-white/5"
      )}
    >
      <div className={cn("p-3 rounded-xl", active ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
