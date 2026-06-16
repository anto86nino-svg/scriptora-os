import { describe, expect, it } from "vitest";
import { generateWizardTitleProposals } from "./title-generator";

describe("generateWizardTitleProposals", () => {
  it("locks manual projects to practical guide positioning", () => {
    const proposals = generateWizardTitleProposals(
      "",
      "Manuale pratico per coltivare pomodori in vaso con checklist, errori comuni e calendario settimanale",
      "it",
      "test",
      {
        level1BookType: "manuale",
        bookTypeId: "manual",
        category: "Manuali",
        subcategory: "Manuale pratico",
      }
    );

    expect(proposals.length).toBeGreaterThan(0);

    const combined = proposals
      .map((p) => `${p.title} ${p.subtitle} ${p.perceivedGenre} ${p.rationale}`)
      .join(" ");

    expect(combined).toMatch(/manuale|guida|metodo|pratico/i);
    expect(combined).not.toMatch(/horror|thriller|romanzo|narrativa letteraria|sangue|testimone|ombre|madri|notte|silente|lettori horror/i);
  });

  it("does not let manual context fall back to horror titles even with dark wording", () => {
    const proposals = generateWizardTitleProposals(
      "",
      "Manuale dark ma pratico per capire le emozioni nascoste e trasformarle in esercizi quotidiani",
      "it",
      "test",
      {
        level1BookType: "manuale",
        bookTypeId: "manual",
      }
    );

    expect(proposals.every((p) => p.perceivedGenre === "Manuale / guida")).toBe(true);
    expect(proposals.map((p) => p.rationale).join(" ")).not.toMatch(/lettori horror\/thriller/i);
  });
});
