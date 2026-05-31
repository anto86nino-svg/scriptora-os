import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import { analyzeBehavioralConsistency, applyBehavioralMicroRewrite } from "@/lib/behavioral-consistency";
import { autoRewriteCliches } from "@/lib/cliche-engine";
import {
  buildCharacterIntentSheets,
  buildCharacterSupremacyProfiles,
  detectPresentCharacters,
} from "@/lib/character-supremacy";
import { analyzeDialogueHumanity, enhanceDialogueHumanity } from "@/lib/dialogue-humanity";
import { analyzeEmotionalRealism, applyEmotionalRealismMicroRewrite } from "@/lib/emotional-realism-gate";
import { humanizeNarrativeText } from "@/lib/HumanizerLayer";
import {
  runGreatnessElevationPass,
  computeGreatnessScore,
  applyHookMicroRewrite,
  applyBingeabilityMicroRewrite,
} from "@/lib/greatness-engine";
import { applySceneElevations } from "@/lib/greatness-engine/scene-elevator";
import { evaluateChapterBestsellerIntel } from "@/lib/bestseller-intelligence";
import { runMasterpiecePass } from "@/lib/masterpiece-engine";
import {
  analyzeCanonProtection,
  buildNarrativeMemoryCore,
  generateSupremeMemoryReport,
  memoryCoreToPromiseRegistry,
} from "@/lib/narrative-memory-core";
import { analyzeChapterScenePurpose } from "@/lib/narrative-intelligence-v2/scene-purpose";
import { applyScenePurposeMicroRewrite } from "@/lib/narrative-intelligence-v2/scene-purpose-rewrite";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";
import { analyzePayoff, applyPayoffMicroRewrite } from "@/lib/payoff-engine";
import { applyMicroReaderRewrite, simulateReaderInLoop, applyEngagementTargetRewrite } from "@/lib/reader-simulation";
import { analyzeSubtext, rewriteExplainedEmotion } from "@/lib/subtext-engine";
import { analyzeTensionV2 } from "@/lib/tension-engine-v2";
import type {
  EditorialIntentSheet,
  PreDeliveryPhaseBIntel,
  PreDeliveryPhaseCIntel,
  PreDeliveryPhaseDIntel,
  PreDeliveryPhaseEIntel,
  PreDeliveryPhaseFIntel,
  SupremeEditorialSnapshot,
} from "./types";
import { computeSupremeEditorialScore } from "./supreme-score";

const MAX_GATE_PASSES = 3;

function weightedReaderEngagement(input: {
  content: string;
  chapterIndex: number;
  config: BookConfig;
  totalChapters?: number;
}): number {
  const scenePurpose = analyzeChapterScenePurpose({
    content: input.content,
    chapterIndex: input.chapterIndex,
    config: input.config,
  });
  const reader = simulateReaderEmotion({
    content: input.content,
    chapterIndex: input.chapterIndex,
    config: input.config,
    scenePurpose,
    totalChapters: input.totalChapters,
  });
  return reader.curiosity * 0.45 + reader.compulsiveReadability * 0.55;
}

