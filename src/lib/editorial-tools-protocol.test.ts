import { describe, expect, it } from "vitest";
import {
  buildEditorialToolsMaxLevelProtocol,
  runEditorialTruthGate,
  PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS,
  shouldSkipRewriteForInsufficientGain,
} from "./editorial-tools-protocol";

describe("editorial tools max level protocol", () => {
  it("codifica le regole editoriali professionali senza adulazione automatica", () => {
    const protocol = buildEditorialToolsMaxLevelProtocol("Italian");

    expect(protocol).toContain("SCRIPTORA OS");
    expect(protocol).toContain("Never flatter automatically");
    expect(protocol).toContain(PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS);
    expect(protocol).toContain("expected improvement is below 5%");
  });

  it("blocca rewrite con guadagno sotto soglia", () => {
    expect(shouldSkipRewriteForInsufficientGain(8.8, 9.1)).toBe(true);
    expect(shouldSkipRewriteForInsufficientGain(8.0, 8.6)).toBe(false);
  });

  it("non consente score 9+ senza prove testuali concrete", () => {
    const gate = runEditorialTruthGate({
      scoreOutOf10: 9.4,
      evidence: ["Buon ritmo"],
    });

    expect(gate.canClaimPremium).toBe(false);
    expect(gate.normalizedScore).toBeLessThan(9);
    expect(gate.warnings[0]).toMatch(/prove testuali/);
  });

  it("sceglie patch o rewrite in base a severita e guadagno reale", () => {
    expect(runEditorialTruthGate({
      scoreOutOf10: 8.4,
      evidence: ["Dialoghi naturali", "Hook chiaro"],
      moderateIssues: ["Ripetizione locale"],
      estimatedRewriteGainPercent: 3,
    }).requiredAction).toBe("patch");

    expect(runEditorialTruthGate({
      scoreOutOf10: 7.6,
      evidence: ["Premessa buona", "Protagonista leggibile"],
      highIssues: ["Scene duplicate", "Dialoghi artificiali"],
      estimatedRewriteGainPercent: 12,
    }).requiredAction).toBe("rewrite");
  });
});
