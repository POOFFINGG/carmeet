import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Eye, Flag, Shield, ChevronRight, Car as CarIcon } from "lucide-react";
import { useCompleteOnboarding, useAddCar } from "@workspace/api-client-react";
import { getTgUser, cn } from "@/lib/utils";

const onboardingSchema = z.object({
  displayName: z.string().min(2, "Name is required"),
  role: z.enum(["viewer", "participant", "organizer"]),
  viewerSilhouette: z.enum(["bicycle", "scooter", "skateboard", "cart"]).optional().nullable(),
  organizationName: z.string().optional().nullable(),
  // Car Info
  make: z.string().optional(),
  model: z.string().optional(),
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
    },
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = form;
  const role = watch("role");

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
          interestCategories: ["motorsport", "exhibition"]
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

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const isPending = isSavingProfile || isAddingCar;

  return (
    <Layout showNav={false}>
      <div className="flex-1 flex flex-col pt-12 px-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Welcome to MEET</h1>
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("h-1 w-8 rounded-full", step >= i ? "bg-primary" : "bg-white/10")} />
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
              <h2 className="text-3xl font-black mb-2 text-gradient">Create Profile</h2>
              <p className="text-muted-foreground mb-8">Let's start with the basics.</p>
              
              <div className="space-y-6 flex-1">
                <div className="flex justify-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-4 border-card relative overflow-hidden">
                    <User size={32} className="text-muted-foreground" />
                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <span className="text-xs font-bold text-white">UPLOAD</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/80">Display Name</label>
                  <Input {...form.register("displayName")} placeholder="Your name" />
                  {errors.displayName && <p className="text-primary text-xs">{errors.displayName.message}</p>}
                </div>
              </div>

              <Button size="lg" className="w-full mt-auto mb-6" onClick={nextStep}>
                Next <ChevronRight className="ml-2 w-5 h-5" />
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
              <h2 className="text-3xl font-black mb-2 text-gradient">Select Role</h2>
              <p className="text-muted-foreground mb-8">How do you participate in the community?</p>

              <div className="space-y-4 flex-1">
                <RoleCard 
                  icon={<Eye className="w-6 h-6" />}
                  title="Viewer"
                  description="I just want to watch and attend events."
                  active={role === "viewer"}
                  onClick={() => setValue("role", "viewer")}
                />
                <RoleCard 
                  icon={<Flag className="w-6 h-6" />}
                  title="Participant"
                  description="I have a car and want to participate."
                  active={role === "participant"}
                  onClick={() => setValue("role", "participant")}
                />
                <RoleCard 
                  icon={<Shield className="w-6 h-6" />}
                  title="Organizer"
                  description="I host events and manage clubs."
                  active={role === "organizer"}
                  onClick={() => setValue("role", "organizer")}
                />
              </div>

              <div className="flex gap-4 mt-auto mb-6">
                <Button variant="outline" size="lg" onClick={prevStep} className="flex-1">Back</Button>
                <Button size="lg" onClick={nextStep} className="flex-[2]">
                  Next <ChevronRight className="ml-2 w-5 h-5" />
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
                  <h2 className="text-3xl font-black mb-2 text-gradient">Choose Ride</h2>
                  <p className="text-muted-foreground mb-8">Select a silhouette for your profile.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {["bicycle", "scooter", "skateboard", "cart"].map((r) => (
                      <div 
                        key={r}
                        onClick={() => setValue("viewerSilhouette", r as any)}
                        className={cn(
                          "glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer border-2 transition-all",
                          watch("viewerSilhouette") === r ? "border-primary bg-primary/10 shadow-glow" : "border-transparent"
                        )}
                      >
                        <CarIcon size={32} className={watch("viewerSilhouette") === r ? "text-primary" : "text-muted-foreground"} />
                        <span className="font-bold capitalize">{r}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-black mb-2 text-gradient">Your Garage</h2>
                  <p className="text-muted-foreground mb-8">Add your primary vehicle.</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">Make</label>
                      <Input {...form.register("make")} placeholder="e.g. Porsche" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">Model</label>
                      <Input {...form.register("model")} placeholder="e.g. 911 GT3" />
                    </div>
                    {role === "organizer" && (
                      <div className="space-y-2 mt-6">
                        <label className="text-sm font-semibold text-white/80">Organization Name</label>
                        <Input {...form.register("organizationName")} placeholder="Club or Team Name" />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-4 mt-auto mb-6">
                <Button variant="outline" size="lg" onClick={prevStep} className="flex-1" disabled={isPending}>Back</Button>
                <Button size="lg" onClick={handleSubmit(onSubmit)} className="flex-[2]" isLoading={isPending}>
                  Complete Setup
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
