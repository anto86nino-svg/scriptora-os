import { describe, expect, it } from "vitest";
import { applyCleanTextPass } from "./clean-text-pass";

describe("clean-text-pass", () => {
  it("fixes common Italian grammar slips without AI", () => {
    const input = "Elia fece finta che niente fosse successo, qualcosa, dall'altra parte del binario.";
    const output = applyCleanTextPass(input, "Italiano");
    expect(output).toContain("non fosse successo");
    expect(output).toContain("qualcosa dall'");
    expect(output).not.toContain("qualcosa, dall'");
  });

  it("leaves non-Italian text unchanged", () => {
    const input = "Something, from the other side.";
    expect(applyCleanTextPass(input, "English")).toBe(input);
  });

  it("repairs corrupted merge fragments", () => {
    const input = "Anch'io Le mani non trovarono a da fare. non diceva a.";
    const output = applyCleanTextPass(input, "Italiano");
    expect(output).not.toContain("non diceva a.");
    expect(output).not.toContain("non trovarono a da fare");
  });
});
