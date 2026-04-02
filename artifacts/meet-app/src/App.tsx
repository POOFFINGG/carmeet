import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";

import Splash from "@/pages/Splash";
import Onboarding from "@/pages/Onboarding";
import Garage from "@/pages/Garage";
import MapView from "@/pages/Map";
import Calendar from "@/pages/Calendar";
import Profile from "@/pages/Profile";
import EventDetail from "@/pages/EventDetail";
import CreateEvent from "@/pages/CreateEvent";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import EditCar from "@/pages/EditCar";
import Admin from "@/pages/Admin";
import ManageEvent from "@/pages/ManageEvent";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Don't retry 404s for auth heavily
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const localDone = localStorage.getItem("onboarding_done") === "1";
  const { data: user, isLoading, error } = useGetMe({ query: { enabled: !localDone } });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Artificial delay to show beautiful splash (skip if already onboarded locally)
    const delay = localDone ? 0 : 1500;
    const t = setTimeout(() => setIsReady(true), delay);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (localDone || isLoading) return;

    if (user?.onboardingComplete) {
      if (location === "/" || location === "/onboarding") {
        setLocation("/garage");
      }
    } else if (error || !user) {
      if (location !== "/onboarding") {
        setLocation("/onboarding");
      }
    }
  }, [isReady, isLoading, user, error, location, setLocation]);

  // If onboarding done locally — no need to wait for API, show content immediately
  if (localDone) return <>{children}</>;
  if (!isReady || isLoading) return <Splash />;

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/garage" component={Garage} />
      <Route path="/map" component={MapView} />
      <Route path="/events" component={Calendar} />
      <Route path="/events/create" component={CreateEvent} />
      <Route path="/events/:id/manage" component={ManageEvent} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/settings" component={Settings} />
      <Route path="/settings/car/:carId" component={EditCar} />
      <Route path="/settings/car" component={EditCar} />
      <Route path="/admin" component={Admin} />
      {/* Root path falls through to AuthGuard redirect logic */}
      <Route path="/" component={() => null} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGuard>
            <Router />
          </AuthGuard>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
