import { beforeEach, describe, expect, it } from "vitest";
import {
  PAY_PER_PROJECT_TIERS,
  createPendingProjectUnlock,
  isProjectUnlocked,
  listProjectUnlocks,
  recommendPayPerProjectTier,
} from "./pay-per-project";

describe("pay per project", () => {
  beforeEach(() => localStorage.clear());

  it("defines the requested one-time project tiers", () => {
    expect(PAY_PER_PROJECT_TIERS.map((tier) => tier.priceLabel)).toEqual(["€3,99", "€6,99", "€11,99", "€19,99"]);
    expect(recommendPayPerProjectTier("short").id).toBe("short_book");
    expect(recommendPayPerProjectTier("medium").id).toBe("medium_book");
    expect(recommendPayPerProjectTier("long").id).toBe("long_book");
  });

  it("binds unlocks to one projectId only", () => {
    createPendingProjectUnlock("project-a", "medium_book");
    expect(isProjectUnlocked("project-a")).toBe(true);
    expect(isProjectUnlocked("project-b")).toBe(false);
    expect(listProjectUnlocks()).toHaveLength(1);
  });
});
