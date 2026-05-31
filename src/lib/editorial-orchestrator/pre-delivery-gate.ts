import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import { analyzeBehavioralConsistency } from "@/lib/behavioral-consistency";
import { autoRewriteCliches } from "@/lib/cliche-engine";
import {
  buildCharacterIntentSheets,
  buildCharacterSupremacyProfiles,
  detectPresentCharacters,
} from "@/lib/character-supremacy";
import { analyzeDialogueHumanity, enhanceDialogueHumanity } from "@/lib/dialogue-humanity";
import { analyzeEmotionalRealism, applyEmotionalRealismMicroRewrite } from "@/lib/emotional-realism-gate";
import { humanizeNarrativeText } from "@/lib/HumanizerLayer";
import { evaluateChapterBestsellerIntel } from "@/lib/bestseller-intelligence";
import { buildPromiseRegistryFromChapters, trackNarrativePromises } from "@/lib/narrative-promise-engine";
import { analyzeChapterScenePurpose } from "@/lib/narrative-intelligence-v2/scene-purpose";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";
import { analyzePayoff } from "@/lib/payoff-engine";
import { applyMicroReaderRewrite, simulateReaderInLoop } from "@/lib/reader-simulation";
import { analyzeSubtext, rewriteExplainedEmotion } from "@/lib/subtext-engine";
import { analyzeTensionV2 } from "@/lib/tension-engine-v2";
import type {
  EditorialIntentSheet,
  PreDeliveryPhaseBIntel,
  PreDeliveryPhaseCIntel,
  SupremeEditorialSnapshot,
} from "./types";
import { computeSupremeEditorialScore } from "./supreme-score";

const MAX_GATE_PASSES = 3;

function runPhaseCAnalysis(input: {
  content: string;
  config: BookConfig;
  blueprint?: BookBlueprint;
  chapterIndex: number;
  totalChapters: number;
  previousChapters?: Chapter[];
  longBookMemory?: import("@/lib/long-book-memory/types").LongBookMemorySnapshot;
}) {
  const profiles = buildCharacterSupremacyProfiles({
    config: input.config,
    blueprint: input.blueprint,
    chapters: [...(input.previousChapters || []), { title: "", content: input.content, subchapters: [] }],
    longBookMemory: input.longBookMemory,
  });
  const present = detectPresentCharacters(input.content, profiles);
  const characterIntentSheets = buildCharacterIntentSheets({
    profiles,
    chapterIndex: input.chapterIndex,
    presentOnly: present.length ? present : profiles.slice(0, 4),
  });

  const behavioralConsistency = analyzeBehavioralConsistency({
    content: input.content,
    chapterIndex: input.chapterIndex,
    previousChapters: input.previousChapters,
    profiles,
  });
  const subtextAnalysis = analyzeSubtext({ content: input.content, chapterIndex: input.chapterIndex });
  const tensionV2 = analyzeTensionV2({
    content: input.content,
    chapterIndex: input.chapterIndex,
    config: input.config,
    profiles,
  });
  const dialogueHumanity = analyzeDialogueHumanity({ content: input.content, chapterIndex: input.chapterIndex });
  const emotionalRealism = analyzeEmotionalRealism({
    content: input.content,
    chapterIndex: input.chapterIndex,
    profiles,
    behavioral: behavioralConsistency,
    subtext: subtextAnalysis,
    tension: tensionV2,
    dialogue: dialogueHumanity,
  });

  return {
    profiles,
    characterIntentSheets,
    behavioralConsistency,
    subtextAnalysis,
    tensionV2,
    dialogueHumanity,
    emotionalRealism,
  };
}

