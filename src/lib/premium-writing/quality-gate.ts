import { extractEmotionalBeats } from "./scene-continuity-v2";

export interface QualityGateResult {
  score: number;
  passed: boolean;
  issues: string[];
}

function dialoguePerfectionScore(text: string): number {
  const therapy = (text.match(/\b(capisco perfettamente|understand completely|it's okay|va tutto bene)\b/gi) || []).length;
  return Math.max(0, 100 - therapy * 18);
}

function leakageScore(text: string): number {
  const leaks = (text.match(/\b(MANDATORY|CRITICAL RULES|Genre Coach|system prompt|Costo:)\b/gi) || []).length;
  const english = (text.match(/\b(however|meanwhile|suddenly|whispered)\b/gi) || []).length;
  return Math.max(0, 100 - leaks * 25 - english * 8);
}

export function scoreGeneratedOutput(text: string, priorText = ""): QualityGateResult {
  const issues: string[] = [];
  const beats = extractEmotionalBeats(text);
  const priorBeats = extractEmotionalBeats(priorText);
  const repeated = beats.filter((b) => priorBeats.includes(b));
  if (repeated.length >= 2) issues.push("emotional_repetition");
  if (dialoguePerfectionScore(text) < 55) issues.push("dialogue_perfection");
  if (leakageScore(text) < 70) issues.push("contamination_or_leakage");
  if (text.split(/\s+/).filter(Boolean).length < 40) issues.push("too_short");

  const score = Math.round(
    (100 - repeated.length * 12) * 0.35 +
      dialoguePerfectionScore(text) * 0.3 +
      leakageScore(text) * 0.35,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    passed: score >= 62 && issues.length <= 1,
    issues,
  };
}

export function buildQualityRetryInstruction(result: QualityGateResult): string {
  if (result.passed) return "";
  const fixes = [
    result.issues.includes("emotional_repetition") ? "Introduce a NEW emotional beat with visible consequence — do not repeat prior fears/confessions." : "",
    result.issues.includes("dialogue_perfection") ? "Make dialogue messier: interruptions, hesitation, unfinished thoughts." : "",
    result.issues.includes("contamination_or_leakage") ? "Remove meta language and English leakage. Prose only." : "",
  ].filter(Boolean);
  return fixes.join("\n");
}
