import { describe, expect, it } from "vitest";
import { getOperationCost, resolveChapterGenerationOperation } from "./creditPolicy";
import { buildCreditIdempotencyKey } from "./idempotency";
import { getBillingExecutionMode } from "./billingMode";

describe("billing hardening smoke", () => {
  it("maps chapter generation operations by book length", () => {
    expect(resolveChapterGenerationOperation({ bookLength: "short" })).toBe("generate_chapter_short");
    expect(resolveChapterGenerationOperation({ bookLength: "long" })).toBe("generate_chapter_long");
    expect(getOperationCost("rewrite_chapter")).toBe(100);
  });

  it("builds stable idempotency keys", () => {
    expect(buildCreditIdempotencyKey("chapter", "p1", 2)).toBe("chapter:p1:2");
  });

  it("uses server billing mode in production builds", () => {
    expect(getBillingExecutionMode()).toBe("server");
  });
});
