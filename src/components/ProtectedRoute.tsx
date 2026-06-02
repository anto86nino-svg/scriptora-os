import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isOwnerEmail, useDevMode } from "@/lib/dev-mode";
import { canUseDevTools } from "@/lib/app-environment";
import { hasValidConsent } from "@/lib/legal-consent";
import { usePlan } from "@/lib/plan";
import { canUseFeature, type FeatureKey } from "@/lib/subscription";
import { ScriptoraBootGate } from "@/components/ScriptoraBootGate";

/** Protegge le rotte: consenso legale obbligatorio, poi utenti non autenticati → /auth. */
export function ProtectedRoute({
  children,
  requiredFeature,
  ownerOnly = false,
}: {
  children: ReactNode;
  requiredFeature?: FeatureKey;
  ownerOnly?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const devOn = useDevMode();
  const { plan, loading: planLoading } = usePlan();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const consentValid = hasValidConsent();
  const localDevBypass = canUseDevTools() && devOn;

  if (!consentValid) {
    return (
      <Navigate
        to="/"
        state={{ legalRequired: true, legalReturnTo: returnTo }}
        replace
      />
    );
  }

  if (!authLoading && !user && !localDevBypass) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!authLoading && ownerOnly && !localDevBypass && !isOwnerEmail(user?.email)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredFeature && !planLoading && !localDevBypass && !isOwnerEmail(user?.email) && !canUseFeature(plan, requiredFeature)) {
    return (
      <Navigate
        to="/pricing"
        state={{ requirementFeature: requiredFeature }}
        replace
      />
    );
  }

  return (
    <ScriptoraBootGate authReady={!authLoading || localDevBypass} planReady={!requiredFeature || !planLoading || localDevBypass}>
      {children}
    </ScriptoraBootGate>
  );
}
