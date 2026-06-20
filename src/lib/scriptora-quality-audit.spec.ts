import { describe, expect, it } from "vitest";
import { scriptoraQualityAudit } from "./scriptora-quality-audit";
import { trustDestroyerAudit } from "./trust-destroyer-audit";

describe("scriptora-quality-audit", () => {
  it("maintains zero open level-5 trust destroyers", () => {
    expect(trustDestroyerAudit().openLevel5).toBe(0);
  });

  it("scores at or above professional launch threshold (≥85)", () => {
    const report = scriptoraQualityAudit();
    expect(report.overallScore).toBeGreaterThanOrEqual(85);
    expect(["A", "B"]).toContain(report.grade);
  });

  it("logs reproducible audit snapshot for CI", () => {
    const report = scriptoraQualityAudit();
    if (process.env.SCRIPTORA_AUDIT_LOG === "1") {
      // eslint-disable-next-line no-console
      console.info(
        "[Scriptora Quality Audit]",
        JSON.stringify({
          overall: report.overallScore,
          grade: report.grade,
          trust: report.trust.destroyerScore,
          blockers: report.blockers,
          dimensions: report.dimensions.map((d) => ({ id: d.id, score: d.score })),
        }),
      );
    }
    expect(report.dimensions.length).toBeGreaterThan(0);
  });
});
