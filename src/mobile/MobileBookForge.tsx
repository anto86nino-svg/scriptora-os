import { Suspense, useCallback } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { AuthorIdentity, BookBlueprint, BookConfig, Language } from "@/types/book";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/storageService";
import {
  bookForgeStartStepToStudioStep,
  type BookForgeHandoff,
} from "@/lib/book-forge/book-forge-handoff";

const BookCreationOsWizard = lazyWithRetry(() =>
  import("@/components/one-flow/BookCreationOsWizard").then((m) => ({
    default: m.BookCreationOsWizard,
  })),
);

export type MobileBookForgeProps = {
  onClose: () => void;
  authorIdentity: AuthorIdentity;
  onStudioComplete: (payload: StudioLaunchPayload) => void;
  onGenerateBlueprint: (config: BookConfig) => Promise<BookBlueprint>;
  bookForgeHandoff?: BookForgeHandoff | null;
};

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
          One Book Flow
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
  bookForgeHandoff,
}: MobileBookForgeProps) {
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

  return (
    <Suspense
      fallback={
        <ScriptoraAliveTransition
          compact
          overlay
          tone="forge"
        title="Apro One Book Flow…"
        steps={["Configurazione libro", "Concept e blueprint"]}
        />
      }
    >
      <BookCreationOsWizard
        open
        embeddedInMobileForge
        mobileForgeHeader={<ForgeTopHeader onClose={onClose} />}
        forgeEntry="full"
        initialStep={bookForgeHandoff ? bookForgeStartStepToStudioStep(bookForgeHandoff.recommendedStartStep) : 0}
        bookForgeHandoff={bookForgeHandoff}
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
