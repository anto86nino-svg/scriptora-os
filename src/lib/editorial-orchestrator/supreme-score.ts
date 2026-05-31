import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateChapterBestsellerIntel } from "@/lib/bestseller-intelligence";
import type { ClicheScanResult } from "@/lib/cliche-engine";
import { validateEditorial } from "@/lib/editorial-validator";
import type { NarrativePromiseRegistry } from "@/lib/narrative-promise-engine";
import { analyzeChapterScenePurpose } from "@/lib/narrative-intelligence-v2/scene-purpose";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";
import type { ReaderEmotionLevel } from "@/lib/narrative-intelligence-v2/types";
import type { BehavioralConsistencyReport } from "@/lib/behavioral-consistency";
import type { CharacterSupremacyProfile } from "@/lib/character-supremacy";
import type { DialogueHumanityReport } from "@/lib/dialogue-humanity";
import type { EmotionalRealismReport } from "@/lib/emotional-realism-gate";
import type { SubtextAnalysis } from "@/lib/subtext-engine";
import type { TensionEngineV2Snapshot } from "@/lib/tension-engine-v2";
import type { PayoffAnalysis } from "@/lib/payoff-engine";
import type { ReaderSimulationSnapshot } from "@/lib/reader-simulation";
import type { BookConfig } from "@/types/book";
import type { SupremeEditorialIssue, SupremeEditorialScore } from "./types";

const CRITICAL_VALIDATOR_KINDS = new Set([
  "ai-cliche",
  "weak-opening",
  "throat-clearing",
]);

const EMPTY_DIMENSIONS = {
  emotionalRealism: 0,
  dialogueHumanity: 0,
  subtextStrength: 0,
  narrativeTension: 0,
  commercialReadability: 0,
  readerRetention: 0,
  marketPotential: 0,
  bookTokPotential: 0,
  voiceAuthenticity: 0,
  hookStrength: 0,
  readerCuriosity: 0,
  readerRetentionSim: 0,
  narrativePromiseIntegrity: 0,
  payoffStrength: 0,
  clicheDensity: 0,
  characterDepth: 0,
  behavioralConsistency: 0,
  relationshipTension: 0,
};

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelFromScore(score: number): ReaderEmotionLevel {
  if (score >= 68) return "high";
  if (score >= 38) return "medium";
  return "low";
}

