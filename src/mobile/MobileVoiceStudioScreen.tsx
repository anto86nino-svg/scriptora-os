import { Suspense, lazy } from "react";
import type { BookProject } from "@/types/book";
import { MobileFullscreenShell } from "./MobileFullscreenShell";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";

const VoiceStudioDialog = lazy(() =>
  import("@/components/VoiceStudioDialog").then((m) => ({ default: m.VoiceStudioDialog })),
);

export type MobileVoiceStudioScreenProps = {
  open: boolean;
  onClose: () => void;
  projects: BookProject[];
  initialProjectId?: string;
  initialChapterIndex?: number;
  autoPlayOnOpen?: boolean;
  onOpenChapterInEditor?: (projectId: string, chapterIndex: number) => void;
};

export function MobileVoiceStudioScreen({
  open,
  onClose,
  projects,
  initialProjectId,
  initialChapterIndex,
  autoPlayOnOpen,
  onOpenChapterInEditor,
}: MobileVoiceStudioScreenProps) {
  if (!open) return null;

  const active = projects.find((p) => p.id === initialProjectId) || projects[0];

  return (
    <MobileFullscreenShell
      title="Voice Studio"
      subtitle={active?.config.title || "Ascolta il capitolo"}
      onClose={onClose}
    >
      <Suspense
        fallback={
          <ScriptoraAliveTransition
            compact
            tone="writer"
            title="Preparo la voce…"
            steps={["Carico capitolo…", "Sintonizzo narratore…"]}
            minHeight="240px"
          />
        }
      >
        <VoiceStudioDialog
          embedded
          open
          onClose={onClose}
          projects={projects}
          initialProjectId={initialProjectId}
          initialChapterIndex={initialChapterIndex}
          autoPlayOnOpen={autoPlayOnOpen}
          onOpenChapterInEditor={
            onOpenChapterInEditor
              ? (projectId, chapterIdx) => onOpenChapterInEditor(projectId, chapterIdx)
              : undefined
          }
        />
      </Suspense>
    </MobileFullscreenShell>
  );
}
