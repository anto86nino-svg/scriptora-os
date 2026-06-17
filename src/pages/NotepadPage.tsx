import { NotepadDialog } from "@/components/NotepadDialog";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { useDashboardReturn } from "@/hooks/useDashboardReturn";

export default function NotepadPage() {
  const { goBackToDashboard } = useDashboardReturn();

  return (
    <FeatureErrorBoundary featureName="Block Notes">
      <NotepadDialog open onClose={goBackToDashboard} />
    </FeatureErrorBoundary>
  );
}
