import { useNavigate } from "react-router-dom";
import { NotepadDialog } from "@/components/NotepadDialog";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";

export default function NotepadPage() {
  const navigate = useNavigate();

  return (
    <FeatureErrorBoundary featureName="Block Notes">
      <NotepadDialog open onClose={() => navigate("/dashboard")} />
    </FeatureErrorBoundary>
  );
}
