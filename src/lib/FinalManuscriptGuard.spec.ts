import { describe, expect, it } from "vitest";
import { sanitizeFinalManuscript } from "@/lib/FinalManuscriptGuard";

describe("FinalManuscriptGuard", () => {
  it("removes technical leakage and broken punctuation without touching prose", () => {
    const output = sanitizeFinalManuscript(`Lei chiuse la porta.\n\nGenre Coach: usa dopo Scansione rapida o Chapter Doctor\n\n, .\n\nThe next move would not wait for her.\n\nPoi rimase in silenzio.`);
    expect(output).toBe("Lei chiuse la porta.\n\nPoi rimase in silenzio.");
  });

  it("removes exact duplicate paragraphs but preserves distinct beats", () => {
    const repeated = "Emma appoggiò la mano alla porta e aspettò che Leo rispondesse, senza trovare una frase abbastanza semplice.";
    const output = sanitizeFinalManuscript(`${repeated}\n\n${repeated}\n\nLeo accese il fornello e non si voltò.`);
    expect(output.match(/Emma appoggiò/g)).toHaveLength(1);
    expect(output).toContain("Leo accese il fornello");
  });
});

