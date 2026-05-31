import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import { buildEditorialIntentSheet } from "@/lib/editorial-orchestrator/intent-sheet";
import { runPreDeliveryGate } from "@/lib/editorial-orchestrator/pre-delivery-gate";
import { scoreEditorialRubric, type RubricScores } from "@/lib/live-author-validation/rubric";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { simulateReaderInLoop } from "@/lib/reader-simulation";
import type { CorpusGenreKey } from "@/lib/live-author-validation/fixtures/competitor-corpus";

export type DeliveredChapterMetrics = {
  supremeComposite: number;
  greatnessComposite: number;
  narrativeMagicComposite: number;
  criticalIssues: number;
  optionalIssues: number;
  readerCuriosity: number;
  readerRetention: number;
  passesPreDelivery: boolean;
  problems: {
    missingPayoffs: number;
    cliches: number;
    explainedEmotions: number;
    characterIncoherences: number;
    forgottenPromises: number;
    artificialDialogue: number;
  };
  rubric: RubricScores;
  bestseller: {
    hookStrength: number;
    bingeability: number;
    readerRetention: number;
    bookTokIntensity: number;
    overall: number;
  };
};

export function emptyBlueprint(): BookBlueprint {
  return {
    chapterOutlines: Array.from({ length: 10 }, (_, i) => ({
      title: `Chapter ${i + 1}`,
      summary: "Measurement sprint chapter.",
    })),
    blueprintIntegrity: {
      bookCoreDNA: {},
      worldLoreFoundation: {},
      characterMemoryEngine: [],
      structuralStoryArchitecture: {},
      relationshipTensionEngine: {},
      canonProtectionLayer: {
        immutableCanonRules: [],
        forbiddenMutations: [],
        priorityOrder: [],
      },
      narrativeImmersionRules: { prioritize: [], avoid: [], sceneLaws: [] },
    },
  } as BookBlueprint;
}

export function mapGenreKey(genre?: string): CorpusGenreKey {
  const g = String(genre || "").toLowerCase();
  if (/romance|dark-romance/.test(g)) return "romance";
  if (/thriller|mystery|crime/.test(g)) return "thriller";
  if (/fantasy|sci-fi/.test(g)) return "fantasy";
  if (/memoir|biography/.test(g)) return "memoir";
  if (/self-help|psychology|productivity/.test(g)) return "selfHelp";
  if (/business/.test(g)) return "business";
  if (/garden|horticult|tomato/.test(g)) return "horticultural";
  return "selfHelp";
}

export function runScriptoraPipeline(input: {
  content: string;
  config: Partial<BookConfig>;
  chapterIndex?: number;
  previousChapters?: Chapter[];
}): { content: string; metrics: DeliveredChapterMetrics } {
  const config = {
    numberOfChapters: 10,
    language: "English",
    title: "Measurement Sprint",
    ...input.config,
  } as BookConfig;
  const blueprint = emptyBlueprint();
  const chapterIndex = input.chapterIndex ?? 0;
  const previousChapters = input.previousChapters ?? [];

  const humanizedContent = input.content;
  const intent = buildEditorialIntentSheet({
    config,
    blueprint,
    chapterIndex,
    chapterTitle: `Chapter ${chapterIndex + 1}`,
    chapterSummary: "Measurement sprint evaluation.",
    previousChapters,
  });

  const { chapter, snapshot } = runPreDeliveryGate({
    chapter: { title: intent.chapterTitle, content: humanizedContent, subchapters: [] },
    config,
    blueprint,
    chapterIndex,
    totalChapters: config.numberOfChapters || 10,
    intent,
    previousChapters,
    outlineSummary: intent.chapterTitle,
  });

  const content = chapter.content;
  const score = snapshot.score;
  const genreKey = mapGenreKey(config.genre);
  const rubric = scoreEditorialRubric({
    content,
    config,
    genreKey,
    chapterIndex,
    continuityProxy: (snapshot.phaseD?.supremeMemoryReport.narrativeHealth ?? 80) / 100,
  });
  const bestseller = evaluateBestsellerChapter({
    content,
    chapterIndex,
    genre: config.genre,
    bookIntelligence: config.bookIntelligence as any,
  });
  const reader = simulateReaderInLoop({
    content,
    chapterIndex,
    config,
    totalChapters: config.numberOfChapters || 10,
  });

  const subtext = snapshot.phaseC?.subtextAnalysis;
  const behavioral = snapshot.phaseC?.behavioralConsistency;
  const dialogue = snapshot.phaseC?.dialogueHumanity;
  const payoff = snapshot.phaseB?.payoffAnalysis;
  const cliche = snapshot.phaseB?.clicheScan;

  return {
    content,
    metrics: {
      supremeComposite: score.composite,
      greatnessComposite: snapshot.greatnessScore ?? snapshot.phaseE?.greatnessAfter ?? 0,
      narrativeMagicComposite: snapshot.narrativeMagicScore ?? snapshot.phaseF?.narrativeMagicAfter ?? 0,
      criticalIssues: score.criticalCount,
      optionalIssues: score.optionalCount,
      readerCuriosity: score.dimensions.readerCuriosity,
      readerRetention: reader.retention,
      passesPreDelivery: score.passesPreDelivery,
      problems: {
        missingPayoffs: payoff?.missingPayoffCount ?? 0,
        cliches: cliche?.hits.length ?? 0,
        explainedEmotions: subtext?.metrics.explainedEmotion ?? 0,
        characterIncoherences: behavioral?.violations.filter(v => v.severity === "critical").length ?? 0,
        forgottenPromises: snapshot.phaseD?.supremeMemoryReport.openPromises ?? 0,
        artificialDialogue:
          (dialogue?.metrics.therapistDialogueLines ?? 0) + (dialogue?.metrics.perfectDialogueLines ?? 0),
      },
      rubric,
      bestseller: {
        hookStrength: bestseller.scores.hookStrength,
        bingeability: bestseller.scores.bingeability,
        readerRetention: bestseller.scores.readerRetention,
        bookTokIntensity: bestseller.scores.bookTokIntensity,
        overall: bestseller.scores.overall,
      },
    },
  };
}
