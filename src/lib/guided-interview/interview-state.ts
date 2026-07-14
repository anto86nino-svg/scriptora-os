import type { GuidedInterviewState } from "./types";

const FORGE_DNA_KEY = "scriptora-forge-dna-lock";
const FORGE_INTERVIEW_DRAFT_KEY = "scriptora-forge-interview-draft-v1";
const MAX_DRAFT_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export type ForgeInterviewDraftStatus =
  | "interview_in_progress"
  | "blueprint_preparation";

export type ForgeInterviewDraft = {
  state: GuidedInterviewState;
  status: ForgeInterviewDraftStatus;
  savedAt: number;
};

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

export function saveForgeInterviewDraft(state: GuidedInterviewState): void {
  if (typeof window === "undefined") return;
  if (!state.messages?.some((message) => message.role === "user")) return;
  const status: ForgeInterviewDraftStatus =
    state.forgePhase === "review" ||
    state.bookFoundationLocked ||
    state.canonLocked
      ? "blueprint_preparation"
      : "interview_in_progress";
  try {
    localStorage.setItem(
      FORGE_INTERVIEW_DRAFT_KEY,
      JSON.stringify({
        state: {
          ...state,
          completed: false,
        },
        status,
        savedAt: Date.now(),
      } satisfies ForgeInterviewDraft),
    );
  } catch {
    /* ignore quota */
  }
}

export function loadForgeInterviewDraft(): ForgeInterviewDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FORGE_INTERVIEW_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ForgeInterviewDraft>;
    if (!parsed.state?.messages?.some((message) => message.role === "user")) return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_DRAFT_AGE_MS) {
      localStorage.removeItem(FORGE_INTERVIEW_DRAFT_KEY);
      return null;
    }
    return {
      state: parsed.state,
      status: parsed.status === "blueprint_preparation" ? "blueprint_preparation" : "interview_in_progress",
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function premiseTokens(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 4),
  );
}

/** Prevents a new book from inheriting a months-old interview just because the genre matches. */
export function isForgeDraftCompatibleWithIdea(
  draft: ForgeInterviewDraft,
  currentIdea?: string,
): boolean {
  const current = String(currentIdea || "").trim();
  if (!current) return true;
  const extracted = draft.state.extracted ?? {};
  const draftIdea = String(
    extracted.rawIdea
      || extracted.editorialSynopsis
      || extracted.readerTransformation
      || draft.state.messages.find((message) => message.role === "user")?.content
      || "",
  ).trim();
  if (!draftIdea) return false;

  const normalizedCurrent = current.toLowerCase();
  const normalizedDraft = draftIdea.toLowerCase();
  if (normalizedCurrent.includes(normalizedDraft) || normalizedDraft.includes(normalizedCurrent)) {
    return true;
  }

  const currentTokens = premiseTokens(current);
  const draftTokens = premiseTokens(draftIdea);
  if (!currentTokens.size || !draftTokens.size) return false;
  let overlap = 0;
  currentTokens.forEach((token) => {
    if (draftTokens.has(token)) overlap += 1;
  });
  return overlap / Math.min(currentTokens.size, draftTokens.size) >= 0.5;
}

export function clearForgeInterviewDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FORGE_INTERVIEW_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
