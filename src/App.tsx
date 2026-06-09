import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DominationProvider } from "@/contexts/DominationContext";
import { MollyProvider } from "@/molly/MollyProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "./pages/NotFound.tsx";
import DownloadsPage from "./pages/DownloadsPage.tsx";
import InstallPage from "./pages/InstallPage.tsx";
import { DevModeBadge } from "@/components/DevModeBadge";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { MollyErrorBoundary } from "@/components/molly/MollyErrorBoundary";

const Home = lazy(() => import("./pages/Home.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const GlobalCuriosity = lazy(() => import("./components/GlobalCuriosity"));
const ScriptoraStepGuide = lazy(() =>
  import("./components/ScriptoraStepGuide").then((m) => ({ default: m.ScriptoraStepGuide })),
);
const AutoBestsellerPage = lazy(() => import("./pages/AutoBestsellerPage.tsx"));
const UsagePage = lazy(() => import("./pages/UsagePage.tsx"));
const KdpLaunchPage = lazy(() => import("./pages/KdpLaunchPage.tsx"));
const BestsellerRadarPage = lazy(() => import("./pages/BestsellerRadarPage.tsx"));
const KeywordGoldPage = lazy(() => import("./pages/KeywordGoldPage.tsx"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="scriptora-ios-screen scriptora-app-surface flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <DominationProvider>
            <MollyErrorBoundary>
            <MollyProvider>
              <Toaster />
              <Sonner />
              <AppErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/auto-bestseller" element={<ProtectedRoute><FeatureErrorBoundary featureName="Auto Bestseller"><AutoBestsellerPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/usage" element={<ProtectedRoute><UsagePage /></ProtectedRoute>} />
                <Route path="/kdp-launch" element={<ProtectedRoute requiredFeature="kdp_market_base"><FeatureErrorBoundary featureName="KDP Launch"><KdpLaunchPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/downloads" element={<ProtectedRoute><DownloadsPage /></ProtectedRoute>} />
                <Route path="/bestseller-radar" element={<ProtectedRoute requiredFeature="trending_niches_limited"><BestsellerRadarPage /></ProtectedRoute>} />
                <Route path="/keyword-gold" element={<ProtectedRoute requiredFeature="kdp_market_base"><KeywordGoldPage /></ProtectedRoute>} />
                <Route path="/install" element={<InstallPage />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </AppErrorBoundary>
              <Suspense fallback={null}>
                <ScriptoraStepGuide />
                <GlobalCuriosity />
              </Suspense>
              <DevModeBadge />
            </MollyProvider>
            </MollyErrorBoundary>
          </DominationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
