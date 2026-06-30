import type { BookConfig } from "@/types/book";
import { isLiteraryRomanceGenreContext } from "@/lib/concept-dominance";

export function isEditorialNovelModeGenre(config: Partial<BookConfig>): boolean {
  return isLiteraryRomanceGenreContext({
    genre: config.genre,
    subcategory: config.subcategory,
    subgenre: config.subgenre,
    bookTypeId: config.bookTypeId,
  }) || /\b(literary|letterari|romance|romantico|narrativa\s+contemporanea)\b/i.test(
    `${config.genre || ""} ${config.subcategory || ""} ${config.subgenre || ""}`,
  );
}

export function buildEditorialNovelModeBlock(config: Partial<BookConfig>): string {
  if (!isEditorialNovelModeGenre(config)) return "";
  return `EDITORIAL NOVEL MODE — MANDATORY PROSE SHAPE:
- Write long, continuous narrative paragraphs with action, emotion and reflection woven together.
- Separate dialogue blocks clearly; do not scatter one-line thoughts as standalone paragraphs.
- No social-media cadence: avoid chains of isolated sentences used as stylistic effect.
- Each paragraph must be a complete narrative unit with cause, sensation and consequence.
- Prefer literary/romance interiority over epic metaphor, portal imagery or supernatural scaffolding.`;
}

function isDialogueParagraph(value: string): boolean {
  const trimmed = value.trim();
  return /^[«"""\u201C—-]/.test(trimmed) || /^[-\u2014]\s/.test(trimmed);
}

function isIsolatedShortParagraph(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || isDialogueParagraph(trimmed)) return false;
  if (trimmed.length > 220) return false;
  const sentences = trimmed.split(/[.!?…]+/).map((part) => part.trim()).filter(Boolean);
  return sentences.length <= 1;
}

export function applyEditorialNovelModePass(text: string): string {
  const source = String(text || "");
  if (!source.trim()) return source;

  const paragraphs = source.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length < 2) return source;

  const merged: string[] = [];
  for (const paragraph of paragraphs) {
    const previous = merged[merged.length - 1];
    if (previous && isIsolatedShortParagraph(paragraph) && !isDialogueParagraph(previous)) {
      merged[merged.length - 1] = `${previous} ${paragraph}`.replace(/\s+/g, " ").trim();
      continue;
    }
    merged.push(paragraph);
  }

  return merged.join("\n\n").trim();
}
