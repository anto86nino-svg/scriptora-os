import type { ChunkPhase } from "@/lib/generation";
import { t, tt } from "@/lib/i18n";
import {
  generateChapterEditorialPreview,
  type ChapterEditorialPreviewInput,
} from "@/lib/immersive/chapter-editorial-preview";

export const GENERATION_EXPERIENCE_V2 = "scriptora-generation-experience-v2";

const EDITORIAL_CHECKLIST_KEYS = [
  "editorial_check_1",
  "editorial_check_2",
  "editorial_check_3",
  "editorial_check_4",
] as const;

const EDITORIAL_PHASE_KEYS: Record<ChunkPhase, string> = {
  OPENING: "editorial_phase_opening",
  DEVELOPMENT: "editorial_phase_development",
  EXPANSION: "editorial_phase_expansion",
  TRANSITION: "editorial_phase_transition",
  CLOSURE: "editorial_phase_closure",
};

/** @deprecated Use getEditorialChecklist() for localized labels */
export const EDITORIAL_CHECKLIST = EDITORIAL_CHECKLIST_KEYS.map((key) => t(key));

/** @deprecated Use getEditorialPhaseLabel() for localized labels */
export const EDITORIAL_PHASE_LABELS: Record<ChunkPhase, string> = {
  OPENING: t("editorial_phase_opening"),
  DEVELOPMENT: t("editorial_phase_development"),
  EXPANSION: t("editorial_phase_expansion"),
  TRANSITION: t("editorial_phase_transition"),
  CLOSURE: t("editorial_phase_closure"),
};

export function getEditorialChecklist(): string[] {
  return EDITORIAL_CHECKLIST_KEYS.map((key) => t(key));
}

export function getEditorialPhaseLabel(phase: ChunkPhase): string {
  return t(EDITORIAL_PHASE_KEYS[phase]);
}

const PLACEHOLDER_PATTERN = /^(to be generated|da generare|pending|tbd)$/i;

/** Hide blueprint placeholders — never show raw "To be generated" in the UI */
export function sanitizePlaceholderText(text: string | undefined | null): string {
  const trimmed = String(text || "").trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) return "";
  return trimmed;
}

/** Blueprint summary for UI — never raw placeholders; editorial note when generated */
export function resolveOutlineSummaryForDisplay(
  outlineSummary: string | undefined | null,
  chapterContent?: string | null,
  meta?: Omit<ChapterEditorialPreviewInput, "summary" | "content">,
): string {
  return generateChapterEditorialPreview({
    summary: outlineSummary,
    content: chapterContent,
    title: meta?.title,
    chapterIndex: meta?.chapterIndex,
    totalChapters: meta?.totalChapters,
  });
}

export function compactPreviewLine(value: string, max = 220): string {
  const clean = value
    .replace(/^#+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "").trim()}…`;
}

export function splitManuscriptParagraphs(content: string): string[] {
  return String(content || "")
    .replace(/\r/g, "")
    .replace(/^#+\s*.+$/gm, "")
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function formatWordProgress(current: number, target: number): string {
  return `${current.toLocaleString()} / ${target.toLocaleString()} parole`;
}

export function editorialStatusMessage(hasContent: boolean, outlineSummary: string): string {
  if (hasContent) return t("editorial_status_forming");
  const objective = sanitizePlaceholderText(outlineSummary);
  if (objective) return tt("editorial_status_objective", { objective: compactPreviewLine(objective, 160) });
  return t("editorial_status_preparing");
}
