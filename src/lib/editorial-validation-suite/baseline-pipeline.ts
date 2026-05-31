import type { Chapter } from "@/types/book";
import { analyzeBehavioralConsistency } from "@/lib/behavioral-consistency";
import { scanCliches } from "@/lib/cliche-engine";
import { buildCharacterSupremacyProfiles } from "@/lib/character-supremacy";
import { computeDevelopmentalEditReport } from "@/lib/chapter-doctor-pro";
import { analyzeDialogueHumanity } from "@/lib/dialogue-humanity";
import { analyzeEmotionalRealism } from "@/lib/emotional-realism-gate";
import { buildEditorialIntentSheet } from "@/lib/editorial-orchestrator/intent-sheet";
import { computeSupremeEditorialScore } from "@/lib/editorial-orchestrator/supreme-score";
import { computeGreatnessScore } from "@/lib/greatness-engine";
import { computeNarrativeMagicScore } from "@/lib/masterpiece-engine";
import { humanizeChapter } from "@/lib/HumanizerLayer";
import {
  analyzeCanonProtection,
  buildNarrativeMemoryCore,
  generateSupremeMemoryReport,
  memoryCoreToPromiseRegistry,
} from "@/lib/narrative-memory-core";
import { analyzePayoff } from "@/lib/payoff-engine";
import { simulateReaderInLoop } from "@/lib/reader-simulation";
import { analyzeSubtext } from "@/lib/subtext-engine";
import { analyzeTensionV2 } from "@/lib/tension-engine-v2";
import type { ValidationGenre, ChapterValidationMetrics } from "./types";
import { emptyBlueprint, genreConfig } from "./helpers";

function countProblems(input: {
  payoffMissing: number;
  clicheHits: number;
  explainedEmotions: number;
  behavioralViolations: number;
  artificialDialogue: number;
  forgottenPromises: number;
}): ChapterValidationMetrics["problems"] {
  return {
    missingPayoffs: input.payoffMissing,
    cliches: input.clicheHits,
    explainedEmotions: input.explainedEmotions,
    characterIncoherences: input.behavioralViolations,
    forgottenPromises: input.forgottenPromises,
    artificialDialogue: input.artificialDialogue,
  };
}

export type ChapterEvaluationResult = {
  metrics: ChapterValidationMetrics;
  deliveredChapter: Chapter;
};

