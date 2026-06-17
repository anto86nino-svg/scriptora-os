import { useMemo } from "react";
import { TitleIntelligenceDialog } from "@/components/TitleIntelligenceDialog";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { useDashboardReturn } from "@/hooks/useDashboardReturn";
import { getLastProjectId, loadProjects } from "@/lib/storage";

export default function TitleIntelligencePage() {
  const { goBackToDashboard, navigateWithReturn } = useDashboardReturn();
  const activeProject = useMemo(() => {
    try {
      const projects = Array.isArray(loadProjects()) ? loadProjects() : [];
      const lastId = getLastProjectId();
      return (lastId ? projects.find((p) => p.id === lastId) : null) || projects[0] || null;
    } catch {
      return null;
    }
  }, []);

  return (
    <FeatureErrorBoundary featureName="Title Intelligence">
      <TitleIntelligenceDialog
        open
        initialTitle={activeProject?.config?.title}
        initialGenre={activeProject?.config?.genre || activeProject?.config?.category}
        onClose={goBackToDashboard}
        onLaunchForge={() => navigateWithReturn("/dashboard", { openForge: true })}
      />
    </FeatureErrorBoundary>
  );
}
