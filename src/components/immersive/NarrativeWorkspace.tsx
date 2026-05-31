import type { NarrativeWorkspaceSnapshot } from "@/lib/immersive/workspace-state";
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
};

type NarrativeWorkspaceProps = {
  snapshot: NarrativeWorkspaceSnapshot;
  actions: NarrativeWorkspaceActions;
  className?: string;
};

export function NarrativeWorkspace({ snapshot, actions, className = "" }: NarrativeWorkspaceProps) {
  if (snapshot.state === "empty") {
    return (
      <CreativeConsoleHero
        className={className}
        actions={actions}
        onOpenToolbox={actions.onOpenToolbox}
      />
    );
  }

  return <ScriptoraWorkspaceOS snapshot={snapshot} actions={actions} className={className} />;
}
