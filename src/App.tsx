import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ScrollToTop } from "@/components/routing/ScrollToTop";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DominationProvider } from "@/contexts/DominationContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CreditVisibilityShell } from "@/components/billing/CreditVisibilityShell";
import { MobileAppChrome } from "@/components/MobileAppChrome";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { RouteSuspenseFallback } from "@/components/boot/ScriptoraAliveTransition";
import { ScriptoraLogoMark } from "@/components/brand/ScriptoraLogoMark";

const Home = lazyWithRetry(() => import("./pages/Home.tsx"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard.tsx"));
const Index = lazyWithRetry(() => import("./pages/Index.tsx"));
const AuthPage = lazyWithRetry(() => import("./pages/Auth.tsx"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"));
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage.tsx"));
const LegalPage = lazyWithRetry(() => import("./pages/LegalPage.tsx"));
const CoverStudioPage = lazyWithRetry(() => import("./pages/CoverStudioPage.tsx"));
const DownloadsPage = lazyWithRetry(() => import("./pages/DownloadsPage.tsx"));
const ExportStudioPage = lazyWithRetry(() => import("./pages/ExportStudioPage.tsx"));

const queryClient = new QueryClient();

function ScriptoraOperationalBrandBeacon() {
  const location = useLocation();
  const hiddenRoutes = [
    "/",
    "/auth",
    "/pricing",
    "/legal",
    "/app",
    "/cover",
    "/export-studio",
  ];
  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <Link
      to="/dashboard"
      className="scriptora-global-brand-beacon"
      aria-label="Torna alla Dashboard Scriptora"
      title="Scriptora OS"
    >
      <ScriptoraLogoMark size="xs" alt="Scriptora OS" />
      <span className="scriptora-global-brand-label">Scriptora</span>
    </Link>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <DominationProvider>
              <Toaster />
              <Sonner />
              <AppErrorBoundary>
              <Suspense fallback={<RouteSuspenseFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/usage" element={<Navigate to="/pricing#credit-packs" replace />} />
                <Route path="/legal" element={<LegalPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Dashboard /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/writer" element={<ProtectedRoute><FeatureErrorBoundary featureName="Writer"><Navigate to="/app" replace /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/app" element={<ProtectedRoute><FeatureErrorBoundary featureName="Writer Studio"><Index /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/cover" element={<ProtectedRoute requiredFeature="cover_studio_template"><FeatureErrorBoundary featureName="Cover Studio"><CoverStudioPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/export-studio" element={<ProtectedRoute requiredFeature="export_epub"><FeatureErrorBoundary featureName="Export Studio"><ExportStudioPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/character-studio" element={<ProtectedRoute requiredFeature="book_engine_full"><Navigate to="/dashboard" replace state={{ openForge: true, source: "character-studio-redirect" }} /></ProtectedRoute>} />
                <Route path="/downloads" element={<ProtectedRoute><FeatureErrorBoundary featureName="Downloads"><DownloadsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/romanziere" element={<ProtectedRoute><Navigate to="/app?mode=romanziere" replace /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </AppErrorBoundary>
              <ScriptoraOperationalBrandBeacon />
              <CreditVisibilityShell />
              <MobileAppChrome />
          </DominationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
