import { useLocation, useNavigate } from "react-router-dom";
import type { AuthorIdentity } from "@/types/book";
import { AuthorIdentityDialog } from "@/components/AuthorIdentityDialog";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";

export default function AuthorIdentityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillDraft = (location.state as { prefill?: AuthorIdentity | null } | null)?.prefill ?? null;

  return (
    <FeatureErrorBoundary featureName="Author Identity">
      <AuthorIdentityDialog
        open
        prefillDraft={prefillDraft}
        onClose={() => navigate("/dashboard")}
      />
    </FeatureErrorBoundary>
  );
}
