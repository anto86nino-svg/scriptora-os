import { lazy, Suspense } from "react";
import type { DemoShotId } from "./landing-v3-data";
import { LandingDashboardPreview } from "./LandingDashboardPreview";
import { LandingLiveStudio } from "./LandingLiveStudio";

const CoverGenerator = lazy(() =>
  import("@/components/CoverGenerator").then((module) => ({ default: module.CoverGenerator })),
);
const ManuscriptAnalyzerDialog = lazy(() =>
  import("@/components/ManuscriptAnalyzerDialog").then((module) => ({ default: module.ManuscriptAnalyzerDialog })),
);
const BestsellerRadarWorkspace = lazy(() =>
  import("@/pages/BestsellerRadarPage").then((module) => ({ default: module.BestsellerRadarWorkspace })),
);

const LANDING_COVER_DEMO = {
  title: "Ombre sul Corso",
  subtitle: "Un romanzo di resilienza",
  authorName: "Elena Marchetti",
  description:
    "Quando il passato torna a bussare sulle sponde del fiume, una donna deve scegliere tra proteggere la famiglia e rivelare la verità che ha seppellito per vent'anni.",
  authorBio: "Autrice di narrativa contemporanea. Finalista Premio Strega Giovani.",
  projectGenre: "romance",
};

function PreviewFallback() {
  return (
    <div className="flex min-h-[420px] items-center justify-center p-8 text-sm text-white/55">
      Caricamento workspace…
    </div>
  );
}

export function LandingWorkspacePreview({ id }: { id: DemoShotId }) {
  return (
    <Suspense fallback={<PreviewFallback />}>
      {id === "dashboard" && <LandingDashboardPreview />}
      {id === "editor" && <LandingLiveStudio variant="section" />}
      {id === "diagnostics" && (
        <ManuscriptAnalyzerDialog open embedded onClose={() => undefined} canCreateProject={false} />
      )}
      {id === "cover" && (
        <CoverGenerator
          embedded
          {...LANDING_COVER_DEMO}
          showPrimaryAction={false}
          onGenerate={() => undefined}
          onClose={() => undefined}
        />
      )}
      {id === "market" && <BestsellerRadarWorkspace embedded />}
    </Suspense>
  );
}
