import { describe, expect, it } from "vitest";
import {
  calculateCreditCost,
  canRunCreditOperation,
  getMonthlyCreditsForPlan,
} from "@/lib/billing/creditPolicy";

describe("creditPolicy", () => {
  it("title_generation costs at least 1 credit", () => {
    expect(calculateCreditCost({ operation: "title_generation" })).toBeGreaterThanOrEqual(1);
  });

  it("chapter_generation_standard with deepseek_pro on pro is coherent", () => {
    const cost = calculateCreditCost({
      operation: "chapter_generation_standard",
      plan: "pro",
      provider: "deepseek_pro",
      intensity: "standard",
    });
    // base 12 × provider 1.0 × plan discount 0.9 = 10.8 → ceil 11
    expect(cost).toBe(11);
  });

  it("claude_sonnet costs more than deepseek_pro for the same operation", () => {
    const deepseek = calculateCreditCost({
      operation: "chapter_doctor",
      provider: "deepseek_pro",
    });
    const claude = calculateCreditCost({
      operation: "chapter_doctor",
      provider: "claude_sonnet",
    });
    expect(claude).toBeGreaterThan(deepseek);
  });

  it("heavy intensity costs more than standard", () => {
    const standard = calculateCreditCost({
      operation: "paragraph_rewrite",
      intensity: "standard",
    });
    const heavy = calculateCreditCost({
      operation: "paragraph_rewrite",
      intensity: "heavy",
    });
    expect(heavy).toBeGreaterThan(standard);
  });

  it("canRunCreditOperation blocks when credits are insufficient", () => {
    const result = canRunCreditOperation({
      availableCredits: 2,
      operation: "book_blueprint",
      plan: "free",
      provider: "deepseek_pro",
    });
    expect(result.allowed).toBe(false);
    expect(result.requiredCredits).toBeGreaterThan(2);
    expect(result.missingCredits).toBe(result.requiredCredits - 2);
  });

  it('getMonthlyCreditsForPlan("pro") returns 700', () => {
    expect(getMonthlyCreditsForPlan("pro")).toBe(700);
  });
});
