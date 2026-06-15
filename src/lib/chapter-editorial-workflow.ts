import type { AIQualityRating, BookConfig, ChapterEditorialSnapshot } from "@/types/book";
import {
  analyzeNovel,
  calculateEditorialScores,
  rankEditorialIssues,
} from "@/lib/EditorialIntelligence";
import { computePremiumEditorialScores } from "@/lib/editorial-intelligence-premium";

export type AnalysisStatus = "idle" | "running" | "done" | "error";
export type PatchStatus = "idle" | "running" | "preview" | "applying" | "done" | "error";

export type ChapterEditorialAnalysisResult = {
  snapshot: ChapterEditorialSnapshot;
  aiRating: AIQualityRating;
};

export type LocalChapterPatchFallback = {
  patches: Array<{ idx: number; original: string; patched: string; type: string; reason: string }>;
  patchedText: string;
  originalText: string;
  modificationPercent: number;
  evaluation: { score: number; improvements: string[]; strengths: string[] };
  fallbackMode: true;
  fallbackReason: string;
};

function scoreToFive(composite: number): number {
  return Math.max(1, Math.min(5, Math.round(composite / 20) || 1));
}

function buildStrengths(
  premium: ReturnType<typeof computePremiumEditorialScores>,
  editorial: ReturnType<typeof analyzeNovel>,
): string[] {
  const out: string[] = [];
  if (premium.hookStrength >= 72) out.push("Hook d'apertura commerciale efficace.");
  if (premium.dialogueHumanity >= 68) out.push("Dialoghi con umanità e attrito credibile.");
  if (premium.emotionalRealism >= 68) out.push("Emozioni mostrate con resistenza, non solo dichiarate.");
  if (premium.bingeability >= 70) out.push("Chiusura che spinge alla pagina successiva.");
  if (editorial.subtextScore >= 65) out.push("Sottotesto presente nelle scene chiave.");
  if (!out.length) out.push("Base narrativa solida — margini di affinamento mirato.");
  return out.slice(0, 4);
}

export function runLocalChapterEditorialAnalysis(
  content: string,
  config: Pick<BookConfig, "genre" | "language" | "tone">,
  chapterIndex: number,
): ChapterEditorialAnalysisResult {
  const trimmed = String(content || "").trim();
  if (trimmed.length < 80) {
    throw new Error("Capitolo troppo corto per un'analisi editoriale credibile.");
  }

  const editorial = analyzeNovel(trimmed);
  const ranked = rankEditorialIssues(editorial.warnings);
  const scores = calculateEditorialScores(ranked);
  const premium = computePremiumEditorialScores({
    content: trimmed,
    genre: config.genre,
    language: config.language,
    chapterIndex,
  });

  const issues = ranked.slice(0, 5).map((w) => w.message);
  const suggestions = premium.surgicalSuggestions.length
    ? premium.surgicalSuggestions
    : ranked.slice(0, 3).map((w) => w.suggestion).filter(Boolean);

  const primaryIssue = issues[0]
    || "Nessun problema critico rilevato — puoi comunque raffinare ritmo e sottotesto.";

  const snapshot: ChapterEditorialSnapshot = {
    compositeScore: premium.composite,
    scoreOutOf10: Math.round((premium.composite / 10) * 10) / 10,
    emotionalRealism: scores.emotionalRealismScore,
    dialogueHumanity: scores.dialogueHumanityScore,
    pacingBalance: scores.pacingBalanceScore,
    subtextStrength: scores.subtextStrengthScore,
    characterDepth: scores.characterDepthScore,
    commercialReadability: premium.commercialReadability,
    bingeability: premium.bingeability,
    strengths: buildStrengths(premium, editorial),
    issues,
    suggestions,
    primaryIssue,
    analyzedAt: Date.now(),
  };

  const aiRating: AIQualityRating = {
    score: scoreToFive(premium.composite),
    explanation: `Analisi editoriale Scriptora: ${snapshot.scoreOutOf10}/10 (${premium.confidence} confidence).`,
    missing: issues.slice(0, 2).join(" · ") || "Nessuna lacuna critica.",
    improvements: suggestions.slice(0, 2).join(" · ") || "Raffina hook e conseguenze di scena.",
  };

  return { snapshot, aiRating };
}

export function buildLocalChapterPatchFallback(
  content: string,
  config: Pick<BookConfig, "genre" | "language" | "tone">,
  chapterIndex: number,
  reason = "AI unavailable → fallback mode",
): LocalChapterPatchFallback {
  const originalText = String(content || "").trim();
  const analysis = runLocalChapterEditorialAnalysis(originalText, config, chapterIndex);
  return {
    patches: [],
    patchedText: originalText,
    originalText,
    modificationPercent: 0,
    evaluation: {
      score: analysis.snapshot.scoreOutOf10,
      improvements: [
        reason,
        ...analysis.snapshot.suggestions.slice(0, 4),
      ],
      strengths: analysis.snapshot.strengths.slice(0, 4),
    },
    fallbackMode: true,
    fallbackReason: reason,
  };
}

export function humanizeEditorialError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || "");
  const lower = raw.toLowerCase();
  if (/credit|insufficient/i.test(lower)) return "Crediti insufficienti per questa operazione.";
  if (/empty|vuot|corto/i.test(lower)) return "Serve un capitolo con testo sufficiente.";
  if (/network|fetch|edge|function/i.test(lower)) return "AI temporaneamente non disponibile. Riprova tra poco.";
  if (/patch|failed/i.test(lower)) return "Patch non riuscita. Controlla connessione e riprova.";
  return raw || "Operazione editoriale non completata.";
}