export function computeSupremeEditorialScore(input: {
  content: string;
  config: BookConfig;
  chapterIndex: number;
  totalChapters: number;
  marketFloor?: { hookMin: number; bingeMin: number };
  clicheScan?: ClicheScanResult;
  readerSimulation?: ReaderSimulationSnapshot;
  narrativePromises?: NarrativePromiseRegistry;
  payoffAnalysis?: PayoffAnalysis;
  behavioralConsistency?: BehavioralConsistencyReport;
  subtextAnalysis?: SubtextAnalysis;
  tensionV2?: TensionEngineV2Snapshot;
  dialogueHumanity?: DialogueHumanityReport;
  emotionalRealism?: EmotionalRealismReport;
  characterProfiles?: CharacterSupremacyProfile[];
}): SupremeEditorialScore {
  const text = String(input.content || "").trim();
  const issues: SupremeEditorialIssue[] = [];

  if (text.split(/\s+/).filter(Boolean).length < 40) {
    return {
      composite: 0,
      dimensions: { ...EMPTY_DIMENSIONS },
      criticalCount: 1,
      optionalCount: 0,
      issues: [{ code: "too_short", severity: "critical", message: "Chapter too short for evaluation", dimension: "commercialReadability" }],
      passesPreDelivery: false,
    };
  }

  const editorial = analyzeNovel(text);
  const validator = validateEditorial(text);
  const bestseller = evaluateChapterBestsellerIntel({
    config: input.config,
    chapterIndex: input.chapterIndex,
    content: text,
  });
  const scenePurpose = analyzeChapterScenePurpose({
    content: text,
    chapterIndex: input.chapterIndex,
    config: input.config,
  });
  const reader = simulateReaderEmotion({
    content: text,
    chapterIndex: input.chapterIndex,
    config: input.config,
    scenePurpose,
    totalChapters: input.totalChapters,
  });

  const readerSim = input.readerSimulation;
  const clicheScan = input.clicheScan;
  const promises = input.narrativePromises;
  const payoff = input.payoffAnalysis;
  const behavioral = input.behavioralConsistency;
  const subtext = input.subtextAnalysis;
  const tensionV2 = input.tensionV2;
  const dialogue = input.dialogueHumanity;
  const emotionalRealism = input.emotionalRealism;
  const profiles = input.characterProfiles || [];

  for (const issue of validator.issues) {
    const severity = CRITICAL_VALIDATOR_KINDS.has(issue.kind) ? "critical" : "optional";
    issues.push({
      code: `validator_${issue.kind}`,
      severity,
      message: issue.detail,
      dimension: severity === "critical" ? "voiceAuthenticity" : "commercialReadability",
    });
  }

  for (const warning of editorial.warnings.filter(w => w.severity === "high")) {
    issues.push({
      code: `editorial_${warning.type}`,
      severity: "critical",
      message: warning.message,
      dimension: "emotionalRealism",
    });
  }

  for (const warning of editorial.warnings.filter(w => w.severity === "medium")) {
    issues.push({
      code: `editorial_${warning.type}`,
      severity: "optional",
      message: warning.message,
      dimension: "dialogueHumanity",
    });
  }

  const hookMin = input.marketFloor?.hookMin ?? 52;
  const bingeMin = input.marketFloor?.bingeMin ?? 46;

  if (bestseller.scores.hookStrength < hookMin) {
    issues.push({
      code: "weak_hook",
      severity: "critical",
      message: `Hook strength ${bestseller.scores.hookStrength} below floor ${hookMin}`,
      dimension: "hookStrength",
    });
  }

  if (bestseller.scores.bingeability < bingeMin) {
    issues.push({
      code: "weak_binge",
      severity: "optional",
      message: `Binge pull ${bestseller.scores.bingeability} below target ${bingeMin}`,
      dimension: "readerRetention",
    });
  }

  if (scenePurpose.overallHealth === "weak") {
    issues.push({
      code: "weak_scene_health",
      severity: "critical",
      message: "One or more scenes lack clear purpose or conflict",
      dimension: "narrativeTension",
    });
  } else if (scenePurpose.overallHealth === "at-risk") {
    issues.push({
      code: "scene_at_risk",
      severity: "optional",
      message: "Scene purpose map is uneven — some beats feel decorative",
      dimension: "narrativeTension",
    });
  }

  const boredom = levelFromScore(100 - reader.boredomRisk);
  const curiosity = levelFromScore(reader.curiosity);
  if (boredom === "high" && curiosity === "low") {
    issues.push({
      code: "reader_fatigue",
      severity: "critical",
      message: "Simulated reader boredom high with low curiosity",
      dimension: "readerRetentionSim",
    });
  }

  if (clicheScan?.criticalCount) {
    issues.push({
      code: "cliche_critical",
      severity: "critical",
      message: `${clicheScan.criticalCount} critical cliché(s) detected`,
      dimension: "clicheDensity",
    });
  } else if (clicheScan?.highCount) {
    issues.push({
      code: "cliche_high",
      severity: "optional",
      message: `${clicheScan.highCount} high-severity cliché(s) remain`,
      dimension: "clicheDensity",
    });
  }

  if (readerSim && !readerSim.passesGate) {
    const criticalReader = readerSim.abandonmentRisk === "high" || readerSim.failedChecks.some(c => /abandon|too early/i.test(c));
    issues.push({
      code: "reader_sim_fail",
      severity: criticalReader ? "critical" : "optional",
      message: readerSim.failedChecks[0] || "Reader simulation gate failed",
      dimension: criticalReader ? "readerRetentionSim" : "readerCuriosity",
    });
  }

  if (promises?.brokenCount) {
    issues.push({
      code: "promise_broken",
      severity: "critical",
      message: `${promises.brokenCount} narrative promise(s) broken or forgotten`,
      dimension: "narrativePromiseIntegrity",
    });
  }

  if (payoff?.missingPayoffCount) {
    issues.push({
      code: "missing_payoff",
      severity: "critical",
      message: `${payoff.missingPayoffCount} setup(s) without payoff in chapter`,
      dimension: "payoffStrength",
    });
  } else if (payoff?.prematurePayoffCount) {
    issues.push({
      code: "premature_payoff",
      severity: "optional",
      message: `${payoff.prematurePayoffCount} payoff(s) arrive too quickly`,
      dimension: "payoffStrength",
    });
  }

  for (const v of behavioral?.violations.filter(v => v.severity === "critical") || []) {
    issues.push({
      code: `behavior_${v.type}`,
      severity: "critical",
      message: v.message,
      dimension: "behavioralConsistency",
    });
  }

  if (subtext && !subtext.passesGate && subtext.metrics.explainedEmotion > 0) {
    issues.push({
      code: "explained_emotion",
      severity: "critical",
      message: "Emotions explained directly instead of shown through behavior",
      dimension: "subtextStrength",
    });
  }

  if (tensionV2 && !tensionV2.passesGate) {
    issues.push({
      code: "tension_arc_violation",
      severity: "critical",
      message: tensionV2.warnings[0] || "Tension arc violation — premature payoff or reconciliation",
      dimension: "relationshipTension",
    });
  }

  if (dialogue && !dialogue.passesGate && dialogue.metrics.therapistDialogueLines > 0) {
    issues.push({
      code: "therapist_dialogue",
      severity: "critical",
      message: "Therapist-style dialogue detected",
      dimension: "dialogueHumanity",
    });
  }

  if (emotionalRealism && !emotionalRealism.passesGate) {
    issues.push({
      code: "emotional_unrealistic",
      severity: "critical",
      message: emotionalRealism.failedChecks[0] || "Emotional realism gate failed",
      dimension: "emotionalRealism",
    });
  }

  const clicheDensityScore = clamp100(100 - (clicheScan?.density || 0) * 8 - (clicheScan?.hits.length || 0) * 3);
  const readerCuriosity = clamp100(readerSim?.curiosity ?? reader.curiosity);
  const readerRetentionSim = clamp100(readerSim?.retention ?? bestseller.scores.readerRetention);
  const narrativePromiseIntegrity = clamp100(promises?.integrityScore ?? 100);
  const payoffStrength = clamp100(payoff?.strengthScore ?? 75);
  const characterDepth = clamp100(
    profiles.length * 8 +
      profiles.reduce((n, p) => n + (p.fears.length + p.desires.length + p.secrets.length) * 4, 0) +
      (profiles.some(p => p.relationships.length) ? 15 : 0),
  );
  const behavioralConsistency = clamp100(behavioral?.consistencyScore ?? 100);
  const relationshipTension = clamp100(tensionV2?.relationshipTension ?? 55);

  const dimensions = {
    emotionalRealism: clamp100(
      (emotionalRealism?.realismScore ?? 0) * 0.45 +
        editorial.pacingConsistencyScore * 4 +
        (100 - editorial.emotionalRedundancyScore * 8) * 0.25 +
        (reader.emotionalTension >= 68 ? 8 : reader.emotionalTension >= 38 ? 4 : 0),
    ),
    dialogueHumanity: clamp100(
      (dialogue?.humanityScore ?? editorial.dialogueHumanityScore * 10) * 0.7 +
        editorial.dialogueHumanityScore * 3,
    ),
    subtextStrength: clamp100(
      (subtext?.subtextScore ?? editorial.subtextScore * 10) * 0.65 +
        editorial.subtextScore * 3.5,
    ),
    narrativeTension: clamp100(
      (tensionV2?.narrativeTension ?? 0) * 0.35 +
        bestseller.scores.emotionalMomentum * 0.35 +
        (scenePurpose.overallHealth === "healthy" ? 20 : scenePurpose.overallHealth === "at-risk" ? 10 : 0) +
        (reader.emotionalTension >= 68 ? 15 : 8),
    ),
    commercialReadability: clamp100(bestseller.scores.overall),
    readerRetention: clamp100(bestseller.scores.readerRetention),
    marketPotential: clamp100(bestseller.scores.overall * 0.85 + bestseller.scores.commercialPacing * 0.15),
    bookTokPotential: clamp100(bestseller.scores.bookTokIntensity),
    voiceAuthenticity: clamp100(
      100 -
        validator.issues.filter(i => CRITICAL_VALIDATOR_KINDS.has(i.kind)).length * 18 -
        editorial.warnings.filter(w => w.type === "dialogue_perfection").length * 8,
    ),
    hookStrength: clamp100(bestseller.scores.hookStrength),
    readerCuriosity,
    readerRetentionSim,
    narrativePromiseIntegrity,
    payoffStrength,
    clicheDensity: clicheDensityScore,
    characterDepth,
    behavioralConsistency,
    relationshipTension,
  };

  const composite = clamp100(
    dimensions.emotionalRealism * 0.07 +
      dimensions.dialogueHumanity * 0.06 +
      dimensions.subtextStrength * 0.06 +
      dimensions.narrativeTension * 0.06 +
      dimensions.commercialReadability * 0.08 +
      dimensions.readerRetention * 0.06 +
      dimensions.marketPotential * 0.05 +
      dimensions.bookTokPotential * 0.03 +
      dimensions.voiceAuthenticity * 0.05 +
      dimensions.hookStrength * 0.05 +
      dimensions.readerCuriosity * 0.06 +
      dimensions.readerRetentionSim * 0.06 +
      dimensions.narrativePromiseIntegrity * 0.05 +
      dimensions.payoffStrength * 0.05 +
      dimensions.clicheDensity * 0.05 +
      dimensions.characterDepth * 0.06 +
      dimensions.behavioralConsistency * 0.06 +
      dimensions.relationshipTension * 0.06,
  );

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const optionalCount = issues.filter(i => i.severity === "optional").length;

  return {
    composite,
    dimensions,
    criticalCount,
    optionalCount,
    issues,
    passesPreDelivery: criticalCount === 0,
  };
}
