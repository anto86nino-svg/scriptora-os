import { getNarrativeTelemetrySnapshot } from "@/lib/narrative-intelligence";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";
import { analyzeChapterScenePurpose } from "@/lib/narrative-intelligence-v2/scene-purpose";
import type { ReaderSimulationInput, ReaderSimulationSnapshot } from "./types";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function paceSignal(text: string): ReaderSimulationSnapshot["readingPace"] {
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const avgWordsPerSentence = words / sentences;
  if (avgWordsPerSentence < 8) return "too_fast";
  if (avgWordsPerSentence > 28) return "skimming";
  return "steady";
}

function trustScore(text: string): number {
  const hedges = (text.match(/\b(maybe|perhaps|sort of|kind of|somehow|for some reason)\b/gi) || []).length;
  const concrete = (text.match(/\b(\d+|monday|tuesday|wednesday|thursday|friday|january|february|door|phone|key|blood|knife|letter)\b/gi) || []).length;
  const toldEmotion = (text.match(/\b(felt|realized|understood|knew that|was happy|was sad)\b/gi) || []).length;
  return clamp(72 + concrete * 2 - hedges * 4 - toldEmotion * 3);
}

export function simulateReaderInLoop(input: ReaderSimulationInput): ReaderSimulationSnapshot {
  const text = String(input.content || "").trim();
  const scenePurpose =
    input.scenePurpose ||
    analyzeChapterScenePurpose({
      content: text,
      chapterIndex: input.chapterIndex,
      config: input.config,
    });

  const base = simulateReaderEmotion({
    content: text,
    chapterIndex: input.chapterIndex,
    config: input.config,
    scenePurpose,
    totalChapters: input.totalChapters,
  });

  const telemetry = getNarrativeTelemetrySnapshot({
    config: {
      genre: (input.config?.genre || "literary-fiction") as any,
      bookIntelligence: input.config?.bookIntelligence as any,
    },
    currentText: text,
  });

  const curiosity = base.curiosity;
  const emotion = base.emotionalTension;
  const trust = trustScore(text);
  const confusion = base.confusion;
  const fatigue = base.emotionalFatigue;
  const retention = clamp(
    base.compulsiveReadability * 0.35 +
      base.obsessionPotential * 0.25 +
      (100 - base.boredomRisk) * 0.25 +
      curiosity * 0.15,
  );

  const predictabilityRisk = clamp(
    (text.match(/\b(of course|naturally|as expected|inevitably|sure enough)\b/gi) || []).length * 18 +
      (telemetry.flags.earlyPayoffRisk ? 25 : 0) +
      (scenePurpose.scenes.filter(s => s.primaryPurpose === "unclear").length * 12),
  );

  const failedChecks: string[] = [];

  if (curiosity < 42) failedChecks.push("A reader would not feel enough curiosity to continue");
  if (retention < 45) failedChecks.push("Retention signals are weak — reader may abandon");
  if (base.boredomRisk >= 62 && curiosity < 55) failedChecks.push("Reader is bored and not curious enough");
  if (confusion >= 58) failedChecks.push("Reader confusion is too high");
  if (fatigue >= 65 && emotion < 50) failedChecks.push("Emotional fatigue without payoff");
  if (predictabilityRisk >= 55) failedChecks.push("Scene feels predictable");
  if (telemetry.flags.earlyPayoffRisk) failedChecks.push("Emotional payoff arrived too early");
  if (paceSignal(text) === "skimming") failedChecks.push("Reader may skim — sentences too long or flat");

  const abandonmentRisk: ReaderSimulationSnapshot["abandonmentRisk"] =
    retention < 38 || (base.boredomRisk >= 70 && curiosity < 45)
      ? "high"
      : retention < 52 || failedChecks.length >= 2
        ? "medium"
        : "low";

  const wouldContinue = abandonmentRisk !== "high" && curiosity >= 40 && retention >= 42;

  const passesGate =
    wouldContinue &&
    failedChecks.filter(c => /abandon|bored|predictable|too early|skim/i.test(c)).length === 0;

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    curiosity,
    emotion,
    trust,
    confusion,
    fatigue,
    retention,
    wouldContinue,
    abandonmentRisk,
    readingPace: paceSignal(text),
    predictabilityRisk,
    earlyPayoffRisk: telemetry.flags.earlyPayoffRisk,
    failedChecks,
    passesGate,
  };
}
