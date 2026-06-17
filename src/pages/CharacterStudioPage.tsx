import { useNavigate } from "react-router-dom";
import { CharacterStudioDialog } from "@/components/CharacterStudioDialog";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";

export default function CharacterStudioPage() {
  const navigate = useNavigate();

  return (
    <FeatureErrorBoundary featureName="Character Studio">
      <CharacterStudioDialog
        open
        onClose={() => navigate("/dashboard")}
        onAuthorIdentity={() => navigate("/author-identity")}
      />
    </FeatureErrorBoundary>
  );
}
