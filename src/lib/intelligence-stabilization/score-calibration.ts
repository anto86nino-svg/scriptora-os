export type CalibratedTier =
  | "weak"
  | "developing"
  | "strong"
  | "bestseller-potential"
  | "elite";

export interface CalibratedScore {
  raw: number;
  calibrated: number;
  tier: CalibratedTier;
  label: string;
}

export interface CalibrationBand {
  tier: CalibratedTier;
  min: number;
  max: number;
  label: string;
}

export const CALIBRATION_BANDS: CalibrationBand[] = [
  { tier: "weak", min: 5.0, max: 6.2, label: "Weak" },
  { tier: "developing", min: 6.3, max: 7.2, label: "Developing" },
  { tier: "strong", min: 7.3, max: 8.4, label: "Strong" },
  { tier: "bestseller-potential", min: 8.5, max: 9.3, label: "Bestseller Potential" },
  { tier: "elite", min: 9.4, max: 10.0, label: "Elite" },
];

export function tierFromCalibratedScore(score: number): CalibratedTier {
  if (score >= 9.4) return "elite";
  if (score >= 8.5) return "bestseller-potential";
  if (score >= 7.3) return "strong";
  if (score >= 6.3) return "developing";
  return "weak";
}

export function tierLabel(tier: CalibratedTier): string {
  return CALIBRATION_BANDS.find(b => b.tier === tier)?.label ?? tier;
}

/**
 * Maps raw 0–100 editorial metric to calibrated 0–10 with compression at the top.
 * Prevents "everything is 8.8+" when warnings are sparse.
 */
export function calibrateEditorialMetric(score100: number, warningCount = 0): number {
  const s = Math.max(0, Math.min(100, score100));
  let calibrated: number;

  if (s >= 92) calibrated = 7.8 + (s - 92) * 0.08;
  else if (s >= 82) calibrated = 7.0 + (s - 82) * 0.08;
  else if (s >= 72) calibrated = 6.2 + (s - 72) * 0.08;
  else if (s >= 58) calibrated = 5.4 + (s - 58) * 0.057;
  else calibrated = 5.0 + (s / 58) * 0.4;

  calibrated -= Math.min(0.6, warningCount * 0.04);
  return Number(Math.max(5.0, Math.min(9.6, calibrated)).toFixed(2));
}

/**
 * Calibrates bestseller overall (0–100) to 0–10 editorial scale.
 */
export function calibrateBestsellerOverall(overall100: number, riskCount = 0): number {
  const s = Math.max(0, Math.min(100, overall100));
  let calibrated: number;

  if (s >= 80) calibrated = 7.6 + (s - 80) * 0.055;
  else if (s >= 68) calibrated = 6.8 + (s - 68) * 0.067;
  else if (s >= 52) calibrated = 5.8 + (s - 52) * 0.0625;
  else if (s >= 38) calibrated = 5.2 + (s - 38) * 0.043;
  else calibrated = 5.0 + (s / 38) * 0.2;

  calibrated -= Math.min(0.5, riskCount * 0.05);
  return Number(Math.max(5.0, Math.min(9.5, calibrated)).toFixed(2));
}

export function countCalibrationPenaltySignals(text: string): number {
  const patterns = [
    /\b(i understand now|everything is fine|i love you|ti amo|tutto va bene|capisco tutto)\b/gi,
    /\b(it was a normal|normal day|woke up|si svegliò|giornata normale)\b/gi,
    /\b(believe in yourself|universe will align|unlock your|inner power)\b/gi,
    /\b(growing tomatoes teaches|inner growth|garden mindset|patience and inner)\b/gi,
    /\b(profound wave|love is the answer|healing is a journey)\b/gi,
    /\b(in this chapter we will explore)\b/gi,
  ];
  return patterns.reduce((sum, pattern) => sum + (text.match(pattern)?.length || 0), 0);
}

export function applyCalibrationPenalties(score: number, penaltySignals: number): number {
  if (penaltySignals <= 0) return score;
  return Number(Math.max(5.0, score - Math.min(1.8, penaltySignals * 0.22)).toFixed(2));
}

