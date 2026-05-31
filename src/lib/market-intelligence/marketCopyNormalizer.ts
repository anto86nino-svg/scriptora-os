/**
 * Softens absolute or hype market copy into premium editorial language.
 * Deterministic string transforms — no LLM, no randomness.
 */

const PHRASE_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/this title will perform strongly/gi, "This title shows promising commercial characteristics"],
  [/will perform strongly/gi, "shows promising commercial characteristics"],
  [/trending keyword/gi, "Keyword showing positive editorial signals"],
  [/strong market opportunity/gi, "Potential opportunity based on detected patterns"],
  [/high-converting niche/gi, "Niche with encouraging editorial indicators"],
  [/guaranteed (?:success|bestseller|sales)/gi, "Encouraging editorial indicators suggest potential"],
  [/will succeed/gi, "shows characteristics aligned with market patterns"],
  [/bestseller certainty/gi, "commercial positioning signals"],
  [/real-time dominance/gi, "current editorial momentum signals"],
  [/explosive trend/gi, "emerging thematic cluster"],
  [/perfect niche/gi, "well-aligned niche positioning"],
  [/guaranteed/gi, "indicated by editorial signals"],
  [/will dominate/gi, "may align with category patterns"],
  [/viral (?:guarantee|success)/gi, "strong discoverability potential"],
  [/100% (?:success|conversion)/gi, "strong editorial alignment"],
  [/massive opportunity/gi, "notable opportunity based on detected patterns"],
  [/unstoppable trend/gi, "sustained thematic interest"],
  [/instant bestseller/gi, "commercially oriented positioning"],
  [/no-brainer niche/gi, "niche with favorable editorial indicators"],
  [/slam dunk/gi, "promising editorial fit"],
  [/can't miss/gi, "worth evaluating against your positioning"],
  [/will crush (?:it|the competition)/gi, "shows competitive positioning potential"],
  [/dominate the market/gi, "compete effectively within the category"],
  [/hot trend/gi, "active thematic cluster"],
  [/high demand guaranteed/gi, "demand signals detected in editorial patterns"],
];

const FORBIDDEN_PATTERNS = [
  "guaranteed",
  "will succeed",
  "bestseller certainty",
  "real-time dominance",
  "explosive trend",
  "perfect niche",
] as const;

/** Normalize a single string; returns trimmed result. */
export function normalizeMarketCopy(text: string): string {
  if (!text?.trim()) return text ?? "";

  let out = text.trim();
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }

  // Collapse duplicate spaces introduced by replacements
  out = out.replace(/\s{2,}/g, " ").trim();

  // Ensure sentence starts with capital if it was lowercased by mid-sentence replace
  if (out.length > 0 && /^[a-z]/.test(out)) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }

  return out;
}

/** Batch normalize optional text fields on an object (shallow, string values only). */
export function normalizeMarketCopyFields<T extends Record<string, unknown>>(
  obj: T,
  keys: (keyof T)[],
): T {
  const next = { ...obj };
  for (const key of keys) {
    const val = next[key];
    if (typeof val === "string") {
      (next as Record<string, unknown>)[key as string] = normalizeMarketCopy(val);
    }
  }
  return next;
}

/** Check if text still contains forbidden absolute wording after normalization. */
export function containsForbiddenMarketCopy(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_PATTERNS.some((p) => lower.includes(p));
}

export { FORBIDDEN_PATTERNS };
