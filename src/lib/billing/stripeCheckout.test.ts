import { describe, expect, it, vi, beforeEach } from "vitest";
import { creditsToPackId, isPaidScriptoraPlan, startStripeCheckout } from "@/lib/billing/stripeCheckout";

const invokeMock = vi.fn();

vi.mock("@/lib/supabase-function-auth", () => ({
  invokeSupabaseFunction: (...args: unknown[]) => invokeMock(...args),
}));

describe("stripeCheckout", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("creditsToPackId maps pack sizes", () => {
    expect(creditsToPackId(100)).toBe("credits_100");
    expect(creditsToPackId(2000)).toBe("credits_2000");
  });

  it("isPaidScriptoraPlan excludes free", () => {
    expect(isPaidScriptoraPlan("free")).toBe(false);
    expect(isPaidScriptoraPlan("pro")).toBe(true);
  });

  it("returns not_configured when edge responds with checkout_not_configured", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, code: "checkout_not_configured" },
      error: null,
    });

    const result = await startStripeCheckout({ type: "subscription", planKey: "pro" });
    expect(result.status).toBe("not_configured");
  });

  it("returns redirect url on success", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, url: "https://checkout.stripe.com/test" },
      error: null,
    });

    const result = await startStripeCheckout({ type: "credit_pack", packId: "credits_100" });
    expect(result).toEqual({ status: "redirect", url: "https://checkout.stripe.com/test" });
  });
});
