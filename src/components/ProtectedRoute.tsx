import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isDevMode } from "@/lib/dev-mode";
import { hasValidConsent } from "@/lib/legal-consent";
import {
  completeEntryLoading,
  requestAppEntryLoading,
  shouldPlayEntryLoading,
} from "@/lib/app-entry-loading";
import { ScriptoraAppLoadingExperience } from "@/components/boot/ScriptoraAppLoadingExperience";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";
import { usePlan } from "@/lib/plan";
import { canUseFeature, type FeatureKey } from "@/lib/subscription";

/** Protegge le rotte: consenso legale obbligatorio, poi utenti non autenticati → /auth. */
export function ProtectedRoute({
  children,
  requiredFeature,
}: {
  children: ReactNode;
  requiredFeature?: FeatureKey;
}) {
  const { user, loading } = useAuth();
  const { plan, loading: planLoading } = usePlan();
  const location = useLocation();
  const [entryActive, setEntryActive] = useState(false);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const consentValid = hasValidConsent();

  useEffect(() => {
    if (!consentValid) return;
    if (shouldPlayEntryLoading()) {
      setEntryActive(true);
      return;
    }
    try {
      if (!sessionStorage.getItem("scriptora:entry-loading-done")) {
        requestAppEntryLoading();
        setEntryActive(true);
      }
    } catch {
      /* private mode */
    }
  }, [consentValid]);

  if (!consentValid) {
    return (
      <Navigate
        to="/"
        state={{ legalRequired: true, legalReturnTo: returnTo }}
        replace
      />
    );
  }

  if (entryActive) {
    return (
      <ScriptoraAppLoadingExperience
        authReady={!loading && (!requiredFeature || !planLoading)}
        onComplete={() => {
          completeEntryLoading();
          setEntryActive(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <ScriptoraAliveTransition
        route={location.pathname}
        tone="auth"
        title="Sto verificando il tuo accesso…"
        description="Controllo sessione e preparo il tuo studio."
      />
    );
  }

  const devBypassAuth = import.meta.env.DEV && isDevMode();
  if (!user && !devBypassAuth) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requiredFeature && planLoading) {
    return (
      <ScriptoraAliveTransition
        route={location.pathname}
        tone="dashboard"
        title="Sto preparando i permessi del piano…"
        description="Sto sincronizzando abbonamento e strumenti disponibili."
      />
    );
  }

  if (requiredFeature && !canUseFeature(plan, requiredFeature)) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
}
