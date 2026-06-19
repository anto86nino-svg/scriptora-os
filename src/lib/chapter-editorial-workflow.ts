import type { AIQualityRating, BookConfig, ChapterEditorialSnapshot } from "@/types/book";
import {
  analyzeNovel,
  calculateEditorialScores,
  rankEditorialIssues,
} from "@/lib/EditorialIntelligence";
import { computePremiumEditorialScores } from "@/lib/editorial-intelligence-premium";
import {
  buildEditorialToolsMaxLevelProtocol,
  PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS,
  runEditorialTruthGate,
} from "@/lib/editorial-tools-protocol";

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
  if (!out.length && premium.composite >= 85 && editorial.warnings.length === 0) {
    out.push(PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS);
  }
  return out.slice(0, 4);
}

function detectProtocolIssues(content: string): string[] {
  const issues: string[] = [];
  const paragraphs = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const seen = new Map<string, number>();
  paragraphs.forEach((paragraph, index) => {
    const normalized = paragraph
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    if (normalized.length < 80) return;
    const previous = seen.get(normalized);
    if (previous != null) {
      issues.push(`HIGH — possibile scena/paragrafo duplicato tra ¶${previous + 1} e ¶${index + 1}: "${paragraph.slice(0, 120)}..."`);
    } else {
      seen.set(normalized, index);
    }
  });

  const corruption = content.match(/(?:^|[\s«"“])(?:a|mpre|sapesse|stesse)\s*(?:,|\.)/i);
  if (corruption) {
    issues.push(`MEDIUM — possibile contaminazione/refuso nel manoscritto: "${corruption[0].trim()}"`);
  }

  return issues.slice(0, 4);
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
  const protocolIssues = detectProtocolIssues(trimmed);
  const allIssues = [...protocolIssues, ...issues].slice(0, 6);
  const suggestions = premium.surgicalSuggestions.length
    ? premium.surgicalSuggestions
    : ranked.slice(0, 3).map((w) => w.suggestion).filter(Boolean);

  const truthGate = runEditorialTruthGate({
    scoreOutOf10: Math.round((premium.composite / 10) * 10) / 10,
    evidence: [
      ...buildStrengths(premium, editorial),
      ...allIssues.slice(0, 2),
    ],
    criticalIssues: allIssues.filter((issue) => /^CRITICAL/i.test(issue)),
    highIssues: allIssues.filter((issue) => /^HIGH/i.test(issue)),
    moderateIssues: allIssues.filter((issue) => /^MEDIUM/i.test(issue)),
  });
  const noSubstantialImprovement = truthGate.canClaimPremium && allIssues.length === 0;
  const primaryIssue = noSubstantialImprovement
    ? PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS
    : allIssues[0] || "Nessun problema critico rilevato nel testo disponibile. La diagnosi resta limitata: blueprint/canon estesi non sono stati forniti al fallback locale.";

  const snapshot: ChapterEditorialSnapshot = {
    compositeScore: premium.composite,
    scoreOutOf10: truthGate.normalizedScore,
    emotionalRealism: scores.emotionalRealismScore,
    dialogueHumanity: scores.dialogueHumanityScore,
    pacingBalance: scores.pacingBalanceScore,
    subtextStrength: scores.subtextStrengthScore,
    characterDepth: scores.characterDepthScore,
    commercialReadability: premium.commercialReadability,
    bingeability: premium.bingeability,
    strengths: buildStrengths(premium, editorial),
    issues: allIssues,
    suggestions: noSubstantialImprovement
      ? []
      : suggestions.length
        ? suggestions
        : [`Protocollo editoriale attivo: ${buildEditorialToolsMaxLevelProtocol(config.language).split("\n")[0]}`],
    primaryIssue,
    analyzedAt: Date.now(),
  };

  const rewriteNecessary = truthGate.rewriteNecessary || snapshot.scoreOutOf10 < 8.5 || snapshot.issues.some((issue) => /CRITICAL|HIGH/i.test(issue));
  const aiRating: AIQualityRating = {
    score: scoreToFive(premium.composite),
    explanation: noSubstantialImprovement
      ? `Analisi editoriale Scriptora: ${snapshot.scoreOutOf10}/10. ${PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS}`
      : `Analisi editoriale Scriptora: ${snapshot.scoreOutOf10}/10 (${premium.confidence} confidence). Rewrite necessario? ${rewriteNecessary ? "SI" : "NO"}.`,
    missing: snapshot.issues.slice(0, 2).join(" · ") || "Nessuna lacuna critica rilevata nel testo disponibile.",
    improvements: snapshot.suggestions.slice(0, 2).join(" · ") || PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS,
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
