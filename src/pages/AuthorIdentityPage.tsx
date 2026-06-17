import { useLocation } from "react-router-dom";
import type { AuthorIdentity } from "@/types/book";
import { AuthorIdentityDialog } from "@/components/AuthorIdentityDialog";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { useDashboardReturn } from "@/hooks/useDashboardReturn";
import type { DashboardRouteState } from "@/lib/one-flow/dashboard-return-context";

export default function AuthorIdentityPage() {
  const location = useLocation();
  const { goBackToDashboard } = useDashboardReturn();
  const state = location.state as (DashboardRouteState & { prefill?: AuthorIdentity | null }) | null;
  const prefillDraft = state?.prefill ?? null;

  return (
    <FeatureErrorBoundary featureName="Author Identity">
      <AuthorIdentityDialog
        open
        prefillDraft={prefillDraft}
        onClose={goBackToDashboard}
      />
    </FeatureErrorBoundary>
  );
}
