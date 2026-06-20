import { describe, expect, it } from "vitest";
import { DEFAULT_AI_PROVIDER_PRICING, estimateProviderCostEur, resolveAiProviderModel } from "@/lib/ai-provider-pricing";
import { estimateCompleteBookCreditRange, estimateOperationTokenCost, canPlanPromiseOperation } from "./credit-cost-model";

describe("AI provider and credit cost model", () => {
  it("keeps DeepSeek pricing configurable and positive", () => {
    const flash = DEFAULT_AI_PROVIDER_PRICING.models["deepseek-v4-flash"];
    expect(DEFAULT_AI_PROVIDER_PRICING.sourceUrl).toContain("deepseek");
    expect(flash.inputCacheMissUsdPer1M).toBeGreaterThan(0);
    expect(flash.outputUsdPer1M).toBeGreaterThan(0);
    expect(resolveAiProviderModel("deepseek-chat").id).toBe("deepseek-v4-flash");
  });

  it("estimates provider cost above zero", () => {
    expect(estimateProviderCostEur(10_000, 5_000)).toBeGreaterThan(0);
  });

  it("estimates operation token and credit costs", () => {
    const estimate = estimateOperationTokenCost("generate_chapter_medium");
    expect(estimate.inputTokens).toBeGreaterThan(0);
    expect(estimate.outputTokens).toBeGreaterThan(0);
    expect(estimate.providerCostEur).toBeGreaterThan(0);
    expect(estimate.creditCost).toBeGreaterThan(0);
  });

  it("does not let Free promise operations above its credit budget", () => {
    expect(canPlanPromiseOperation("free", "book_idea")).toBe(true);
    expect(canPlanPromiseOperation("free", "kdp_launch")).toBe(false);
    expect(canPlanPromiseOperation("free", "generate_chapter_medium")).toBe(false);
  });

  it("keeps complete-book credit ranges explicit", () => {
    expect(estimateCompleteBookCreditRange("small").min).toBeGreaterThan(0);
    expect(estimateCompleteBookCreditRange("long").max).toBeGreaterThan(estimateCompleteBookCreditRange("medium").max);
  });
});
