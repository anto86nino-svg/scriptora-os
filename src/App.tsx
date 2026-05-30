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
import Home from "./pages/Home.tsx";
import AuthPage from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import PricingPage from "./pages/PricingPage.tsx";
import InstallPage from "./pages/InstallPage.tsx";
import { DevModeBadge } from "@/components/DevModeBadge";
import { AuthDebugPanel } from "@/components/AuthDebugPanel";
import GlobalCuriosity from "./components/GlobalCuriosity";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { DeviceViewSync } from "@/hooks/useDeviceView";

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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      <p className="text-sm">Loading…</p>
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
                <Route path="/auto-bestseller" element={<ProtectedRoute><AutoBestsellerPage /></ProtectedRoute>} />
                <Route path="/usage" element={<ProtectedRoute><UsagePage /></ProtectedRoute>} />
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
              <DevModeBadge />
              <AuthDebugPanel />
              <GlobalCuriosity />
            </MollyProvider>
          </DominationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
