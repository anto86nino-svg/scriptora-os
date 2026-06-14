import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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

const Home = lazyWithRetry(() => import("./pages/Home.tsx"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard.tsx"));
const Index = lazyWithRetry(() => import("./pages/Index.tsx"));
const AuthPage = lazyWithRetry(() => import("./pages/Auth.tsx"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"));
const AutoBestsellerPage = lazyWithRetry(() => import("./pages/AutoBestsellerPage.tsx"));
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage.tsx"));
const KdpLaunchPage = lazyWithRetry(() => import("./pages/KdpLaunchPage.tsx"));
const DownloadsPage = lazyWithRetry(() => import("./pages/DownloadsPage.tsx"));
const BestsellerRadarPage = lazyWithRetry(() => import("./pages/BestsellerRadarPage.tsx"));
const KeywordGoldPage = lazyWithRetry(() => import("./pages/KeywordGoldPage.tsx"));
const InstallPage = lazyWithRetry(() => import("./pages/InstallPage.tsx"));
const StudySessionPage = lazyWithRetry(() => import("./pages/StudySessionPage.tsx"));
const WriterOsPage = lazyWithRetry(() => import("./pages/WriterOsPage.tsx"));
const BestsellerOsPage = lazyWithRetry(() => import("./pages/BestsellerOsPage.tsx"));
const PublishingOsPage = lazyWithRetry(() => import("./pages/PublishingOsPage.tsx"));
const StudyOsPage = lazyWithRetry(() => import("./pages/StudyOsPage.tsx"));
const IdentityOsPage = lazyWithRetry(() => import("./pages/IdentityOsPage.tsx"));
const UsagePage = lazyWithRetry(() => import("./pages/UsagePage.tsx"));
const DiagnosticsPage = lazyWithRetry(() => import("./pages/DiagnosticsPage.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
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
                <Route path="/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Dashboard /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/writer" element={<ProtectedRoute><FeatureErrorBoundary featureName="Writer OS"><WriterOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/bestseller" element={<ProtectedRoute><FeatureErrorBoundary featureName="Bestseller OS"><BestsellerOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/publishing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Publishing OS"><PublishingOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/identity" element={<ProtectedRoute><FeatureErrorBoundary featureName="Identity OS"><IdentityOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/study" element={<ProtectedRoute><FeatureErrorBoundary featureName="Study OS"><StudyOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/study-session" element={<ProtectedRoute><FeatureErrorBoundary featureName="Study OS"><StudySessionPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/app" element={<ProtectedRoute><FeatureErrorBoundary featureName="Writer Studio"><Index /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/auto-bestseller" element={<ProtectedRoute><FeatureErrorBoundary featureName="Auto Bestseller"><AutoBestsellerPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/usage" element={<ProtectedRoute><FeatureErrorBoundary featureName="Usage"><UsagePage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/kdp-launch" element={<ProtectedRoute requiredFeature="kdp_market_base"><FeatureErrorBoundary featureName="KDP Launch"><KdpLaunchPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/downloads" element={<ProtectedRoute><FeatureErrorBoundary featureName="Downloads"><DownloadsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/bestseller-radar" element={<ProtectedRoute requiredFeature="trending_niches_limited"><BestsellerRadarPage /></ProtectedRoute>} />
                <Route path="/keyword-gold" element={<ProtectedRoute requiredFeature="kdp_market_base"><KeywordGoldPage /></ProtectedRoute>} />
                <Route path="/install" element={<InstallPage />} />
                <Route path="/diagnostics" element={<DiagnosticsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </AppErrorBoundary>
              <CreditVisibilityShell />
              <MobileAppChrome />
          </DominationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
