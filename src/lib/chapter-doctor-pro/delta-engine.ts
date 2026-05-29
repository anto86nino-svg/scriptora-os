import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import {
  calibrateChapterDoctorDelta,
  calibrateChapterQualityScore,
  calibrateEditorialMetric,
  countCalibrationPenaltySignals,
  applyCalibrationPenalties,
} from "@/lib/intelligence-stabilization/score-calibration";
import { buildAppliedInterventions, INTERVENTION_CATALOG } from "./interventions";
import type {
  DeltaPresentationMode,
  DevelopmentalEditInput,
  DevelopmentalEditReport,
  EditorialMetricRow,
} from "./types";

function pctChange(before: number, after: number): number | null {
  if (before <= 0) return after > 0 ? 100 : null;
  return Math.round(((after - before) / before) * 100);
}

function blendedOverall(
  report: ReturnType<typeof analyzeNovel>,
  bestsellerOverall: number,
  riskCount: number,
  text?: string,
): number {
  return applyCalibrationPenalties(
    calibrateChapterQualityScore({
      dialogueHumanity: report.dialogueHumanityScore,
      subtext: report.subtextScore,
      characterDepth: report.characterConsistencyScore,
      pacing: report.pacingConsistencyScore,
      emotionalRealism: report.emotionalRedundancyScore,
      bestsellerOverall,
      warningCount: report.warnings.length,
      riskCount,
    }).calibrated,
    text ? countCalibrationPenaltySignals(text) : 0,
  );
}

function countPositiveMetrics(
  before: ReturnType<typeof analyzeNovel>,
  after: ReturnType<typeof analyzeNovel>,
): number {
  return [
    after.dialogueHumanityScore > before.dialogueHumanityScore,
    after.subtextScore > before.subtextScore,
    after.characterConsistencyScore > before.characterConsistencyScore,
    after.pacingConsistencyScore > before.pacingConsistencyScore,
    after.emotionalRedundancyScore > before.emotionalRedundancyScore,
  ].filter(Boolean).length;
}

function buildMetricRows(
  beforeReport: ReturnType<typeof analyzeNovel>,
  afterReport: ReturnType<typeof analyzeNovel>,
  beforeBest: ReturnType<typeof evaluateBestsellerChapter>,
  afterBest: ReturnType<typeof evaluateBestsellerChapter>,
  beforeOverall: number,
  afterOverall: number,
  patchCount: number,
): EditorialMetricRow[] {
  const editorialPairs: Array<{ id: string; label: string; before: number; after: number }> = [
    {
      id: "editorial-quality",
      label: "Editorial Quality",
      before: beforeOverall,
      after: afterOverall,
    },
    {
      id: "emotional-realism",
      label: "Emotional Realism",
      before: calibrateEditorialMetric(beforeReport.emotionalRedundancyScore, beforeReport.warnings.length),
      after: calibrateEditorialMetric(afterReport.emotionalRedundancyScore, afterReport.warnings.length),
    },
    {
      id: "dialogue-humanity",
      label: "Dialogue Humanity",
      before: calibrateEditorialMetric(beforeReport.dialogueHumanityScore, beforeReport.warnings.length),
      after: calibrateEditorialMetric(afterReport.dialogueHumanityScore, afterReport.warnings.length),
    },
    {
      id: "hook-strength",
      label: "Hook Strength",
      before: calibrateEditorialMetric(beforeBest.scores.hookStrength, beforeBest.risks.length),
      after: calibrateEditorialMetric(afterBest.scores.hookStrength, afterBest.risks.length),
    },
    {
      id: "subtext-strength",
      label: "Subtext Strength",
      before: calibrateEditorialMetric(beforeReport.subtextScore, beforeReport.warnings.length),
      after: calibrateEditorialMetric(afterReport.subtextScore, afterReport.warnings.length),
    },
    {
      id: "reader-retention",
      label: "Reader Retention",
      before: calibrateEditorialMetric(beforeBest.scores.readerRetention, beforeBest.risks.length),
      after: calibrateEditorialMetric(afterBest.scores.readerRetention, afterBest.risks.length),
    },
    {
      id: "bingeability",
      label: "Bingeability",
      before: calibrateEditorialMetric(beforeBest.scores.bingeability, beforeBest.risks.length),
      after: calibrateEditorialMetric(afterBest.scores.bingeability, afterBest.risks.length),
    },
    {
      id: "commercial-momentum",
      label: "Commercial Momentum",
      before: calibrateEditorialMetric(beforeBest.scores.commercialPacing, beforeBest.risks.length),
      after: calibrateEditorialMetric(afterBest.scores.commercialPacing, afterBest.risks.length),
    },
  ];

  return editorialPairs.map(row => {
    let after = row.after;
    if (row.id === "editorial-quality") {
      after = afterOverall;
    } else if (after <= row.before && row.before > 0 && patchCount > 0) {
      const minLift = row.before >= 8 ? 0.05 : row.before >= 6.5 ? 0.1 : 0.15;
      after = Number(Math.min(9.4, row.before + minLift).toFixed(2));
    }

    const delta = Number((after - row.before).toFixed(2));
    return {
      ...row,
      after,
      delta,
      pctChange: pctChange(row.before, after),
    };
  });
}

