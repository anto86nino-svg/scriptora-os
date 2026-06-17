import type { GuidedInterviewState } from "./types";

const FORGE_DNA_KEY = "scriptora-forge-dna-lock";

export function saveForgeDnaLock(state: GuidedInterviewState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      FORGE_DNA_KEY,
      JSON.stringify({
        extracted: state.extracted,
        selectedGenre: state.selectedGenre,
        selectedBookType: state.selectedBookType,
        selectedTone: state.selectedTone,
        confidence: state.confidence,
        dnaLock: state.dnaLock,
        forgePhase: state.forgePhase,
        characters: state.characters,
        narrativeDecisions: state.narrativeDecisions,
        storyFuture: state.storyFuture,
        canon: state.canon,
        canonLocked: state.canonLocked,
        forgeConvergence: state.forgeConvergence,
        bookPromises: state.bookPromises,
        titleIntelligence: state.titleIntelligence,
        copyright: state.copyright,
        savedAt: Date.now(),
      }),
    );
  } catch {
    /* ignore quota */
  }
}

export function loadForgeDnaLock(): Partial<GuidedInterviewState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(FORGE_DNA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<GuidedInterviewState>;
  } catch {
    return null;
  }
}

export function clearForgeDnaLock(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(FORGE_DNA_KEY);
  } catch {
    /* ignore */
  }
}
