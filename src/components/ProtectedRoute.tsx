import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isDevMode } from "@/lib/dev-mode";
import { hasValidConsent } from "@/lib/legal-consent";
import { usePlan } from "@/lib/plan";
import { canUseFeature, type FeatureKey } from "@/lib/subscription";
import { Loader2 } from "lucide-react";

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

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user && !isDevMode()) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requiredFeature && planLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requiredFeature && !canUseFeature(plan, requiredFeature)) {
    return <Navigate to="/pricing" replace />;
  }

  if (isDevMode()) return <>{children}</>;

  return <>{children}</>;
}
