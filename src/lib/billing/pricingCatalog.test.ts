import { describe, expect, it } from "vitest";
import {
  AUTHOR_SUBSCRIPTION_PLANS,
  GENERAL_CREDIT_PACKS,
  STUDENT_SUBSCRIPTION_PLANS,
  TRANSPARENCY_BULLETS,
} from "./pricingCatalog";

describe("Scriptora pricing catalog", () => {
  it("keeps Free as a real trial without full-book promises", () => {
    const free = AUTHOR_SUBSCRIPTION_PLANS.find((plan) => plan.id === "free");
    expect(free?.monthlyCredits).toBe(300);
    expect(`${free?.promise} ${free?.features.join(" ")}`).not.toMatch(/libro completo|full book|20 libri/i);
  });

  it("exposes Study OS Pro as the single student base plan at 20 euro per month", () => {
    expect(STUDENT_SUBSCRIPTION_PLANS).toHaveLength(1);
    const study = STUDENT_SUBSCRIPTION_PLANS[0];
    expect(study.id).toBe("study_os_pro");
    expect(study.priceNumeric).toBe(20);
    expect(study.includedUsageLabel).toMatch(/limiti equi/i);
    expect(`${study.promise} ${study.features.join(" ")}`).not.toMatch(/\d+[.,]?\d*\s*crediti/i);
  });

  it("keeps extra credit packs positive and sorted by credits", () => {
    for (const pack of GENERAL_CREDIT_PACKS) {
      expect(pack.priceNumeric).toBeGreaterThan(0);
      expect(pack.credits).toBeGreaterThan(0);
    }
    const credits = GENERAL_CREDIT_PACKS.map((pack) => pack.credits);
    expect(credits).toEqual([...credits].sort((a, b) => a - b));
  });

  it("states the author credits and Study subscription separation", () => {
    expect(TRANSPARENCY_BULLETS.join(" ")).toMatch(/Study OS Pro/);
    expect(TRANSPARENCY_BULLETS.join(" ")).toMatch(/20 €\/mese/);
  });
});
