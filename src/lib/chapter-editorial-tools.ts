import type { RewriteLevel } from "@/lib/generation-types";
import {
  hasCleanableChapterContent,
  runEditorialCleanup,
  validateEditorialCleanupResult,
  type EditorialCleanupResult,
} from "@/lib/editorial-cleanup";
import { detectSubchapterBoundaryIssues } from "@/lib/writer/clean-text-pass";

export type ChapterToolId = "analysis" | "score" | "cleanup" | "patch" | "rewrite";
export type MobileChapterToolId = "analysis" | "cleanup" | "patch" | "more";
export type ChapterToolRecommendation =
  | "none"
  | "editorial_cleanup"
  | "patch"
  | "rewrite_light"
  | "rewrite_medium";

export type ChapterEditorialIssue = {
  type: "dirty_text" | "rhythm" | "structure" | "coherence" | "subchapters";
  severity: "low" | "medium" | "high";
  description: string;
  suggestedTool: ChapterToolId;
};

export type ChapterEditorialOutcome = {
  summary: string;
  qualityLevel: "empty" | "clean" | "good_raw" | "dirty" | "weak" | "structural_risk";
  issues: ChapterEditorialIssue[];
  recommendedNextAction: ChapterToolRecommendation;
};

export type ChapterEditorialScore = {
  overall: number;
  style: number;
  coherence: number;
  rhythm: number;
  originality: number;
  emotionalImpact: number;
  editorialCleanliness: number;
  publishReadiness: number;
  verdict: string;
  nextAction: string;
};

export const CHAPTER_TOOL_FAMILY: ChapterToolId[] = ["analysis", "score", "cleanup", "patch", "rewrite"];
export const MOBILE_PRIMARY_CHAPTER_TOOLS: MobileChapterToolId[] = ["analysis", "cleanup", "patch", "more"];

export const TOOL_INVASIVENESS: Record<ChapterToolId, number> = {
  analysis: 0,
  score: 0,
  cleanup: 1,
  patch: 2,
  rewrite: 4,
};

export const REWRITE_LEVEL_LABELS: Record<RewriteLevel, { label: string; description: string }> = {
  light: {
    label: "Leggera",
    description: "Migliora stile e scorrevolezza mantenendo quasi tutto.",
  },
  deep: {
    label: "Media",
    description: "Ristruttura ritmo e frasi, conservando trama e canon.",
  },
  bestseller: {
    label: "Profonda",
    description: "Intervento importante: conserva eventi, POV, genere e personaggi.",
  },
};

const WEAK_RHYTHM_PATTERNS = [
  /\bpoi\b[\s\S]{0,90}\bpoi\b[\s\S]{0,90}\bpoi\b/i,
  /\bcontinuava a\b[\s\S]{0,120}\bcontinuava a\b/i,
  /\bsentiva che\b[\s\S]{0,120}\bsentiva che\b/i,
  /\bera come se\b[\s\S]{0,140}\bera come se\b/i,
];

const STRUCTURAL_RISK_PATTERNS = [
  /\bplaceholder\b|\bTODO\b|lorem ipsum/i,
  /\bcapitolo\s+\d+\b[\s\S]{0,80}\bcapitolo\s+\d+\b/i,
];

function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function roundScore(value: number): number {
  return Math.round(Math.max(1, Math.min(10, value)) * 10) / 10;
}

function hasWeakRhythm(content: string): boolean {
  return WEAK_RHYTHM_PATTERNS.some((pattern) => pattern.test(content));
}

function hasStructuralRisk(content: string): boolean {
  return STRUCTURAL_RISK_PATTERNS.some((pattern) => pattern.test(content));
}

export function shouldShowChapterTools(content?: string): boolean {
  return hasCleanableChapterContent(content);
}

export function buildChapterEditorialOutcome(
  content: string,
  subchapters: Array<{ title?: string; content?: string }> = [],
): ChapterEditorialOutcome {
  const normalized = String(content || "").trim();
  if (!normalized) {
    return {
      summary: "Il capitolo non ha ancora testo: genera o incolla contenuto prima di usare gli strumenti.",
      qualityLevel: "empty",
      issues: [],
      recommendedNextAction: "none",
    };
  }

  const boundaryIssues = detectSubchapterBoundaryIssues(subchapters);
  const cleanup = runEditorialCleanup({ content: normalized, subchapters: subchapters as any });
  const dirtyIssues = cleanup.issuesFound.filter((issue) => issue.severity === "high" || issue.type === "typo" || issue.type === "corrupted_sentence");
  const issues: ChapterEditorialIssue[] = [];

  if (dirtyIssues.length > 0 || boundaryIssues.length > 0) {
    issues.push({
      type: "dirty_text",
      severity: dirtyIssues.some((issue) => issue.severity === "high") || boundaryIssues.length > 0 ? "high" : "medium",
      description: boundaryIssues.length > 0
        ? "Il capitolo è completo, ma contiene rotture di continuità o frammenti da pulire tra sottocapitoli."
        : "Sono presenti refusi, frasi rotte o ripetizioni immediate da correggere prima di interventi piu' invasivi.",
      suggestedTool: "cleanup",
    });
  }

  if (hasWeakRhythm(normalized)) {
    issues.push({
      type: "rhythm",
      severity: "medium",
      description: "Il ritmo sembra appoggiarsi su formule ripetute: conviene una patch mirata su tensione e progressione.",
      suggestedTool: "patch",
    });
  }

  if (hasStructuralRisk(normalized) || wordCount(normalized) < 120) {
    issues.push({
      type: "structure",
      severity: wordCount(normalized) < 120 ? "medium" : "high",
      description: "La struttura appare fragile o incompleta: se la patch non basta, serve una riscrittura controllata.",
      suggestedTool: wordCount(normalized) < 120 ? "patch" : "rewrite",
    });
  }

  if (issues.some((issue) => issue.type === "dirty_text")) {
    return {
      summary: "Il capitolo ha materiale utile, ma va prima ripulito editorialmente.",
      qualityLevel: "dirty",
      issues,
      recommendedNextAction: "editorial_cleanup",
    };
  }

  if (issues.some((issue) => issue.type === "structure" && issue.suggestedTool === "rewrite")) {
    return {
      summary: "Il capitolo richiede un intervento strutturale prima di puntare alla qualita' editoriale alta.",
      qualityLevel: "structural_risk",
      issues,
      recommendedNextAction: "rewrite_medium",
    };
  }

  if (issues.some((issue) => issue.suggestedTool === "patch")) {
    return {
      summary: "Il testo e' leggibile, ma una patch mirata puo' alzare ritmo, tensione o chiarezza.",
      qualityLevel: "good_raw",
      issues,
      recommendedNextAction: "patch",
    };
  }

  return {
    summary: "Il capitolo non mostra problemi sporchi evidenti: analisi e voto possono bastare prima di interventi invasivi.",
    qualityLevel: "clean",
    issues,
    recommendedNextAction: "none",
  };
}

