import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { UpgradePopup } from "@/components/upgrade-popup";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

// Wire up token getter — runs once at module load, before any queries
setAuthTokenGetter(() => localStorage.getItem("token"));

// Point API calls to external server when VITE_API_URL is set (e.g. on Vercel)
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL as string);
}

// Pages — lazy-loaded for faster initial load
const Landing = lazy(() => import("@/pages/landing"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ContentFeed = lazy(() => import("@/pages/content/feed"));
const ContentDetail = lazy(() => import("@/pages/content/detail"));
const Membership = lazy(() => import("@/pages/membership"));
const Profile = lazy(() => import("@/pages/profile"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const Referrals = lazy(() => import("@/pages/referrals"));
const Bookings = lazy(() => import("@/pages/bookings"));
const Notifications = lazy(() => import("@/pages/notifications"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ModelProfile = lazy(() => import("@/pages/model-profile"));
const DMs = lazy(() => import("@/pages/dms"));
const Posts = lazy(() => import("@/pages/posts"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
      <span className="relative inline-flex items-center justify-center w-12 h-12">
        <span className="absolute inset-0 rounded-full border-[3px] border-primary/10" />
        <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin" />
        <span className="absolute inset-1 rounded-full border-2 border-transparent border-b-primary/40 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </span>
      <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-primary/50 animate-pulse select-none">
        Loading
      </span>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login"><AuthPage mode="login" /></Route>
          <Route path="/register"><AuthPage mode="register" /></Route>
          <Route path="/content" component={ContentFeed} />
          <Route path="/content/:id" component={ContentDetail} />
          <Route path="/models/:slug" component={ModelProfile} />
          <Route path="/membership" component={Membership} />
          <Route path="/profile" component={Profile} />
          <Route path="/referrals" component={Referrals} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/dms" component={DMs} />
          <Route path="/posts" component={Posts} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
              <UpgradePopup />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
