import { Suspense, lazy } from "react";
import type { BookProject, SectionId } from "@/types/book";
import { MobileFullscreenShell } from "./MobileFullscreenShell";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";

const AICoachPanel = lazy(() =>
  import("@/components/AICoachPanel").then((m) => ({ default: m.AICoachPanel })),
);

export type MobileAICoachScreenProps = {
  project: BookProject;
  activeSection: SectionId | null;
  onClose: () => void;
  onApplyRewrite?: (chapterIndex: number, subIndex: number | null, text: string) => void;
};

export function MobileAICoachScreen({
  project,
  activeSection,
  onClose,
  onApplyRewrite,
}: MobileAICoachScreenProps) {
  return (
    <MobileFullscreenShell title="AI Coach" subtitle="Consigli narrativi essenziali" onClose={onClose}>
      <Suspense
        fallback={
          <ScriptoraAliveTransition
            compact
            tone="writer"
            title="Sto aprendo AI Coach…"
            steps={["Carico il capitolo…", "Preparo i consigli…"]}
            minHeight="240px"
          />
        }
      >
        <AICoachPanel
          variant="mobile"
          project={project}
          activeSection={activeSection}
          onClose={onClose}
          onApplyRewrite={onApplyRewrite}
        />
      </Suspense>
    </MobileFullscreenShell>
  );
}
