import { describe, expect, it } from "vitest";
import {
  buildEditorialToolsMaxLevelProtocol,
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
});
