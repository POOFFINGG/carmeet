import { Link, useLocation } from "wouter";
import { Car, Map as MapIcon, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { href: "/garage", icon: Car, label: "Garage" },
    { href: "/map", icon: MapIcon, label: "Map" },
    { href: "/events", icon: Calendar, label: "Events" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe">
      <div className="w-full max-w-md bg-card/80 backdrop-blur-2xl border-t border-white/5 pb-6 pt-3 px-6 flex justify-between items-center rounded-t-3xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
        {tabs.map((tab) => {
          const isActive = location === tab.href;
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center justify-center w-16 group outline-none">
              <div className={cn(
                "relative z-10 flex flex-col items-center transition-colors duration-300",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-2xl -z-0"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