export function runPreDeliveryGate(input: {
  chapter: Chapter;
  config: BookConfig;
  blueprint?: BookBlueprint;
  chapterIndex: number;
  totalChapters: number;
  intent: EditorialIntentSheet;
  previousChapters?: Chapter[];
  outlineSummary?: string;
  longBookMemory?: import("@/lib/long-book-memory/types").LongBookMemorySnapshot;
}): { chapter: Chapter; snapshot: SupremeEditorialSnapshot } {
  let content = input.chapter.content;
  let autocorrectApplied = false;
  let clicheRewriteApplied = false;
  let readerRewriteApplied = false;
  let subtextRewriteApplied = false;
  let dialogueRewriteApplied = false;
  let emotionalRewriteApplied = false;
  let gatePasses = 0;

  let phaseC = runPhaseCAnalysis({ ...input, content });
  let { profiles, characterIntentSheets } = phaseC;

  let clicheScan = autoRewriteCliches(content, input.config.genre).scan;
  let narrativePromises = trackNarrativePromises({
    content,
    chapterIndex: input.chapterIndex,
    genre: input.config.genre,
    previousRegistry: input.previousChapters?.length
      ? buildPromiseRegistryFromChapters(input.previousChapters, input.config.genre, input.longBookMemory)
      : undefined,
  });
  let payoffAnalysis = analyzePayoff({
    content,
    chapterIndex: input.chapterIndex,
    config: input.config,
  });
  let scenePurpose = analyzeChapterScenePurpose({
    content,
    chapterIndex: input.chapterIndex,
    config: input.config,
  });
  let readerSimulation = simulateReaderInLoop({
    content,
    chapterIndex: input.chapterIndex,
    config: input.config,
    totalChapters: input.totalChapters,
    scenePurpose,
  });

  let score = computeSupremeEditorialScore({
    content,
    config: input.config,
    chapterIndex: input.chapterIndex,
    totalChapters: input.totalChapters,
    marketFloor: input.intent.marketFloor,
    clicheScan,
    readerSimulation,
    narrativePromises,
    payoffAnalysis,
    behavioralConsistency: phaseC.behavioralConsistency,
    subtextAnalysis: phaseC.subtextAnalysis,
    tensionV2: phaseC.tensionV2,
    dialogueHumanity: phaseC.dialogueHumanity,
    emotionalRealism: phaseC.emotionalRealism,
    characterProfiles: profiles,
  });

  while (!score.passesPreDelivery && gatePasses < MAX_GATE_PASSES) {
    gatePasses += 1;
    let changed = false;

    const clichePass = autoRewriteCliches(content, input.config.genre);
    if (clichePass.rewritten) {
      content = clichePass.content;
      clicheScan = clichePass.scan;
      clicheRewriteApplied = true;
      changed = true;
    }

    phaseC = runPhaseCAnalysis({ ...input, content });

    if (!phaseC.subtextAnalysis.passesGate && phaseC.subtextAnalysis.metrics.explainedEmotion > 0) {
      content = rewriteExplainedEmotion(content, phaseC.subtextAnalysis);
      subtextRewriteApplied = true;
      changed = true;
    }

    if (!phaseC.dialogueHumanity.passesGate) {
      content = enhanceDialogueHumanity(content);
      dialogueRewriteApplied = true;
      changed = true;
    }

    if (!phaseC.emotionalRealism.passesGate) {
      content = applyEmotionalRealismMicroRewrite(content, phaseC.emotionalRealism, {
        config: input.config,
        previousChapters: input.previousChapters,
        chapterIndex: input.chapterIndex,
        outlineSummary: input.outlineSummary,
        subtext: phaseC.subtextAnalysis,
      });
      emotionalRewriteApplied = true;
      changed = true;
    }

    readerSimulation = simulateReaderInLoop({
      content,
      chapterIndex: input.chapterIndex,
      config: input.config,
      totalChapters: input.totalChapters,
      scenePurpose,
    });

    if (!readerSimulation.passesGate && readerSimulation.abandonmentRisk !== "low") {
      content = applyMicroReaderRewrite(content, readerSimulation, {
        config: input.config,
        previousChapters: input.previousChapters,
        chapterIndex: input.chapterIndex,
        outlineSummary: input.outlineSummary,
      });
      readerRewriteApplied = true;
      changed = true;
    }

    if (score.criticalCount > 0 && score.criticalCount <= 6) {
      content = humanizeNarrativeText(content, {
        config: input.config,
        previousChapters: input.previousChapters,
        chapterIndex: input.chapterIndex,
        outlineSummary: input.outlineSummary,
      });
      autocorrectApplied = true;
      changed = true;
    }

    if (!changed) break;

    phaseC = runPhaseCAnalysis({ ...input, content });
    profiles = phaseC.profiles;
    characterIntentSheets = phaseC.characterIntentSheets;

    clicheScan = autoRewriteCliches(content, input.config.genre).scan;
    narrativePromises = trackNarrativePromises({
      content,
      chapterIndex: input.chapterIndex,
      genre: input.config.genre,
      previousRegistry: input.previousChapters?.length
        ? buildPromiseRegistryFromChapters(input.previousChapters, input.config.genre, input.longBookMemory)
        : undefined,
    });
    payoffAnalysis = analyzePayoff({
      content,
      chapterIndex: input.chapterIndex,
      config: input.config,
    });
    scenePurpose = analyzeChapterScenePurpose({
      content,
      chapterIndex: input.chapterIndex,
      config: input.config,
    });
    readerSimulation = simulateReaderInLoop({
      content,
      chapterIndex: input.chapterIndex,
      config: input.config,
      totalChapters: input.totalChapters,
      scenePurpose,
    });

    score = computeSupremeEditorialScore({
      content,
      config: input.config,
      chapterIndex: input.chapterIndex,
      totalChapters: input.totalChapters,
      marketFloor: input.intent.marketFloor,
      clicheScan,
      readerSimulation,
      narrativePromises,
      payoffAnalysis,
      behavioralConsistency: phaseC.behavioralConsistency,
      subtextAnalysis: phaseC.subtextAnalysis,
      tensionV2: phaseC.tensionV2,
      dialogueHumanity: phaseC.dialogueHumanity,
      emotionalRealism: phaseC.emotionalRealism,
      characterProfiles: profiles,
    });
  }

  const phaseB: PreDeliveryPhaseBIntel = {
    clicheScan,
    clicheRewriteApplied,
    readerSimulation,
    readerRewriteApplied,
    narrativePromises,
    payoffAnalysis,
    gatePasses,
  };

  const phaseCIntel: PreDeliveryPhaseCIntel = {
    characterIntentSheets,
    behavioralConsistency: phaseC.behavioralConsistency,
    subtextAnalysis: phaseC.subtextAnalysis,
    subtextRewriteApplied,
    tensionV2: phaseC.tensionV2,
    dialogueHumanity: phaseC.dialogueHumanity,
    dialogueRewriteApplied,
    emotionalRealism: phaseC.emotionalRealism,
    emotionalRewriteApplied,
  };

  scenePurpose = analyzeChapterScenePurpose({
    content,
    chapterIndex: input.chapterIndex,
    config: input.config,
  });

  const readerEmotionState = simulateReaderEmotion({
    content,
    chapterIndex: input.chapterIndex,
    config: input.config,
    scenePurpose,
    totalChapters: input.totalChapters,
  });

  const snapshot: SupremeEditorialSnapshot = {
    intent: { ...input.intent, characterIntentSheets },
    score,
    autocorrectApplied,
    evaluatedAt: new Date().toISOString(),
    phaseB,
    phaseC: phaseCIntel,
  };

  if (typeof console !== "undefined" && import.meta.env.DEV) {
    console.info(
      `[EditorialOrchestrator] Ch${input.chapterIndex + 1}: composite ${score.composite}/100` +
        ` · critical ${score.criticalCount} · optional ${score.optionalCount}` +
        ` · chars ${characterIntentSheets.length}` +
        ` · subtext ${phaseC.subtextAnalysis.subtextScore}` +
        ` · behavior ${phaseC.behavioralConsistency.consistencyScore}` +
        (emotionalRewriteApplied ? " · emotional rewrite" : ""),
    );
  }

  return {
    chapter: {
      ...input.chapter,
      content,
      supremeEditorialIntel: snapshot,
      scenePurposeIntel: scenePurpose,
      readerEmotionState,
      bestsellerIntel: evaluateChapterBestsellerIntel({
        config: input.config,
        chapterIndex: input.chapterIndex,
        content,
      }),
    },
    snapshot,
  };
}
