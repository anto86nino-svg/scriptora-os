import { sanitizeManuscript, type SanitizerOptions } from "@/lib/editorial-wow/FinalManuscriptSanitizer";

const PROMPT_LEAKAGE_PATTERNS: RegExp[] = [
  /^(SCENE CONTINUITY|HUMAN DIALOGUE|ROMANCE SLOW BURN|CHARACTER MEMORY|MANDATORY|CRITICAL RULES)[:\s].*/gim,
  /^(Write in|Return ONLY|Do NOT return|BESTSELLER QUALITY|GENRE DIRECTIVE)[:\s].*/gim,
  /\b(system prompt|user prompt|chunk size|phase instruction)\b/gi,
  /\b(placeholder|TBD|lorem ipsum|\[INSERT|\[TODO)\b/gi,
  /^(As an AI|Come assistente|In qualità di)\b.*/gim,
];

const STREAMING_ARTIFACT_PATTERNS: RegExp[] = [
  /\bcontinuing\.\.\.|writing next segment\.\.\./gi,
  /^\.{3,}$/gm,
  /^\s*—\s*$/gm,
];

const UI_LEAKAGE_PATTERNS: RegExp[] = [
  /\b(Click here|Generate chapter|Rewrite chapter|Costo:\s*\d+\s*crediti)\b/gi,
  /\b(Insufficient credits|Saldo attuale)\b/gi,
];

const EXTRA_ENGLISH_IN_ITALIAN: Array<[RegExp, string]> = [
  [/\bhowever\b/gi, "tuttavia"],
  [/\bmeanwhile\b/gi, "nel frattempo"],
  [/\bsuddenly\b/gi, "all'improvviso"],
  [/\bwhispered\b/gi, "sussurrò"],
  [/\bChapter\s+\d+\b/gi, ""],
  [/\bthe end\b/gi, ""],
];

function stripPatterns(text: string, patterns: RegExp[]): string {
  let result = text;
  for (const p of patterns) result = result.replace(p, "");
  return result;
}

function cleanExtraEnglish(text: string, language: string): string {
  if (!/ital/i.test(language)) return text;
  let result = text;
  for (const [pattern, replacement] of EXTRA_ENGLISH_IN_ITALIAN) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function removeBrokenFragments(text: string): string {
  return text
    .split(/\n{2,}/)
    .filter((para) => {
      const t = para.trim();
      if (!t) return false;
      if (t.length < 8 && !/[.!?…]$/.test(t)) return false;
      return true;
    })
    .join("\n\n");
}

export function applyPremiumOutputGuard(text: string, opts: SanitizerOptions = {}): string {
  if (!text?.trim()) return text ?? "";

  let result = sanitizeManuscript(text, opts);

  result = stripPatterns(result, PROMPT_LEAKAGE_PATTERNS);
  result = stripPatterns(result, STREAMING_ARTIFACT_PATTERNS);
  result = stripPatterns(result, UI_LEAKAGE_PATTERNS);
  result = cleanExtraEnglish(result, opts.language || "Italian");
  result = removeBrokenFragments(result);

  return result.trim();
}
