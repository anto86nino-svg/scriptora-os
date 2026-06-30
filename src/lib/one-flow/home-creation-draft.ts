import { STUDIO_DRAFT_STORAGE_KEY } from "@/lib/book-config-studio/types";

export type HomeCreationDraftSeed = {
  idea?: string;
  genreHint?: string;
};

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

export function readHomeIdeaSeedFromStorage(storage?: Storage): string {
  try {
    const target = resolveStorage(storage);
    if (!target) return "";
    const raw = target.getItem(STUDIO_DRAFT_STORAGE_KEY);
    if (!raw) return "";
    const draft = JSON.parse(raw) as { idea?: string; title?: string };
    return String(draft.idea || draft.title || "").trim();
  } catch {
    return "";
  }
}

export function saveHomeCreationDraft(
  seed: HomeCreationDraftSeed,
  storage?: Storage,
): void {
  try {
    const target = resolveStorage(storage);
    if (!target) return;
    const idea = String(seed.idea || "").trim();
    const genreHint = String(seed.genreHint || "").trim();
    if (!idea && !genreHint) {
      target.removeItem(STUDIO_DRAFT_STORAGE_KEY);
      return;
    }
    target.setItem(
      STUDIO_DRAFT_STORAGE_KEY,
      JSON.stringify({
        step: 0,
        idea,
        homeGenreHint: genreHint || undefined,
      }),
    );
  } catch {
    // Storage can be unavailable in private/mobile webviews.
  }
}