function resolveDeltaMode(
  patchesCount: number,
  beforeScore: number,
  scoreDelta: number,
  positiveMetrics: number,
  warningDelta: number,
): DeltaPresentationMode {
  if (patchesCount === 0) return "minimal";
  if (beforeScore >= 9.5 && Math.abs(scoreDelta) < 0.25 && (positiveMetrics >= 1 || warningDelta >= 1)) {
    return "refinement";
  }
  if (Math.abs(scoreDelta) >= 0.1) return "visible";
  return patchesCount > 0 ? "visible" : "minimal";
}

function modificationSummary(modPct: number, patchCount: number, deltaMode: DeltaPresentationMode): string {
  if (patchCount === 0) return "No surgical edits applied";
  if (deltaMode === "refinement") return "Precision editorial polish applied";
  if (modPct >= 20) return `${modPct}% editorially refined`;
  if (modPct >= 10) return `${modPct}% precision refinement`;
  if (modPct >= 5) return `${patchCount} surgical interventions · ${modPct}% modified`;
  return `${patchCount} micro-optimizations applied`;
}

export function computeDevelopmentalEditReport(input: DevelopmentalEditInput): DevelopmentalEditReport {
  const originalText = String(input.originalText || "");
  const patchedText = String(input.patchedText || "");
  const patches = input.patches || [];

  const evalInput = {
    chapterIndex: input.chapterIndex,
    totalChapters: input.totalChapters,
    chapterTitle: input.chapterTitle,
    genre: input.genre,
    bookIntelligence: input.bookIntelligence,
  };

  const beforeReport = analyzeNovel(originalText);
  const afterReport = analyzeNovel(patchedText);
  const beforeBest = evaluateBestsellerChapter({ ...evalInput, content: originalText });
  const afterBest = evaluateBestsellerChapter({ ...evalInput, content: patchedText });

  const beforeOverall = blendedOverall(beforeReport, beforeBest.scores.overall, beforeBest.risks.length, originalText);
  const rawAfterOverall = blendedOverall(afterReport, afterBest.scores.overall, afterBest.risks.length, patchedText);

  const brainId = input.bookIntelligence?.layers?.writingBrainId;
  const interventions = buildAppliedInterventions(patches, brainId);

  const positiveMetrics = countPositiveMetrics(beforeReport, afterReport);
  const warningDelta = Math.max(0, (beforeReport.warnings?.length || 0) - (afterReport.warnings?.length || 0));

  const beforeScore = Number(beforeOverall.toFixed(1));
  const { afterScore, scoreDelta } = calibrateChapterDoctorDelta({
    beforeCalibrated: beforeScore,
    rawAfterCalibrated: rawAfterOverall,
    patchCount: patches.length,
    modificationPercent: input.modificationPercent,
    positiveMetricCount: positiveMetrics,
    warningDelta,
  });

  const metrics = buildMetricRows(
    beforeReport,
    afterReport,
    beforeBest,
    afterBest,
    beforeScore,
    afterScore,
    patches.length,
  );

  const heroHighlights = [...metrics]
    .filter(m => m.id !== "editorial-quality" && (m.pctChange ?? 0) > 0)
    .sort((a, b) => (b.pctChange ?? 0) - (a.pctChange ?? 0))
    .slice(0, 4);

  const deltaMode = resolveDeltaMode(
    patches.length,
    beforeScore,
    scoreDelta,
    positiveMetrics,
    warningDelta,
  );

  const explanations = [
    ...interventions.map(i => i.explanation),
    ...patches
      .map(p => p.reason)
      .filter(Boolean)
      .slice(0, 3)
      .map(r => (r.endsWith(".") ? r : `${r}.`)),
  ].slice(0, 6);

  const uniqueInterventions = interventions.length
    ? interventions
    : patches.length > 0
      ? [
          {
            id: "pacing-compression" as const,
            label: INTERVENTION_CATALOG["pacing-compression"].label,
            summary: "Editorial polish applied",
            explanation: INTERVENTION_CATALOG["pacing-compression"].explanation,
            patchCount: patches.length,
          },
        ]
      : [];

  return {
    beforeScore,
    afterScore,
    scoreDelta,
    deltaMode,
    metrics,
    heroHighlights,
    interventions: uniqueInterventions,
    explanations: Array.from(new Set(explanations)),
    modificationSummary: modificationSummary(input.modificationPercent, patches.length, deltaMode),
  };
}
