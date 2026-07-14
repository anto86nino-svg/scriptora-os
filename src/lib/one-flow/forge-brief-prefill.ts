import type { AuthorIdentity, Language } from "@/types/book";

export const FORGE_BRIEF_STORAGE_KEY = "scriptora-forge-brief";

export type ForgeBriefPayload = {
  idea?: string;
  genre?: string;
  subcategory?: string;
  targetAudience?: string;
  tone?: string;
  language?: string;
  titleLanguage?: string;
  numberOfChapters?: number;
  subchaptersEnabled?: boolean;
  subchaptersPerChapter?: number;
  bookLength?: "short" | "medium" | "long";
  customTotalWords?: number;
  totalWordTarget?: number;
  level?: string;
  readerPromise?: string;
  prefilledTitle?: string;
  prefilledSubtitle?: string;
  authorName?: string;
  authorIdentityId?: string;
  authorIdentity?: AuthorIdentity;
};

export function saveForgeBrief(payload: ForgeBriefPayload): void {
  sessionStorage.setItem(FORGE_BRIEF_STORAGE_KEY, JSON.stringify(payload));
}

export function consumeForgeBrief(): ForgeBriefPayload | null {
  try {
    const raw = sessionStorage.getItem(FORGE_BRIEF_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FORGE_BRIEF_STORAGE_KEY);
    return JSON.parse(raw) as ForgeBriefPayload;
  } catch {
    return null;
  }
}

export function forgeBriefToTitlePayload(
  brief: ForgeBriefPayload,
  card: { title: string; subtitle: string },
  authorIdentity: AuthorIdentity,
  language: string,
  tone: string,
  bookGenre: string,
  targetAudience: string,
  bookPromise: string,
): ForgeBriefPayload {
  return {
    idea: brief.idea || bookPromise || bookGenre || card.title,
    genre: brief.genre || bookGenre || "Self-help",
    subcategory: brief.subcategory || bookGenre || "",
    targetAudience: brief.targetAudience || targetAudience || "Lettori interessati a questo argomento",
    tone: brief.tone || tone,
    language: (brief.language as Language) || (language as Language),
    numberOfChapters: brief.numberOfChapters ?? 8,
    level: brief.level ?? "intermediate",
    readerPromise: brief.readerPromise || bookPromise || card.subtitle,
    prefilledTitle: card.title,
    prefilledSubtitle: card.subtitle,
    authorName: brief.authorName || authorIdentity.penName,
    authorIdentityId: brief.authorIdentityId || authorIdentity.id,
    authorIdentity: brief.authorIdentity || authorIdentity,
  };
}
