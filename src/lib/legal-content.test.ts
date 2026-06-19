import { describe, expect, it } from "vitest";
import {
  AI_DISCLAIMER,
  COOKIE_POLICY,
  COPYRIGHT_POLICY,
  CREDITS_POLICY,
  LEGAL_VERSION,
  TERMS_OF_SERVICE,
} from "./legal-content";

describe("legal-content", () => {
  it("allinea i termini al modello crediti attuale invece dei vecchi token plan", () => {
    expect(LEGAL_VERSION).toBe("1.2.0");
    expect(TERMS_OF_SERVICE).toContain("crediti universali");
    expect(TERMS_OF_SERVICE).toContain("pagina Pricing");
    expect(TERMS_OF_SERVICE).not.toContain("10.000 token");
    expect(TERMS_OF_SERVICE).not.toContain("€14,99/mese");
  });

  it("espone policy pubbliche per compliance, crediti, AI e copyright", () => {
    expect(COOKIE_POLICY).toContain("Cookie Policy");
    expect(CREDITS_POLICY).toContain("Credits Policy");
    expect(AI_DISCLAIMER).toContain("Disclaimer AI");
    expect(COPYRIGHT_POLICY).toContain("Copyright & Content Policy");
  });
});
