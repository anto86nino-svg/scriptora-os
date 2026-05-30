import { describe, expect, it } from "vitest";
import {
  calibrateChapterDoctorDelta,
  calibrateChapterQualityScore,
  calibrateEditorialMetric,
  tierFromCalibratedScore,
} from "./score-calibration";

describe("Score Calibration Engine", () => {
  it("compresses inflated raw editorial metrics", () => {
    expect(calibrateEditorialMetric(100, 0)).toBeLessThan(9.0);
    expect(calibrateEditorialMetric(95, 0)).toBeLessThan(8.9);
    expect(calibrateEditorialMetric(70, 5)).toBeLessThan(7.0);
  });

  it("maps tiers to target bands", () => {
    expect(tierFromCalibratedScore(5.8)).toBe("weak");
    expect(tierFromCalibratedScore(6.8)).toBe("developing");
    expect(tierFromCalibratedScore(7.9)).toBe("strong");
    expect(tierFromCalibratedScore(8.8)).toBe("bestseller-potential");
    expect(tierFromCalibratedScore(9.5)).toBe("elite");
  });

  it("caps chapter doctor delta believably", () => {
    const result = calibrateChapterDoctorDelta({
      beforeCalibrated: 7.1,
      rawAfterCalibrated: 9.4,
      patchCount: 2,
      modificationPercent: 12,
      positiveMetricCount: 2,
      warningDelta: 1,
    });
    expect(result.afterScore).toBeLessThanOrEqual(8.3);
    expect(result.scoreDelta).toBeLessThanOrEqual(1.2);
  });

  it("weak chapter composite stays out of bestseller band", () => {
    const weak = calibrateChapterQualityScore({
      dialogueHumanity: 88,
      subtext: 90,
      characterDepth: 92,
      pacing: 91,
      emotionalRealism: 85,
      bestsellerOverall: 72,
      warningCount: 6,
      riskCount: 4,
    });
    expect(weak.calibrated).toBeLessThan(8.5);
  });
});