/** Pre A+B+C+D: humanize only — no pre-delivery gate, no orchestrator rewrites. */
export function evaluateBaselineChapter(input: {
  genre: ValidationGenre;
  chapterIndex: number;
  title: string;
  rawContent: string;
  previousChapters: Chapter[];
}): ChapterEvaluationResult {
  const config = genreConfig(input.genre);
  const blueprint = emptyBlueprint();
  const humanized = humanizeChapter(
    { title: input.title, content: input.rawContent, subchapters: [] },
    { config, previousChapters: input.previousChapters, chapterIndex: input.chapterIndex },
  );
  const content = humanized.content;

  const intent = buildEditorialIntentSheet({
    config,
    blueprint,
    chapterIndex: input.chapterIndex,
    chapterTitle: input.title,
    chapterSummary: blueprint.chapterOutlines[input.chapterIndex]?.summary || "",
    previousChapters: input.previousChapters,
  });

  const clicheScan = scanCliches(content, input.genre);
  const readerSimulation = simulateReaderInLoop({
    content,
    chapterIndex: input.chapterIndex,
    config,
    totalChapters: 10,
  });
  const payoffAnalysis = analyzePayoff({ content, chapterIndex: input.chapterIndex, config });
  const profiles = buildCharacterSupremacyProfiles({
    config,
    blueprint,
    chapters: [...input.previousChapters, humanized],
  });
  const behavioralConsistency = analyzeBehavioralConsistency({
    content,
    chapterIndex: input.chapterIndex,
    previousChapters: input.previousChapters,
    profiles,
  });
  const subtextAnalysis = analyzeSubtext({ content, chapterIndex: input.chapterIndex });
  const tensionV2 = analyzeTensionV2({
    content,
    chapterIndex: input.chapterIndex,
    config,
    profiles,
  });
  const dialogueHumanity = analyzeDialogueHumanity({ content, chapterIndex: input.chapterIndex });
  const emotionalRealism = analyzeEmotionalRealism({
    content,
    chapterIndex: input.chapterIndex,
    profiles,
    behavioral: behavioralConsistency,
    subtext: subtextAnalysis,
    tension: tensionV2,
    dialogue: dialogueHumanity,
  });

  const chapters = [...input.previousChapters, humanized];
  const narrativeMemory = buildNarrativeMemoryCore({ config, blueprint, chapters });
  const narrativePromises = memoryCoreToPromiseRegistry(narrativeMemory);
  const supremeMemoryReport = generateSupremeMemoryReport(narrativeMemory);
  const canonProtection = analyzeCanonProtection({
    content,
    config,
    blueprint,
    memory: narrativeMemory,
    previousChapters: input.previousChapters,
  });

  const score = computeSupremeEditorialScore({
    content,
    config,
    chapterIndex: input.chapterIndex,
    totalChapters: 10,
    marketFloor: intent.marketFloor,
    clicheScan,
    readerSimulation,
    narrativePromises,
    payoffAnalysis,
    behavioralConsistency,
    subtextAnalysis,
    tensionV2,
    dialogueHumanity,
    emotionalRealism,
    characterProfiles: profiles,
    canonProtection,
    supremeMemoryReport,
  });

  const doctor = computeDevelopmentalEditReport({
    originalText: input.rawContent,
    patchedText: content,
    patches: [],
    modificationPercent: 0,
    chapterIndex: input.chapterIndex,
    totalChapters: 10,
    chapterTitle: input.title,
    genre: input.genre,
  });

  const greatness = computeGreatnessScore({
    content,
    config,
    chapterIndex: input.chapterIndex,
  }).greatnessScore;

  const narrativeMagic = computeNarrativeMagicScore({
    content,
    config,
    chapterIndex: input.chapterIndex,
    totalChapters: 10,
  });

  return {
    deliveredChapter: humanized,
    metrics: {
      genre: input.genre,
      chapterIndex: input.chapterIndex,
      title: input.title,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      supremeComposite: score.composite,
      chapterDoctorScore: doctor.afterScore,
      criticalIssues: score.criticalCount,
      optionalIssues: score.optionalCount,
      readerCuriosity: score.dimensions.readerCuriosity,
      readerRetention: score.dimensions.readerRetentionSim,
      characterConsistency: score.dimensions.behavioralConsistency,
      narrativeMemoryHealth: supremeMemoryReport.narrativeHealth,
      canonProtectionPass: canonProtection.passesGate,
      clicheDensity: score.dimensions.clicheDensity,
      passesPreDelivery: score.passesPreDelivery,
      greatnessComposite: greatness.composite,
      greatnessMemorability: greatness.dimensions.memorability,
      greatnessBingeability: greatness.dimensions.bingeability,
      greatnessHookIntensity: greatness.dimensions.hookIntensity,
      narrativeMagicComposite: narrativeMagic.composite,
      narrativeMagicWonder: narrativeMagic.dimensions.wonder,
      narrativeMagicQuotePotential: narrativeMagic.dimensions.quotePotential,
      problems: countProblems({
        payoffMissing: payoffAnalysis.missingPayoffCount,
        clicheHits: clicheScan.hits.length,
        explainedEmotions: subtextAnalysis.metrics.explainedEmotion,
        behavioralViolations: behavioralConsistency.violations.filter(v => v.severity === "critical").length,
        artificialDialogue: dialogueHumanity.metrics.therapistDialogueLines + dialogueHumanity.metrics.perfectDialogueLines,
        forgottenPromises: supremeMemoryReport.openPromises,
      }),
    },
  };
}
