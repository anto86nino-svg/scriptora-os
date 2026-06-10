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
import { DevModeBadge } from "@/components/DevModeBadge";
import { CreditVisibilityShell } from "@/components/billing/CreditVisibilityShell";
import GlobalCuriosity from "./components/GlobalCuriosity";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { MollyErrorBoundary } from "@/components/molly/MollyErrorBoundary";
import { ScriptoraStepGuide } from "@/components/ScriptoraStepGuide";
import { Loader2 } from "lucide-react";

const Home = lazy(() => import("./pages/Home.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AutoBestsellerPage = lazy(() => import("./pages/AutoBestsellerPage.tsx"));
const UsagePage = lazy(() => import("./pages/UsagePage.tsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));
const KdpLaunchPage = lazy(() => import("./pages/KdpLaunchPage.tsx"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage.tsx"));
const BestsellerRadarPage = lazy(() => import("./pages/BestsellerRadarPage.tsx"));
const KeywordGoldPage = lazy(() => import("./pages/KeywordGoldPage.tsx"));
const InstallPage = lazy(() => import("./pages/InstallPage.tsx"));
const StudySessionPage = lazy(() => import("./pages/StudySessionPage.tsx"));
const WriterOsPage = lazy(() => import("./pages/WriterOsPage.tsx"));
const BestsellerOsPage = lazy(() => import("./pages/BestsellerOsPage.tsx"));
const PublishingOsPage = lazy(() => import("./pages/PublishingOsPage.tsx"));
const StudyOsPage = lazy(() => import("./pages/StudyOsPage.tsx"));
const IdentityOsPage = lazy(() => import("./pages/IdentityOsPage.tsx"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                <Route path="/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Dashboard /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/writer" element={<ProtectedRoute><WriterOsPage /></ProtectedRoute>} />
                <Route path="/bestseller" element={<ProtectedRoute><FeatureErrorBoundary featureName="Bestseller OS"><BestsellerOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/publishing" element={<ProtectedRoute><PublishingOsPage /></ProtectedRoute>} />
                <Route path="/identity" element={<ProtectedRoute><IdentityOsPage /></ProtectedRoute>} />
                <Route path="/study" element={<ProtectedRoute><FeatureErrorBoundary featureName="Study OS"><StudyOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/study-session" element={<ProtectedRoute><FeatureErrorBoundary featureName="Study OS"><StudySessionPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/app" element={<ProtectedRoute><FeatureErrorBoundary featureName="Writer Studio"><Index /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/auto-bestseller" element={<ProtectedRoute><FeatureErrorBoundary featureName="Auto Bestseller"><AutoBestsellerPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/usage" element={<ProtectedRoute><UsagePage /></ProtectedRoute>} />
                <Route path="/kdp-launch" element={<ProtectedRoute requiredFeature="kdp_market_base"><FeatureErrorBoundary featureName="KDP Launch"><KdpLaunchPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/downloads" element={<ProtectedRoute><DownloadsPage /></ProtectedRoute>} />
                <Route path="/bestseller-radar" element={<ProtectedRoute requiredFeature="trending_niches_limited"><BestsellerRadarPage /></ProtectedRoute>} />
                <Route path="/keyword-gold" element={<ProtectedRoute requiredFeature="kdp_market_base"><KeywordGoldPage /></ProtectedRoute>} />
                <Route path="/install" element={<InstallPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </AppErrorBoundary>
              <CreditVisibilityShell />
              <ScriptoraStepGuide />
              <DevModeBadge />
              <GlobalCuriosity />
            </MollyProvider>
            </MollyErrorBoundary>
          </DominationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
