import { CharacterStudioDialog } from "@/components/CharacterStudioDialog";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { useDashboardReturn } from "@/hooks/useDashboardReturn";
import { getToolRoute } from "@/lib/one-flow/tool-registry";

export default function CharacterStudioPage() {
  const { goBackToDashboard, navigateWithReturn } = useDashboardReturn();

  return (
    <FeatureErrorBoundary featureName="Character Studio">
      <CharacterStudioDialog
        open
        onClose={goBackToDashboard}
        onAuthorIdentity={() => navigateWithReturn(getToolRoute("identity"))}
      />
    </FeatureErrorBoundary>
  );
}
