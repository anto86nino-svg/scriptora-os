import { describe, expect, it } from "vitest";
import {
  STUDY_OS_PRO_PLAN,
  STUDY_USAGE_LIMITS,
  estimateStudyOsCostModel,
  formatStudyLimitMessage,
} from "./study-limits";

describe("Study OS Pro commercial limits", () => {
  it("uses the simple 20 euro monthly subscription model", () => {
    expect(STUDY_OS_PRO_PLAN.priceEurMonthly).toBe(20);
    expect(STUDY_OS_PRO_PLAN.id).toBe("study_os_pro");
    expect(STUDY_OS_PRO_PLAN.included.join(" ")).not.toMatch(/crediti|credits/i);
  });

  it("defines non-zero fair-use limits", () => {
    expect(STUDY_USAGE_LIMITS.monthlySessions).toBeGreaterThan(0);
    expect(STUDY_USAGE_LIMITS.weeklyMaterials).toBeGreaterThan(0);
    expect(STUDY_USAGE_LIMITS.monthlyAiOperations).toBeGreaterThan(0);
    expect(STUDY_USAGE_LIMITS.maxUploadMb).toBeGreaterThan(0);
  });

  it("shows human localized limit messages with renewal days", () => {
    expect(formatStudyLimitMessage("it", 7, "hard")).toContain("7 giorni");
    expect(formatStudyLimitMessage("en", 3, "hard")).toContain("3 days");
    expect(formatStudyLimitMessage("it", 2, "hard")).not.toMatch(/undefined|null|provider|json|stack/i);
  });

  it("keeps normal usage cost below monthly price", () => {
    const model = estimateStudyOsCostModel();
    expect(model.normalUserCostEur).toBeGreaterThan(0);
    expect(model.normalUserCostEur).toBeLessThan(model.targetMonthlyPriceEur);
  });
});