export function scoreChapterEditorialReadiness(content: string): ChapterEditorialScore {
  const normalized = String(content || "").trim();
  const outcome = buildChapterEditorialOutcome(normalized);
  const cleanup = normalized ? runEditorialCleanup({ content: normalized }) : null;
  const severeDirtyIssues = cleanup?.issuesFound.filter((issue) => issue.severity === "high").length || 0;
  const corruptionIssues = cleanup?.issuesFound.filter((issue) => issue.type === "corrupted_sentence").length || 0;
  const dirtyPenalty = cleanup ? Math.min(4.5, cleanup.issuesFound.length * 1.05 + severeDirtyIssues * 0.55) : 4;
  const rhythmPenalty = hasWeakRhythm(normalized) ? 1.3 : 0;
  const structurePenalty = hasStructuralRisk(normalized) || wordCount(normalized) < 120 ? 1.8 : 0;

  const editorialCleanliness = roundScore(9 - dirtyPenalty);
  const rhythm = roundScore(8.2 - rhythmPenalty - Math.min(0.8, dirtyPenalty * 0.2));
  const coherence = roundScore(8 - structurePenalty);
  const style = roundScore(8.1 - rhythmPenalty * 0.4 - dirtyPenalty * 0.25);
  const originality = roundScore(8);
  const emotionalImpact = roundScore(7.8 - structurePenalty * 0.25);
  const publishReadiness = roundScore((editorialCleanliness + rhythm + coherence + style) / 4);
  const metricAverage = (style + coherence + rhythm + originality + emotionalImpact + editorialCleanliness + publishReadiness) / 7;
  const lowestMetric = Math.min(style, coherence, rhythm, originality, emotionalImpact, editorialCleanliness, publishReadiness);
  let overall = roundScore(Math.min(metricAverage + 0.2, metricAverage));
  if (lowestMetric < 6.5) overall = Math.min(overall, 8.2);
  if (corruptionIssues > 0) overall = Math.min(overall, 6);

  const nextAction =
    outcome.recommendedNextAction === "editorial_cleanup"
      ? "Pulizia editoriale"
      : outcome.recommendedNextAction === "patch"
        ? "Patch capitolo"
        : outcome.recommendedNextAction.startsWith("rewrite")
          ? "Riscrittura controllata"
          : "Nessuna riscrittura necessaria";

  return {
    overall,
    style,
    coherence,
    rhythm,
    originality,
    emotionalImpact,
    editorialCleanliness,
    publishReadiness,
    verdict:
      editorialCleanliness < 7
        ? "Idea utilizzabile, ma ancora sporca editorialmente."
        : outcome.recommendedNextAction === "none"
          ? "Capitolo pulito: procedere con analisi fine o micro-patch solo se serve."
          : outcome.summary,
    nextAction,
  };
}

export function validateChapterPatchSafety(originalContent: string, patchedContent: string): { valid: boolean; reason?: string } {
  const original = String(originalContent || "").trim();
  const patched = String(patchedContent || "").trim();

  if (!patched) return { valid: false, reason: "La patch e' vuota." };
  if (original.length > 120 && patched.length < original.length * 0.65) {
    return { valid: false, reason: "La patch cancella troppo contenuto principale." };
  }
  if (/\bTODO\b|lorem ipsum|\[[^\]]*\]/i.test(patched)) {
    return { valid: false, reason: "La patch contiene placeholder o residui tecnici." };
  }

  return { valid: true };
}

export function isValidRewriteLevel(level?: RewriteLevel): level is RewriteLevel {
  return level === "light" || level === "deep" || level === "bestseller";
}

export function cleanupIsLessInvasiveThanRewrite(result: EditorialCleanupResult): boolean {
  const validation = validateEditorialCleanupResult(result.cleanedContent, result);
  return validation.valid && TOOL_INVASIVENESS.cleanup < TOOL_INVASIVENESS.rewrite;
}
