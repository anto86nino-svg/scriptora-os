import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ManuscriptAnalyzerDialog } from "@/components/ManuscriptAnalyzerDialog";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { useDashboardReturn } from "@/hooks/useDashboardReturn";
import { usePlan } from "@/lib/plan";
import { loadProjects } from "@/lib/storage";

export default function ManuscriptLabPage() {
  const navigate = useNavigate();
  const { goBackToDashboard } = useDashboardReturn();
  const { plan } = usePlan();
  const freeBookUsed = useMemo(() => {
    try {
      const projects = Array.isArray(loadProjects()) ? loadProjects() : [];
      return plan === "free" && projects.length > 0;
    } catch {
      return false;
    }
  }, [plan]);

  return (
    <FeatureErrorBoundary featureName="Manuscript Lab">
      <ManuscriptAnalyzerDialog
        open
        onClose={goBackToDashboard}
        canCreateProject={!freeBookUsed}
        onLimitReached={() => navigate("/pricing")}
      />
    </FeatureErrorBoundary>
  );
}