export interface ChapterQualityInput {
  dialogueHumanity: number;
  subtext: number;
  characterDepth: number;
  pacing: number;
  emotionalRealism: number;
  bestsellerOverall: number;
  warningCount?: number;
  riskCount?: number;
  penaltySignals?: number;
}

export function calibrateChapterQualityScore(input: ChapterQualityInput): CalibratedScore {
  const metrics = [
    input.dialogueHumanity,
    input.subtext,
    input.characterDepth,
    input.pacing,
    input.emotionalRealism,
  ];
  const avgRaw = metrics.reduce((a, b) => a + b, 0) / metrics.length;
  const editorialCal = calibrateEditorialMetric(avgRaw, input.warningCount ?? 0);
  const bestsellerCal = calibrateBestsellerOverall(input.bestsellerOverall, input.riskCount ?? 0);
  let calibrated = Number((editorialCal * 0.58 + bestsellerCal * 0.42).toFixed(1));
  calibrated = applyCalibrationPenalties(calibrated, input.penaltySignals ?? 0);
  const tier = tierFromCalibratedScore(calibrated);

  return {
    raw: Number(((avgRaw / 10 * 0.58 + input.bestsellerOverall / 10 * 0.42)).toFixed(2)),
    calibrated,
    tier,
    label: tierLabel(tier),
  };
}

export interface DoctorDeltaInput {
  beforeCalibrated: number;
  rawAfterCalibrated: number;
  patchCount: number;
  modificationPercent: number;
  positiveMetricCount: number;
  warningDelta: number;
}

/**
 * Believable Chapter Doctor delta — diminishing returns, no fake lifts.
 */
export function calibrateChapterDoctorDelta(input: DoctorDeltaInput): {
  afterScore: number;
  scoreDelta: number;
} {
  const { beforeCalibrated, patchCount, rawAfterCalibrated, positiveMetricCount, warningDelta, modificationPercent } =
    input;

  if (patchCount === 0) {
    return { afterScore: beforeCalibrated, scoreDelta: 0 };
  }

  const maxDelta =
    beforeCalibrated > 8.2 ? 0.6 : beforeCalibrated >= 6 ? 1.2 : 1.5;

  const hasRealImprovement =
    rawAfterCalibrated > beforeCalibrated + 0.04 ||
    positiveMetricCount >= 2 ||
    warningDelta >= 1;

  if (!hasRealImprovement) {
    if (modificationPercent >= 8 && positiveMetricCount >= 1) {
      const micro = Math.min(maxDelta * 0.35, 0.25);
      const afterScore = Number(Math.min(9.5, beforeCalibrated + micro).toFixed(1));
      const scoreDelta = Number((afterScore - beforeCalibrated).toFixed(1));
      return scoreDelta > 0 ? { afterScore, scoreDelta } : { afterScore: beforeCalibrated, scoreDelta: 0 };
    }
    return { afterScore: beforeCalibrated, scoreDelta: 0 };
  }

  let rawDelta = rawAfterCalibrated - beforeCalibrated;
  rawDelta = Math.max(0, Math.min(maxDelta, rawDelta));

  if (rawDelta < 0.1 && positiveMetricCount >= 1) {
    rawDelta = beforeCalibrated > 8.2 ? 0.1 : beforeCalibrated >= 6 ? 0.15 : 0.25;
  }

  rawDelta = Math.min(maxDelta, rawDelta);
  const afterScore = Number(Math.min(9.5, beforeCalibrated + rawDelta).toFixed(1));
  const scoreDelta = Number((afterScore - beforeCalibrated).toFixed(1));

  return { afterScore, scoreDelta };
}

export function assertScoreInTier(score: number, expected: CalibratedTier): boolean {
  const band = CALIBRATION_BANDS.find(b => b.tier === expected);
  if (!band) return false;
  return score >= band.min && score <= band.max + 0.15;
}

export function assertScoreSpread(scores: number[], minSpread = 0.8): boolean {
  if (scores.length < 2) return true;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return max - min >= minSpread;
}
