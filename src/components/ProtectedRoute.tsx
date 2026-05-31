import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isOwnerEmail } from "@/lib/dev-mode";
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
  const { plan, loading: planLoading } = usePlan();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const consentValid = hasValidConsent();

  if (!consentValid) {
    return (
      <Navigate
        to="/"
        state={{ legalRequired: true, legalReturnTo: returnTo }}
        replace
      />
    );
  }

  if (!authLoading && !user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!authLoading && ownerOnly && !isOwnerEmail(user?.email)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredFeature && !planLoading && !isOwnerEmail(user?.email) && !canUseFeature(plan, requiredFeature)) {
    return (
      <Navigate
        to="/pricing"
        state={{ requirementFeature: requiredFeature }}
        replace
      />
    );
  }

  return (
    <ScriptoraBootGate authReady={!authLoading} planReady={!requiredFeature || !planLoading}>
      {children}
    </ScriptoraBootGate>
  );
}
