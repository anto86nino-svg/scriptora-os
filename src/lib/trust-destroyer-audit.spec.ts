import { describe, expect, it } from "vitest";
import { trustDestroyerAudit } from "./trust-destroyer-audit";

describe("trust-destroyer-audit", () => {
  it("has zero open level-5 destroyers after sprint fixes", () => {
    const audit = trustDestroyerAudit();
    expect(audit.openLevel5).toBe(0);
  });
});
