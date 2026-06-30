import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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

const Home = lazyWithRetry(() => import("./pages/Home.tsx"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard.tsx"));
const MobileMarketHubPage = lazyWithRetry(() => import("./mobile/MobileMarketHubPage.tsx"));
const Index = lazyWithRetry(() => import("./pages/Index.tsx"));
const AuthPage = lazyWithRetry(() => import("./pages/Auth.tsx"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"));
const PricingPage = lazyWithRetry(() => import("./pages/PricingPage.tsx"));
const LegalPage = lazyWithRetry(() => import("./pages/LegalPage.tsx"));
const KdpLaunchPage = lazyWithRetry(() => import("./pages/KdpLaunchPage.tsx"));
const CoverStudioPage = lazyWithRetry(() => import("./pages/CoverStudioPage.tsx"));
const DownloadsPage = lazyWithRetry(() => import("./pages/DownloadsPage.tsx"));
const BestsellerRadarPage = lazyWithRetry(() => import("./pages/BestsellerRadarPage.tsx"));
const KeywordGoldPage = lazyWithRetry(() => import("./pages/KeywordGoldPage.tsx"));
const InstallPage = lazyWithRetry(() => import("./pages/InstallPage.tsx"));
const StudySessionPage = lazyWithRetry(() => import("./pages/StudySessionPage.tsx"));
const PublishingOsPage = lazyWithRetry(() => import("./pages/PublishingOsPage.tsx"));
const StudyOsPage = lazyWithRetry(() => import("./pages/StudyOsPage.tsx"));
const IdentityOsPage = lazyWithRetry(() => import("./pages/IdentityOsPage.tsx"));
const UsagePage = lazyWithRetry(() => import("./pages/UsagePage.tsx"));
const DiagnosticsPage = lazyWithRetry(() => import("./pages/DiagnosticsPage.tsx"));
const NotepadPage = lazyWithRetry(() => import("./pages/NotepadPage.tsx"));
const TitleIntelligencePage = lazyWithRetry(() => import("./pages/TitleIntelligencePage.tsx"));
const ManuscriptLabPage = lazyWithRetry(() => import("./pages/ManuscriptLabPage.tsx"));
const ExportStudioPage = lazyWithRetry(() => import("./pages/ExportStudioPage.tsx"));
const CasaScritturaPage = lazyWithRetry(() => import("./pages/os/CasaScritturaPage.tsx"));
const CasaPubblicazionePage = lazyWithRetry(() => import("./pages/os/CasaPubblicazionePage.tsx"));
const CasaMercatoPage = lazyWithRetry(() => import("./pages/os/CasaMercatoPage.tsx"));
const CasaStudioPage = lazyWithRetry(() => import("./pages/os/CasaStudioPage.tsx"));
const CasaImpostazioniPage = lazyWithRetry(() => import("./pages/os/CasaImpostazioniPage.tsx"));

const queryClient = new QueryClient();

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
                <Route path="/legal" element={<LegalPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Dashboard /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/os/scrittura" element={<ProtectedRoute><FeatureErrorBoundary featureName="Casa Scrittura"><CasaScritturaPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/os/pubblicazione" element={<ProtectedRoute><FeatureErrorBoundary featureName="Casa Pubblicazione"><CasaPubblicazionePage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/os/mercato" element={<ProtectedRoute><FeatureErrorBoundary featureName="Casa Mercato"><CasaMercatoPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/os/studio" element={<ProtectedRoute><FeatureErrorBoundary featureName="Casa Studio"><CasaStudioPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/os/impostazioni" element={<ProtectedRoute><FeatureErrorBoundary featureName="Casa Impostazioni"><CasaImpostazioniPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/writer" element={<ProtectedRoute><FeatureErrorBoundary featureName="Writer"><Navigate to="/app" replace /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/bestseller" element={<ProtectedRoute requiredFeature="trending_niches_limited"><FeatureErrorBoundary featureName="Bestseller Radar"><BestsellerRadarPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/publishing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Publishing OS"><PublishingOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/identity" element={<ProtectedRoute><FeatureErrorBoundary featureName="Identity OS"><IdentityOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/study" element={<ProtectedRoute><FeatureErrorBoundary featureName="Study OS"><StudyOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/study-session" element={<ProtectedRoute><FeatureErrorBoundary featureName="Study OS"><StudySessionPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/mobile-market" element={<ProtectedRoute><FeatureErrorBoundary featureName="Market OS"><MobileMarketHubPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/app" element={<ProtectedRoute><FeatureErrorBoundary featureName="Writer Studio"><Index /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/usage" element={<ProtectedRoute><FeatureErrorBoundary featureName="Usage"><UsagePage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/kdp-launch" element={<ProtectedRoute requiredFeature="kdp_market_base"><FeatureErrorBoundary featureName="KDP Launch"><KdpLaunchPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/cover" element={<ProtectedRoute requiredFeature="cover_studio_template"><FeatureErrorBoundary featureName="Cover Studio"><CoverStudioPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/export-studio" element={<ProtectedRoute requiredFeature="export_epub"><FeatureErrorBoundary featureName="Export Studio"><ExportStudioPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/notepad" element={<ProtectedRoute><FeatureErrorBoundary featureName="Block Notes"><NotepadPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/character-studio" element={<ProtectedRoute requiredFeature="book_engine_full"><Navigate to="/dashboard" replace state={{ openForge: true, source: "character-studio-redirect" }} /></ProtectedRoute>} />
                <Route path="/title-intelligence" element={<ProtectedRoute requiredFeature="title_intelligence_base"><FeatureErrorBoundary featureName="Title Intelligence"><TitleIntelligencePage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/manuscript-lab" element={<ProtectedRoute requiredFeature="chapter_improvement"><FeatureErrorBoundary featureName="Manuscript Lab"><ManuscriptLabPage /></FeatureErrorBoundary></ProtectedRoute>} />
                <Route path="/author-identity" element={<ProtectedRoute requiredFeature="book_engine_full"><FeatureErrorBoundary featureName="Author Identity"><IdentityOsPage /></FeatureErrorBoundary></ProtectedRoute>} />
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