function buildMemoryAndPromises(input: {
  config: BookConfig;
  blueprint?: BookBlueprint;
  previousChapters?: Chapter[];
  content: string;
  chapterIndex: number;
  longBookMemory?: import("@/lib/long-book-memory/types").LongBookMemorySnapshot;
}) {
  const chapters = [...(input.previousChapters || []), { title: "", content: input.content, subchapters: [] }];
  const narrativeMemory = buildNarrativeMemoryCore({
    config: input.config,
    blueprint: input.blueprint,
    chapters,
  });
  const narrativePromises = memoryCoreToPromiseRegistry(narrativeMemory);
  const canonProtection = analyzeCanonProtection({
    content: input.content,
    config: input.config,
    blueprint: input.blueprint,
    memory: narrativeMemory,
    previousChapters: input.previousChapters,
  });
  const supremeMemoryReport = generateSupremeMemoryReport(narrativeMemory);
  return { narrativeMemory, narrativePromises, canonProtection, supremeMemoryReport };
}

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
  let payoffRewriteApplied = false;
  let behavioralRewriteApplied = false;
  let scenePurposeRewriteApplied = false;
  let gatePasses = 0;

  let phaseC = runPhaseCAnalysis({ ...input, content });
  let { profiles, characterIntentSheets } = phaseC;

  let clicheScan = autoRewriteCliches(content, input.config.genre).scan;
  let phaseD = buildMemoryAndPromises({ ...input, content });
  let narrativePromises = phaseD.narrativePromises;
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
    canonProtection: phaseD.canonProtection,
    supremeMemoryReport: phaseD.supremeMemoryReport,
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

    if (payoffAnalysis.missingPayoffCount > 0) {
      content = applyPayoffMicroRewrite(content, payoffAnalysis);
      payoffRewriteApplied = true;
      changed = true;
    }

    if (phaseC.behavioralConsistency.violations.some(v => v.severity === "critical")) {
      content = applyBehavioralMicroRewrite(content, phaseC.behavioralConsistency);
      behavioralRewriteApplied = true;
      changed = true;
    }

    if (clicheScan.criticalCount > 0) {
      const clichePass = autoRewriteCliches(content, input.config.genre);
      if (clichePass.rewritten) {
        content = clichePass.content;
        clicheScan = clichePass.scan;
        clicheRewriteApplied = true;
        changed = true;
      }
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
    } else if (readerSimulation.curiosity < 70) {
      content = applyMicroReaderRewrite(content, readerSimulation, {
        config: input.config,
        previousChapters: input.previousChapters,
        chapterIndex: input.chapterIndex,
        outlineSummary: input.outlineSummary,
      });
      readerRewriteApplied = true;
      changed = true;
    }

    if (scenePurpose.overallHealth === "weak") {
      content = applyScenePurposeMicroRewrite(content, scenePurpose, input.config);
      scenePurposeRewriteApplied = true;
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
    phaseD = buildMemoryAndPromises({ ...input, content });
    narrativePromises = phaseD.narrativePromises;
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
      canonProtection: phaseD.canonProtection,
      supremeMemoryReport: phaseD.supremeMemoryReport,
    });
  }

  const greatnessPass = runGreatnessElevationPass({
    content,
    config: input.config,
    chapterIndex: input.chapterIndex,
    totalChapters: input.totalChapters,
    intent: input.intent,
    previousChapters: input.previousChapters,
  });

  if (greatnessPass.rewritten) {
    content = greatnessPass.content;
    phaseC = runPhaseCAnalysis({ ...input, content });
    profiles = phaseC.profiles;
    characterIntentSheets = phaseC.characterIntentSheets;
    clicheScan = autoRewriteCliches(content, input.config.genre).scan;
    phaseD = buildMemoryAndPromises({ ...input, content });
    narrativePromises = phaseD.narrativePromises;
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
  }

  const phaseE: PreDeliveryPhaseEIntel = {
    greatnessAnalysis: greatnessPass.analysis,
    elevationRewriteApplied: greatnessPass.rewritten,
    elevatesApplied: greatnessPass.elevatesApplied,
    greatnessBefore: greatnessPass.beforeScore.composite,
    greatnessAfter: greatnessPass.afterScore.composite,
  };

  const masterpiecePass = runMasterpiecePass({
    content,
    config: input.config,
    chapterIndex: input.chapterIndex,
    totalChapters: input.totalChapters,
    intent: input.intent,
    previousChapters: input.previousChapters,
  });

  if (masterpiecePass.rewritten) {
    content = masterpiecePass.content;
    phaseC = runPhaseCAnalysis({ ...input, content });
    profiles = phaseC.profiles;
    characterIntentSheets = phaseC.characterIntentSheets;
    clicheScan = autoRewriteCliches(content, input.config.genre).scan;
    phaseD = buildMemoryAndPromises({ ...input, content });
    narrativePromises = phaseD.narrativePromises;
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
  }

  if (payoffAnalysis.missingPayoffCount > 0) {
    content = applyPayoffMicroRewrite(content, payoffAnalysis);
    payoffAnalysis = analyzePayoff({
      content,
      chapterIndex: input.chapterIndex,
      config: input.config,
    });
    payoffRewriteApplied = true;
  }

  if (phaseC.behavioralConsistency.violations.some(v => v.severity === "critical")) {
    content = applyBehavioralMicroRewrite(content, phaseC.behavioralConsistency);
    phaseC = runPhaseCAnalysis({ ...input, content });
    profiles = phaseC.profiles;
    characterIntentSheets = phaseC.characterIntentSheets;
    behavioralRewriteApplied = true;
  }

  if (clicheScan.criticalCount > 0) {
    const clichePass = autoRewriteCliches(content, input.config.genre);
    content = clichePass.content;
    clicheScan = clichePass.scan;
    if (clichePass.rewritten) clicheRewriteApplied = true;
  }

  if (payoffRewriteApplied || behavioralRewriteApplied || scenePurposeRewriteApplied) {
    phaseD = buildMemoryAndPromises({ ...input, content });
    narrativePromises = phaseD.narrativePromises;
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
  }

  scenePurpose = analyzeChapterScenePurpose({
    content,
    chapterIndex: input.chapterIndex,
    config: input.config,
  });
  if (scenePurpose.overallHealth === "weak") {
    content = applyScenePurposeMicroRewrite(content, scenePurpose, input.config);
    scenePurpose = analyzeChapterScenePurpose({
      content,
      chapterIndex: input.chapterIndex,
      config: input.config,
    });
    scenePurposeRewriteApplied = true;
  }

  readerSimulation = simulateReaderInLoop({
    content,
    chapterIndex: input.chapterIndex,
    config: input.config,
    totalChapters: input.totalChapters,
    scenePurpose,
  });
  if (readerSimulation.curiosity < 70) {
    content = applyMicroReaderRewrite(content, readerSimulation, {
      config: input.config,
      previousChapters: input.previousChapters,
      chapterIndex: input.chapterIndex,
      outlineSummary: input.outlineSummary,
    });
    readerSimulation = simulateReaderInLoop({
      content,
      chapterIndex: input.chapterIndex,
      config: input.config,
      totalChapters: input.totalChapters,
      scenePurpose: analyzeChapterScenePurpose({
        content,
        chapterIndex: input.chapterIndex,
        config: input.config,
      }),
    });
    readerRewriteApplied = true;
  }

  const hookMin = input.intent.marketFloor?.hookMin ?? 52;
  const hookCheck = evaluateChapterBestsellerIntel({
    config: input.config,
    chapterIndex: input.chapterIndex,
    content,
  });
  if (hookCheck.scores.hookStrength < hookMin) {
    content = applyHookMicroRewrite(content);
    readerRewriteApplied = true;
  }

  const pullGreatness = computeGreatnessScore({
    content,
    config: input.config,
    chapterIndex: input.chapterIndex,
  });
  const bingeTarget = pullGreatness.greatnessScore.dimensions.bingeability;
  if (readerSimulation.curiosity < 70 || readerSimulation.retention < 55 || bingeTarget < 70) {
    content = applyEngagementTargetRewrite(content, input.config);
    content = applyBingeabilityMicroRewrite(content, {
      config: input.config,
      chapterIndex: input.chapterIndex,
    });
    const forced = applySceneElevations(content, pullGreatness, true);
    if (forced.applied > 0) {
      content = forced.content;
    }
    readerRewriteApplied = true;
    readerSimulation = simulateReaderInLoop({
      content,
      chapterIndex: input.chapterIndex,
      config: input.config,
      totalChapters: input.totalChapters,
      scenePurpose: analyzeChapterScenePurpose({
        content,
        chapterIndex: input.chapterIndex,
        config: input.config,
      }),
    });
  }

  for (let pass = 0; pass < 3 && weightedReaderEngagement({
    content,
    chapterIndex: input.chapterIndex,
    config: input.config,
    totalChapters: input.totalChapters,
  }) < 70; pass++) {
    content = applyEngagementTargetRewrite(content, input.config);
    content = applyHookMicroRewrite(content);
    content = applyBingeabilityMicroRewrite(content, {
      config: input.config,
      chapterIndex: input.chapterIndex,
    });
    readerRewriteApplied = true;
  }

  scenePurpose = analyzeChapterScenePurpose({
    content,
    chapterIndex: input.chapterIndex,
    config: input.config,
  });
  for (let scenePass = 0; scenePass < 2 && scenePurpose.overallHealth === "weak"; scenePass++) {
    content = applyScenePurposeMicroRewrite(content, scenePurpose, input.config);
    scenePurposeRewriteApplied = true;
    readerRewriteApplied = true;
    scenePurpose = analyzeChapterScenePurpose({
      content,
      chapterIndex: input.chapterIndex,
      config: input.config,
    });
  }

  if (readerRewriteApplied) {
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
  }

  if (payoffRewriteApplied || behavioralRewriteApplied || scenePurposeRewriteApplied || readerRewriteApplied) {
    phaseD = buildMemoryAndPromises({ ...input, content });
    narrativePromises = phaseD.narrativePromises;
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
  }

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
    canonProtection: phaseD.canonProtection,
    supremeMemoryReport: phaseD.supremeMemoryReport,
    greatnessAnalysis: greatnessPass.analysis,
    masterpieceAnalysis: masterpiecePass.analysis,
  });

  const phaseF: PreDeliveryPhaseFIntel = {
    masterpieceAnalysis: masterpiecePass.analysis,
    masterpieceRewriteApplied: masterpiecePass.rewritten,
    selectedDraft: masterpiecePass.selectedDraft,
    microElevationsApplied: masterpiecePass.microElevationsApplied,
    narrativeMagicBefore: masterpiecePass.beforeMagic,
    narrativeMagicAfter: masterpiecePass.afterMagic,
  };

  const finalGreatnessAnalysis = computeGreatnessScore({
    content,
    config: input.config,
    chapterIndex: input.chapterIndex,
  });
  phaseE.greatnessAfter = finalGreatnessAnalysis.greatnessScore.composite;
  phaseE.greatnessAnalysis = finalGreatnessAnalysis;

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

  const phaseDIntel: PreDeliveryPhaseDIntel = {
    narrativeMemory: phaseD.narrativeMemory,
    canonProtection: phaseD.canonProtection,
    supremeMemoryReport: phaseD.supremeMemoryReport,
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
    phaseD: phaseDIntel,
    phaseE,
    phaseF,
    greatnessScore: phaseE.greatnessAfter,
    narrativeMagicScore: phaseF.narrativeMagicAfter,
  };

  if (typeof console !== "undefined" && import.meta.env.DEV) {
    console.info(
      `[EditorialOrchestrator] Ch${input.chapterIndex + 1}: composite ${score.composite}/100` +
        ` · critical ${score.criticalCount} · optional ${score.optionalCount}` +
        ` · memory health ${phaseD.supremeMemoryReport.narrativeHealth}` +
        ` · open promises ${phaseD.supremeMemoryReport.openPromises}` +
        ` · chars ${characterIntentSheets.length}` +
        ` · subtext ${phaseC.subtextAnalysis.subtextScore}` +
        ` · behavior ${phaseC.behavioralConsistency.consistencyScore}` +
        ` · greatness ${phaseE.greatnessAfter}` +
        ` · magic ${phaseF.narrativeMagicAfter}` +
        (phaseF.masterpieceRewriteApplied ? ` · draft ${phaseF.selectedDraft}` : "") +
        (phaseE.elevationRewriteApplied ? " · elevation pass" : "") +
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
