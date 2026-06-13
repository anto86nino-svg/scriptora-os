import { sanitizeStudyText } from "@/lib/study-ux";

const LEAK_PATTERNS = [
  /\b(system|assistant|developer|genre coach)\s*:/gi,
  /\b(as an ai|come modello ai|sono un modello|language model)\b/gi,
  /\b(i cannot|non posso aiutarti|sorry,? i can't)\b/gi,
  /\b(here is the json|return only valid json|output rule)\b/gi,
  /```json/gi,
  /\{[\s\S]{0,200}"title"\s*:\s*"[\s\S]{0,80}"detectedSubject"/gi,
];

const ITALIAN_UI_LEAK = [
  /\b(summary|overview|key points|flashcards|quiz questions)\b/gi,
];

export interface StudySanitizeReport {
  text: string;
  blocked: string[];
  warnings: string[];
}

export function sanitizeStudyOsOutput(text: string, language = "Italian"): StudySanitizeReport {
  const blocked: string[] = [];
  const warnings: string[] = [];
  let next = sanitizeStudyText(String(text || ""));

  for (const pattern of LEAK_PATTERNS) {
    if (pattern.test(next)) {
      blocked.push(pattern.source.slice(0, 40));
      next = next.replace(pattern, "");
    }
  }

  if (language === "Italian") {
    for (const pattern of ITALIAN_UI_LEAK) {
      if (pattern.test(next)) {
        warnings.push("inglese_in_output");
        break;
      }
    }
  }

  next = next
    .replace(/\n{4,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return { text: next, blocked, warnings };
}

export function containsStudyLeak(text: string): boolean {
  const lower = String(text || "").toLowerCase();
  return (
    /\b(system|assistant|developer)\s*:/i.test(text) ||
    /\b(as an ai|come modello ai)\b/i.test(lower) ||
    /```json/i.test(text) ||
    /\bgenre coach\b/i.test(lower)
  );
}

export function isStudyOutputComplete(fields: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!String(fields.lightSummary || "").trim()) missing.push("lightSummary");
  if (!String(fields.mediumSummary || "").trim()) missing.push("mediumSummary");
  if (!Array.isArray(fields.quiz) || fields.quiz.length < 3) missing.push("quiz");
  if (!Array.isArray(fields.flashcards) || fields.flashcards.length < 3) missing.push("flashcards");
  return missing;
}
