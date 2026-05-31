import type { NarrativeWorkspaceSnapshot } from "@/lib/immersive/workspace-state";
import type { WorkspaceToolId } from "@/lib/immersive/workspace-tool-mode";
import { CreativeConsoleHero } from "./CreativeConsoleHero";
import { ScriptoraWorkspaceOS } from "./ScriptoraWorkspaceOS";

export type NarrativeWorkspaceActions = {
  onContinueWriting: () => void;
  onCreateBook: () => void;
  onImportManuscript: () => void;
  onAnalyzeManuscript: () => void;
  onDiagnoseChapter: () => void;
  onCharacters: () => void;
  onVoice: () => void;
  onRewrite: () => void;
  onCover: () => void;
  onExport: () => void;
  onLibrary: () => void;
  onOpenToolbox: () => void;
  onAuthorIdentity?: () => void;
  onKdpPublish?: () => void;
  onGenerateChapter?: () => void;
  onMarketIntel?: () => void;
};

type NarrativeWorkspaceProps = {
  snapshot: NarrativeWorkspaceSnapshot;
  actions: NarrativeWorkspaceActions;
  activeTool?: WorkspaceToolId | null;
  className?: string;
};

export function NarrativeWorkspace({
  snapshot,
  actions,
  activeTool = null,
  className = "",
}: NarrativeWorkspaceProps) {
  if (snapshot.state === "empty") {
    return (
      <CreativeConsoleHero
        className={className}
        actions={actions}
        onOpenToolbox={actions.onOpenToolbox}
      />
    );
  }

  return (
    <ScriptoraWorkspaceOS
      snapshot={snapshot}
      actions={actions}
      activeTool={activeTool}
      className={className}
    />
  );
}
