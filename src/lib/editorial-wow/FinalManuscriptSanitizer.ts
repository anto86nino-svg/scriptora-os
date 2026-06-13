/**
 * FINAL MANUSCRIPT SANITIZER
 *
 * Last-line defense before manuscript text is shown/saved.
 * Removes: prompt leakage, AI labels, language bleed, broken punctuation,
 * duplicate paragraphs, unwanted markdown, planning artefacts.
 *
 * Pure function — never throws, always returns a string.
 */

const LABEL_PATTERNS: RegExp[] = [
  // AI assistant artefacts
  /^(Chapter outline|Outline|Chapter plan|Chapter summary)[:\-–—]\s*.*/gim,
  /^(Genre Coach|GenreCoach|Editorial Coach|Editorial OS|Chapter Doctor|Assistant|Assistente|AI Note|Note:|Writing Note)[:\-–—\s].*/gim,
  /^The next (move|step|beat|scene)[:\-–—].*/gim,
  /^The next move would not wait.*$/gim,
  /^The detail finally revealed itself.*$/gim,
  /^One detail stuck.*$/gim,
  /^Some details stay.*$/gim,
  /^Assistente per genere dentro.*$/gim,
  /^usa dopo (Scansione rapida|Chapter Doctor).*$/gim,
  /^\*\*(Chapter|Scene|Beat|Note|Plan|Outline)[:\-–—\s].*\*\*$/gim,
  // Debug / meta
  /^\[.*\]\s*$/gm,
  /^```[a-z]*\s*$/gm,
  /^```\s*$/gm,
  /^\s*[,.;:]\s*$/gm,
  // Planning leakage
  /^(Scene goal|Scene beat|Scene function|Scene type)[:\-–—].*/gim,
  /^(POV|Point of view)[:\-–—]\s*/gim,
  /^(Setting|Location|Time)[:\-–—]\s*(.*)/gim,
  /^(Characters present|Target reader|Output|Instruction|Instructions|Prompt|User prompt|System prompt)[:\-–—]\s*(.*)/gim,
  /^\*\*(Setting|Location|Characters present|POV|Scene goal)[:\-–—\s]/gim,
  // Markdown headers inside prose (h1–h3 that aren't the chapter title)
  /^#{1,3}\s+.+$/gm,
];

const ENGLISH_IN_ITALIAN_PATTERNS: Array<[RegExp, string]> = [
  // Common AI English leakage inside Italian prose
  [/\bGenre Coach\b/g, ""],
  [/\bAssistant\b(?=[^a-zA-Z]|$)/g, ""],
  [/\bChapter \d+\b/g, ""],
  [/\b(Note|Warning|Important)\b(?=:)/gi, ""],
  [/\[([A-Z_]+)\]/g, ""],                // [PLACEHOLDER_STYLE] artefacts
  [/^The next move would not wait.*$/gim, ""],
  [/^The detail finally revealed itself.*$/gim, ""],
  [/^One detail stuck.*$/gim, ""],
  [/^Some details stay.*$/gim, ""],
];

const PUNCTUATION_FIXES: Array<[RegExp, string]> = [
  [/\s+,/g, ","],
  [/,\s*\./g, "."],
  [/,\s*,/g, ","],
  [/\s*\.\s*,/g, "."],
  [/\.\s*\.\s*\./g, "…"],
  [/\s+([.!?;:])/g, "$1"],
  [/([.!?]){4,}/g, "$1$1$1"],
  [/ {2,}/g, " "],
  [/\n{4,}/g, "\n\n\n"],
  [/^\s+$/gm, ""],
  [/ +\n/g, "\n"],
  [/\n +/g, "\n"],
];

/**
 * Remove obvious duplicate paragraphs (exact or near-exact).
 */
function removeDuplicateParagraphs(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const para of paragraphs) {
    const key = para.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(para.trim());
  }
  return result.join("\n\n");
}

/**
 * Apply language-specific leakage cleanup.
 * Italian: remove stray English words that break immersion.
 */
function cleanLanguageBleed(text: string, language: string): string {
  const isItalian = /ital/i.test(language);
  if (!isItalian) return text;
  let result = text;
  for (const [pattern, replacement] of ENGLISH_IN_ITALIAN_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export interface SanitizerOptions {
  language?: string;
  /** Pass false to skip label stripping (e.g. for non-prose content like outlines). */
  stripLabels?: boolean;
}

/**
 * Run the full sanitizer pipeline on a manuscript string.
 * Always returns a string — never throws.
 */
export function sanitizeManuscript(text: string, opts: SanitizerOptions = {}): string {
  if (!text?.trim()) return text ?? "";

  const { language = "Italian", stripLabels = true } = opts;

  let result = text;

  // 1. Strip AI labels and planning artefacts
  if (stripLabels) {
    for (const pattern of LABEL_PATTERNS) {
      result = result.replace(pattern, "");
    }
  }

  // 2. Language bleed cleanup
  result = cleanLanguageBleed(result, language);

  // 3. Punctuation normalization
  for (const [pattern, replacement] of PUNCTUATION_FIXES) {
    result = result.replace(pattern, replacement);
  }

  // 4. Remove duplicate paragraphs
  result = removeDuplicateParagraphs(result);

  // 5. Final whitespace trim
  return result.trim();
}
