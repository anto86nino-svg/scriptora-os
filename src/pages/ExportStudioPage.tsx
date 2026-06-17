import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FolderOpen, Sparkles } from "lucide-react";
import { HomeExportDialog } from "@/components/HomeExportDialog";
import { OsShell } from "@/components/os/OsShell";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { getLastProjectId, loadProjects } from "@/lib/storage";
import { countExportableProjects } from "@/lib/one-flow/dashboard-home-actions";

export default function ExportStudioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { projectId?: string } | null;

  const projects = useMemo(() => {
    try {
      const loaded = loadProjects();
      return Array.isArray(loaded) ? loaded : [];
    } catch {
      return [];
    }
  }, []);

  const canExport = countExportableProjects(projects) > 0;
  const initialProjectId = routeState?.projectId || getLastProjectId() || undefined;

  if (!canExport) {
    return (
      <OsShell title="Export Studio" subtitle="EPUB, DOCX, PDF" badge="📦 Export" backTo="/dashboard">
        <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Per esportare devi prima aprire o completare un libro.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate("/dashboard", { state: { openForge: true } })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Apri Book Forge
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard", { state: { openProjects: true } })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold text-foreground/80"
            >
              <FolderOpen className="h-4 w-4" />
              I miei libri
            </button>
          </div>
        </div>
      </OsShell>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Export Studio">
      <HomeExportDialog
        open
        projects={projects}
        initialProjectId={initialProjectId}
        onClose={() => navigate("/dashboard")}
      />
    </FeatureErrorBoundary>
  );
}
