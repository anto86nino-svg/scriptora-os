import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DominationProvider } from "@/contexts/DominationContext";
import { MollyProvider } from "@/molly/MollyProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
const Home = lazy(() => import("./pages/Home.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));
const InstallPage = lazy(() => import("./pages/InstallPage.tsx"));
import { DevModeBadge } from "@/components/DevModeBadge";
import { AuthDebugPanel } from "@/components/AuthDebugPanel";
import GlobalCuriosity from "./components/GlobalCuriosity";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { ScriptoraPremiumState } from "@/components/ScriptoraPremiumState";
import { DeviceViewSync } from "@/hooks/useDeviceView";
import { DesktopPreviewChrome } from "@/components/DesktopPreviewChrome";
import { LivingBackgroundLayer } from "@/components/immersive/LivingBackgroundLayer";
import { LivingAtmosphereAmbience } from "@/components/immersive/LivingAtmosphereAmbience";
import { PremiumActivationNoticeHost } from "@/components/billing/PremiumActivationNoticeDialog";
import { InternalLoadingGuardPanel } from "@/components/InternalLoadingGuardPanel";

const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const AutoBestsellerPage = lazy(() => import("./pages/AutoBestsellerPage.tsx"));
const UsagePage = lazy(() => import("./pages/UsagePage.tsx"));
const KdpLaunchPage = lazy(() => import("./pages/KdpLaunchPage.tsx"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage.tsx"));
const BestsellerRadarPage = lazy(() => import("./pages/BestsellerRadarPage.tsx"));
const KeywordGoldPage = lazy(() => import("./pages/KeywordGoldPage.tsx"));

const queryClient = new QueryClient();

function RouteLoadingFallback() {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      console.error("[dashboard bootstrap failed] Route chunk loading exceeded the safe boot window");
      setStalled(true);
    }, 10_000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="scriptora-workspace-shell relative min-h-[100dvh] bg-background">
      <ScriptoraPremiumState variant="loading-project" fullPage />
      {stalled && (
        <InternalLoadingGuardPanel details="La route dell'app o un modulo del workspace non ha completato il caricamento nei tempi previsti." />
      )}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <DominationProvider>
            <MollyProvider>
              <Toaster />
              <Sonner />
              <AppErrorBoundary>
              <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/auto-bestseller" element={<ProtectedRoute requiredFeature="bestseller_prediction"><AutoBestsellerPage /></ProtectedRoute>} />
                <Route path="/usage" element={<ProtectedRoute ownerOnly><UsagePage /></ProtectedRoute>} />
                <Route path="/kdp-launch" element={<ProtectedRoute requiredFeature="kdp_market_base"><KdpLaunchPage /></ProtectedRoute>} />
                <Route path="/downloads" element={<ProtectedRoute requiredFeature="export_epub"><DownloadsPage /></ProtectedRoute>} />
                <Route path="/bestseller-radar" element={<ProtectedRoute requiredFeature="trending_niches_limited"><BestsellerRadarPage /></ProtectedRoute>} />
                <Route path="/keyword-gold" element={<ProtectedRoute requiredFeature="kdp_market_base"><KeywordGoldPage /></ProtectedRoute>} />
                <Route path="/install" element={<InstallPage />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </AppErrorBoundary>
              <DeviceViewSync />
              <DesktopPreviewChrome />
              <LivingBackgroundLayer />
              <LivingAtmosphereAmbience />
              <DevModeBadge />
              <AuthDebugPanel />
              <GlobalCuriosity />
              <PremiumActivationNoticeHost />
            </MollyProvider>
          </DominationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
