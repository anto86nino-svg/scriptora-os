export {
  CALIBRATION_BANDS,
  calibrateBestsellerOverall,
  calibrateChapterDoctorDelta,
  calibrateChapterQualityScore,
  calibrateEditorialMetric,
  countCalibrationPenaltySignals,
  applyCalibrationPenalties,
  assertScoreInTier,
  assertScoreSpread,
  tierFromCalibratedScore,
  tierLabel,
} from "./score-calibration";
export type { CalibratedScore, CalibratedTier, ChapterQualityInput } from "./score-calibration";

export { runFullTortureSuite } from "./torture-suite";
export type { TortureBenchmarkResult, TortureAssertion } from "./torture-suite";

export {
  buildIntelligenceWeaknessReport,
  formatWeaknessReportMarkdown,
} from "./confidence-report";
export type { IntelligenceWeaknessReport, SystemConfidence } from "./confidence-report";

export const INTELLIGENCE_STABILIZATION_V1 = "scriptora-intelligence-stabilization-v1";
