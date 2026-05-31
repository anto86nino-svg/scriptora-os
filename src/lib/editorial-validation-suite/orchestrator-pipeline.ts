import type { Chapter } from "@/types/book";
import { analyzeBehavioralConsistency } from "@/lib/behavioral-consistency";
import { scanCliches } from "@/lib/cliche-engine";
import { buildCharacterSupremacyProfiles } from "@/lib/character-supremacy";
import { computeDevelopmentalEditReport } from "@/lib/chapter-doctor-pro";
import { analyzeDialogueHumanity } from "@/lib/dialogue-humanity";
import { buildEditorialIntentSheet } from "@/lib/editorial-orchestrator/intent-sheet";
import { runPreDeliveryGate } from "@/lib/editorial-orchestrator/pre-delivery-gate";
import { humanizeChapter } from "@/lib/HumanizerLayer";
import { analyzePayoff } from "@/lib/payoff-engine";
import { analyzeSubtext } from "@/lib/subtext-engine";
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

/** Post A+B+C+D: humanize + pre-delivery gate with full orchestrator. */
export function evaluateOrchestratorChapter(input: {
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

  const intent = buildEditorialIntentSheet({
    config,
    blueprint,
    chapterIndex: input.chapterIndex,
    chapterTitle: input.title,
    chapterSummary: blueprint.chapterOutlines[input.chapterIndex]?.summary || "",
    previousChapters: input.previousChapters,
  });

  const { chapter, snapshot } = runPreDeliveryGate({
    chapter: humanized,
    config,
    blueprint,
    chapterIndex: input.chapterIndex,
    totalChapters: 10,
    intent,
    previousChapters: input.previousChapters,
    outlineSummary: intent.chapterTitle,
  });

  const content = chapter.content;
  const score = snapshot.score;
  const cliche = snapshot.phaseB?.clicheScan || scanCliches(content, input.genre);
  const subtext = snapshot.phaseC?.subtextAnalysis || analyzeSubtext({ content, chapterIndex: input.chapterIndex });
  const payoff = snapshot.phaseB?.payoffAnalysis || analyzePayoff({ content, chapterIndex: input.chapterIndex, config });
  const dialogue = snapshot.phaseC?.dialogueHumanity || analyzeDialogueHumanity({ content, chapterIndex: input.chapterIndex });
  const behavioral = snapshot.phaseC?.behavioralConsistency || analyzeBehavioralConsistency({
    content,
    chapterIndex: input.chapterIndex,
    previousChapters: input.previousChapters,
    profiles: buildCharacterSupremacyProfiles({ config, blueprint, chapters: [...input.previousChapters, chapter] }),
  });

  const doctor = computeDevelopmentalEditReport({
    originalText: input.rawContent,
    patchedText: content,
    patches: [],
    modificationPercent: Math.round(
      (Math.abs(content.length - input.rawContent.length) / Math.max(1, input.rawContent.length)) * 100,
    ),
    chapterIndex: input.chapterIndex,
    totalChapters: 10,
    chapterTitle: input.title,
    genre: input.genre,
  });

  const memoryHealth = snapshot.phaseD?.supremeMemoryReport.narrativeHealth ?? score.dimensions.narrativePromiseIntegrity;
  const forgottenPromises = snapshot.phaseD?.supremeMemoryReport.openPromises ?? snapshot.phaseB?.narrativePromises.openCount ?? 0;
  const greatnessScore =
    snapshot.phaseE?.greatnessAnalysis.greatnessScore ??
    (typeof snapshot.greatnessScore === "number"
      ? { composite: snapshot.greatnessScore, dimensions: { memorability: 0, bingeability: 0, hookIntensity: 0 } }
      : undefined);
  const narrativeMagic = snapshot.phaseF?.masterpieceAnalysis.narrativeMagic;

  return {
    deliveredChapter: chapter,
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
      narrativeMemoryHealth: memoryHealth,
      canonProtectionPass: snapshot.phaseD?.canonProtection.passesGate ?? true,
      clicheDensity: score.dimensions.clicheDensity,
      passesPreDelivery: score.passesPreDelivery,
      greatnessComposite: greatnessScore?.composite ?? 0,
      greatnessMemorability: greatnessScore?.dimensions.memorability ?? 0,
      greatnessBingeability: greatnessScore?.dimensions.bingeability ?? 0,
      greatnessHookIntensity: greatnessScore?.dimensions.hookIntensity ?? 0,
      narrativeMagicComposite: narrativeMagic?.composite ?? snapshot.narrativeMagicScore ?? 0,
      narrativeMagicWonder: narrativeMagic?.dimensions.wonder ?? 0,
      narrativeMagicQuotePotential: narrativeMagic?.dimensions.quotePotential ?? 0,
      problems: countProblems({
        payoffMissing: payoff.missingPayoffCount,
        clicheHits: cliche.hits.length,
        explainedEmotions: subtext.metrics.explainedEmotion,
        behavioralViolations: behavioral.violations.filter(v => v.severity === "critical").length,
        artificialDialogue: dialogue.metrics.therapistDialogueLines + dialogue.metrics.perfectDialogueLines,
        forgottenPromises,
      }),
    },
  };
}
