import { describe, expect, it } from "vitest";
import { containsTechnicalErrorText, getUserFriendlyError, safeParseStorage } from "./user-friendly-error";

describe("user friendly errors", () => {
  it("hides technical provider and network messages", () => {
    const message = getUserFriendlyError(new Error("Provider 500: network error undefined"), { area: "study" });
    expect(message).not.toMatch(/provider|network|500|undefined/i);
    expect(message).toMatch(/versione rapida|riprovare|salvato/i);
  });

  it("hides provider-specific rate and credit messages", () => {
    const message = getUserFriendlyError(new Error("DeepSeek credits exhausted: rate limited"), { area: "blueprint" });
    expect(message).not.toMatch(/deepseek|credits exhausted|rate limited/i);
    expect(message).toMatch(/Blueprint non completato|salvato/i);
  });

  it("keeps safe human upload messages", () => {
    const message = getUserFriendlyError("Formato non supportato. Usa PDF o DOCX.", { area: "upload" });
    expect(message).toMatch(/Formato non supportato/);
  });

  it("parses storage safely", () => {
    expect(safeParseStorage("{bad", { ok: true })).toEqual({ ok: true });
    expect(containsTechnicalErrorText("Cannot read properties of undefined")).toBe(true);
  });
});
