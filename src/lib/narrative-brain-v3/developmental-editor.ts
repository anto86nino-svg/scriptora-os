import type { BookConfig } from "@/types/book";
import { THERAPIST_DIALOGUE_RE } from "./human-contradiction";
import type { DevelopmentalEditorReport } from "./types";

const TELL_PATTERNS = [
  /\b(she felt|he felt|si sentì|provava|realized that|capì che|understood that)\b/gi,
];

const REPETITION_WINDOW = 80;

function wordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 4));
}

function repetitionScore(text: string): number {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paras.length < 2) return 0;
  let repeats = 0;
  for (let i = 1; i < paras.length; i++) {
    const a = wordSet(paras[i - 1]);
    const b = wordSet(paras[i]);
    let overlap = 0;
    for (const w of b) if (a.has(w)) overlap++;
    if (overlap > REPETITION_WINDOW * 0.35) repeats++;
  }
  return repeats;
}

export function runDevelopmentalEditorPass(
  content: string,
  config: BookConfig,
): DevelopmentalEditorReport {
  const issues: DevelopmentalEditorReport["issues"] = [];
  const surgicalFixes: string[] = [];
  let score = 88;

  const therapistHits = content.match(THERAPIST_DIALOGUE_RE);
  if (therapistHits?.length) {
    score -= therapistHits.length * 4;
    issues.push({ priority: "high", area: "dialogue", message: "Therapist-style emotional clarity detected" });
    surgicalFixes.push("Replace explicit emotional explanations with gesture, silence, or deflection");
  }

  const tellHits = content.match(TELL_PATTERNS);
  if (tellHits && tellHits.length > 3) {
    score -= 6;
    issues.push({ priority: "medium", area: "subtext", message: "Too much tell — named feelings without embodiment" });
    surgicalFixes.push("Convert 2-3 feeling statements into physical action or subtext");
  }

  const reps = repetitionScore(content);
  if (reps > 0) {
    score -= reps * 5;
    issues.push({ priority: "high", area: "redundancy", message: `Paragraph-level repetition detected (${reps} blocks)` });
    surgicalFixes.push("Remove or merge repeated emotional beats — advance scene with new information");
  }

  if (content.length > 0 && content.split(/\s+/).length < 120) {
    score -= 10;
    issues.push({ priority: "medium", area: "pacing", message: "Chapter feels thin for commercial fiction" });
  }

  const g = String(config.genre || "").toLowerCase();
  if (/romance|thriller/.test(g) && !/\b(but|ma|però|however|yet)\b/i.test(content.slice(0, 600))) {
    score -= 4;
    issues.push({ priority: "low", area: "tension", message: "Opening lacks friction marker" });
    surgicalFixes.push("Add one beat of resistance or unanswered question in opening");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    surgicalFixes,
  };
}

export function buildDevelopmentalEditorPromptFixes(report: DevelopmentalEditorReport): string {
  if (!report.surgicalFixes.length) return "";
  return [
    "DEVELOPMENTAL EDITOR AI — apply these surgical fixes only (do not rewrite whole chapter):",
    ...report.surgicalFixes.map((f) => `• ${f}`),
  ].join("\n");
}
