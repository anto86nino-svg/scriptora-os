import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TitleIntelligenceDialog } from "@/components/TitleIntelligenceDialog";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { getLastProjectId, loadProjects } from "@/lib/storage";

export default function TitleIntelligencePage() {
  const navigate = useNavigate();
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
        onClose={() => navigate("/dashboard")}
        onLaunchForge={() => navigate("/dashboard", { state: { openForge: true } })}
      />
    </FeatureErrorBoundary>
  );
}
