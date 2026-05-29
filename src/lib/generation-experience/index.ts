import type { ChunkPhase } from "@/lib/generation";

export const GENERATION_EXPERIENCE_V2 = "scriptora-generation-experience-v2";

export const EDITORIAL_CHECKLIST = [
  "Voce autore applicata",
  "Continuità narrativa verificata",
  "Obiettivo del capitolo definito",
  "Memoria del libro sincronizzata",
] as const;

export const EDITORIAL_PHASE_LABELS: Record<ChunkPhase, string> = {
  OPENING: "Apertura del capitolo",
  DEVELOPMENT: "Sviluppo narrativo",
  EXPANSION: "Profondità e atmosfera",
  TRANSITION: "Transizione narrativa",
  CLOSURE: "Chiusura del capitolo",
};

const PLACEHOLDER_PATTERN = /^(to be generated|da generare|pending|tbd)$/i;

/** Hide blueprint placeholders — never show raw "To be generated" in the UI */
export function sanitizePlaceholderText(text: string | undefined | null): string {
  const trimmed = String(text || "").trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) return "";
  return trimmed;
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
  if (hasContent) return "Il capitolo sta prendendo forma.";
  const objective = sanitizePlaceholderText(outlineSummary);
  if (objective) return `Obiettivo del capitolo: ${compactPreviewLine(objective, 160)}`;
  return "Scriptora sta preparando il capitolo — le prime righe appariranno a breve.";
}
