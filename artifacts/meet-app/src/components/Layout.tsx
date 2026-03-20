import { ReactNode } from "react";
import { BottomNav } from "./Navigation";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background flex justify-center selection:bg-primary/30">
      <div className="w-full max-w-md relative min-h-screen shadow-2xl flex flex-col">
        <main className="flex-1 pb-36 flex flex-col relative z-10">
          {children}
        </main>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
