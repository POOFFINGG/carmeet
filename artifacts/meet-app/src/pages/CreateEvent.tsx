import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";
import { useCreateEvent } from "@workspace/api-client-react";

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.enum(["motorsport", "exhibition", "cruise", "club"]),
  date: z.string(),
  location: z.string().min(3),
  maxParticipants: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { mutateAsync: createEvent, isPending } = useCreateEvent();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "club" }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await createEvent({
        data: {
          ...data,
          subcategories: ["meetup"],
          isPrivate: false,
          date: new Date(data.date).toISOString(),
        }
      });
      setLocation(`/events/${res.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Layout showNav={false}>
      <div className="pt-12 px-6 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => window.history.back()} className="w-10 h-10 glass-panel rounded-full flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black">Create Event</h1>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Event Title</label>
            <Input {...form.register("title")} placeholder="Night Run 2025" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Category</label>
            <select 
              {...form.register("category")}
              className="flex h-14 w-full rounded-xl border-2 border-border bg-background/50 px-4 py-2 text-base focus-visible:outline-none focus-visible:border-primary text-white"
            >
              <option value="motorsport">Motorsport</option>
              <option value="exhibition">Exhibition</option>
              <option value="cruise">Cruise / Run</option>
              <option value="club">Club Meet</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Date & Time</label>
            <Input type="datetime-local" {...form.register("date")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Location</label>
            <Input {...form.register("location")} placeholder="Downtown Square" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80">Max Participants (Optional)</label>
            <Input type="number" {...form.register("maxParticipants")} placeholder="100" />
          </div>

          <Button type="submit" size="lg" className="w-full mt-8" isLoading={isPending}>
            Publish Event
          </Button>
        </form>
      </div>
    </Layout>
  );
}
