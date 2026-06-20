import { describe, expect, it } from "vitest";
import {
  getOperationCost,
  getOperationCostQuote,
  resolveChapterGenerationOperation,
  mapSubscriptionPlanToCreditPlan,
} from "./creditPolicy";
import { buildCreditIdempotencyKey } from "./idempotency";
import { getBillingExecutionMode } from "./billingMode";
import { PLAN_CREDIT_ALLOCATION } from "./creditPolicy";

describe("billing hardening smoke", () => {
  it("maps chapter generation operations by book length", () => {
    expect(resolveChapterGenerationOperation({ bookLength: "short" })).toBe("generate_chapter_short");
    expect(resolveChapterGenerationOperation({ bookLength: "long" })).toBe("generate_chapter_long");
    expect(getOperationCost("rewrite_chapter")).toBe(180);
    expect(getOperationCost("generate_chapter_medium")).toBe(350);
  });

  it("applies plan discounts via getOperationCostQuote", () => {
    const base = getOperationCostQuote("kdp_launch", { planId: "free" });
    const pro = getOperationCostQuote("kdp_launch", { planId: "pro_author" });
    const studio = getOperationCostQuote("kdp_launch", { planId: "studio" });
    expect(base.finalCost).toBe(450);
    expect(pro.discountPercent).toBe(10);
    expect(pro.finalCost).toBe(405);
    expect(studio.discountPercent).toBe(20);
    expect(studio.finalCost).toBe(360);

    const studyBase = getOperationCostQuote("study_quiz", { planId: "free" });
    const studyPlus = getOperationCostQuote("study_quiz", { planId: "student_plus" });
    expect(studyBase.finalCost).toBe(120);
    expect(studyPlus.discountPercent).toBe(10);
    expect(studyPlus.finalCost).toBe(108);
  });

  it("allocates monthly credits per commercial model", () => {
    expect(PLAN_CREDIT_ALLOCATION.free).toBe(300);
    expect(PLAN_CREDIT_ALLOCATION.starter).toBe(3_000);
    expect(PLAN_CREDIT_ALLOCATION.pro_author).toBe(8_000);
    expect(PLAN_CREDIT_ALLOCATION.studio).toBe(25_000);
    expect(PLAN_CREDIT_ALLOCATION.publisher).toBe(60_000);
    expect(PLAN_CREDIT_ALLOCATION.study_os_pro).toBe(0);
  });

  it("maps subscription tiers to credit plans", () => {
    expect(mapSubscriptionPlanToCreditPlan("pro")).toBe("pro_author");
    expect(mapSubscriptionPlanToCreditPlan("premium")).toBe("studio");
    expect(mapSubscriptionPlanToCreditPlan("study")).toBe("study_os_pro");
  });

  it("builds stable idempotency keys", () => {
    expect(buildCreditIdempotencyKey("chapter", "p1", 2)).toBe("chapter:p1:2");
  });

  it("uses server billing mode in production builds", () => {
    expect(getBillingExecutionMode()).toBe("server");
  });
});
