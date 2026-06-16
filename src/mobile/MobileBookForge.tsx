import { lazy, Suspense, useCallback, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { AuthorIdentity, BookBlueprint, BookConfig, Language } from "@/types/book";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { GuidedInterviewPanel } from "@/components/guided-interview/GuidedInterviewPanel";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { saveForgeDnaLock } from "@/lib/guided-interview/interview-state";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/storageService";

const BookCreationOsWizard = lazy(() =>
  import("@/components/one-flow/BookCreationOsWizard").then((m) => ({
    default: m.BookCreationOsWizard,
  })),
);

export type MobileBookForgeProps = {
  onClose: () => void;
  authorIdentity: AuthorIdentity;
  onStudioComplete: (payload: StudioLaunchPayload) => void;
  onGenerateBlueprint: (config: BookConfig) => Promise<BookBlueprint>;
};

type Phase = "interview" | "blueprint";

function ForgeTopHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/12 px-3 text-sm font-medium text-white/80"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/80">
          <Sparkles className="h-3.5 w-3.5" />
          Book Forge
        </p>
        <p className="truncate text-xs text-white/55">
          Parla il libro a Scriptora. Non generiamo finché il DNA non è chiaro.
        </p>
      </div>
    </header>
  );
}

export function MobileBookForge({
  onClose,
  authorIdentity,
  onStudioComplete,
  onGenerateBlueprint,
}: MobileBookForgeProps) {
  const [phase, setPhase] = useState<Phase>("interview");
  const [interviewState, setInterviewState] = useState<GuidedInterviewState | null>(null);

  const handleDetectIntent = useCallback(async (idea: string, language: Language) => {
    try {
      const { data, error } = await supabase.functions.invoke("detect-book-intent", {
        body: { idea, language, userId: getCurrentUserId() },
      });
      if (error || data?.fallback || data?.error) return null;
      return data as {
        genre: string;
        subcategory: string;
        tone: string;
        numberOfChapters: number;
        suggestedTitles: string[];
        suggestedSubtitles: string[];
        bestTitleIndex: number;
      };
    } catch {
      return null;
    }
  }, []);

  if (phase === "interview") {
    return (
      <GuidedInterviewPanel
        variant="mobile"
        chatFirst
        unifiedScroll
        forgeHeader={<ForgeTopHeader onClose={onClose} />}
        language={authorIdentity.language || "Italian"}
        onComplete={(data) => {
          setInterviewState(data as GuidedInterviewState);
        }}
        onConfirmDna={(state) => {
          setInterviewState(state);
          saveForgeDnaLock(state);
          setPhase("blueprint");
        }}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <ScriptoraAliveTransition
          compact
          overlay
          tone="forge"
          title="Preparo il blueprint…"
          steps={["DNA confermato", "Architettura libro"]}
        />
      }
    >
      <BookCreationOsWizard
        open
        embeddedInMobileForge
        mobileForgeHeader={<ForgeTopHeader onClose={onClose} />}
        forgeEntry="post-dna"
        initialStep={6}
        interviewSeed={
          interviewState
            ? {
                extracted: interviewState.extracted as Record<string, string | undefined>,
                selectedGenre: interviewState.selectedGenre || interviewState.inferredProfile?.genre,
                dnaLock: interviewState.dnaLock,
              }
            : undefined
        }
        onClose={onClose}
        authorIdentity={authorIdentity}
        onStudioComplete={onStudioComplete}
        onGenerateBlueprint={onGenerateBlueprint}
        onDetectIntent={handleDetectIntent}
      />
    </Suspense>
  );
}

export default MobileBookForge;
