import { describe, expect, it } from "vitest";
import {
  applyWritingEngineV13Postprocess,
  buildWritingEngineV13Block,
  runWritingEngineV13Audit,
} from "./index";

describe("writing-engine-v13", () => {
  it("detects weak static narrative pages", () => {
    const audit = runWritingEngineV13Audit(
      "Era triste. Pensava alla vita. Ricordava il passato. Tutto sembrava difficile.",
      { family: "narrative", genre: "dark-romance" },
    );
    expect(audit.score).toBeLessThan(90);
    expect(audit.signals.length).toBeGreaterThan(0);
  });

  it("adds genre truth warnings for weak nonfiction value", () => {
    const audit = runWritingEngineV13Audit(
      "Questo capitolo parla dell'importanza di cambiare prospettiva e sentirsi meglio.",
      { family: "nonfiction", genre: "self-help" },
    );
    expect(audit.signals.some(s => s.id === "weak_practical_value")).toBe(true);
  });

  it("removes generic AI-smell phrases", () => {
    const cleaned = applyWritingEngineV13Postprocess(
      "Un silenzio carico di significato riempì la stanza. In quel momento capì che doveva cambiare.",
      { family: "narrative" },
    );
    expect(cleaned).not.toMatch(/silenzio carico di significato/i);
    expect(cleaned).not.toMatch(/in quel momento capì/i);
  });

  it("builds a compact orchestration block", () => {
    const block = buildWritingEngineV13Block("Era triste.", { family: "narrative" });
    expect(block).toContain("SCRIPTORA WRITING ENGINE V13");
    expect(block).toContain("DIRECTIVES");
  });
});
