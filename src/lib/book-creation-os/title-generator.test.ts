import { describe, expect, it } from "vitest";
import { generateWizardTitleProposals } from "./title-generator";
import { buildTitleV2Pipeline, scoreTitleAgainstStory } from "@/lib/title-intelligence-v2";

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

  it.each([
    {
      label: "romance realistico",
      idea: "Romance realistico in un hotel sul lago: Camera 14, mappe antiche, lettere mai spedite e una donna scomparsa legano due ex rivali.",
      genre: "romance",
      expected: /camera 14|hotel|lago|mappe|lettere|donna scomparsa/i,
    },
    {
      label: "thriller",
      idea: "Thriller su un faro abbandonato, un registratore rotto, il testimone scomparso e un processo riaperto dopo vent'anni.",
      genre: "thriller",
      expected: /faro|registratore|testimone|processo/i,
    },
    {
      label: "fantasy",
      idea: "Fantasy epico nel Regno di Vetro: una corona di sale, un drago cieco e l'Atlante dei nomi perduti decidono la guerra.",
      genre: "fantasy",
      expected: /regno|vetro|corona|drago|atlante|nomi perduti/i,
    },
    {
      label: "horror",
      idea: "Horror psicologico in un orfanotrofio chiuso: Stanza 9, un carillon rotto e le fotografie dei bambini che sorridono di notte.",
      genre: "horror",
      expected: /orfanotrofio|stanza 9|carillon|fotografie|bambini/i,
    },
    {
      label: "self help",
      idea: "Metodo pratico per medici specializzandi: gestire turni massacranti, stress clinico e memoria da esame senza burnout.",
      genre: "self-help",
      expected: /medici|specializzandi|turni|stress|esame|burnout/i,
    },
  ])("uses distinctive story elements for %s", ({ idea, genre, expected }) => {
    const pipeline = buildTitleV2Pipeline({ idea, genre, language: "Italian" });
    expect(pipeline.allCandidates.length).toBeGreaterThanOrEqual(30);
    expect(pipeline.semifinalists).toHaveLength(10);
    expect(pipeline.finalists).toHaveLength(5);

    const winner = pipeline.finalists[0];
    expect(`${winner.title} ${winner.subtitle}`).toMatch(expected);
    expect(winner.usedDistinctiveElements.length).toBeGreaterThan(0);
    expect(winner.couldBelongToThousandBooks).toBe(false);
  });

  it("penalizes titles that could belong to a thousand romance books", () => {
    const idea = "Romance realistico in un hotel sul lago: Camera 14, mappe antiche, lettere mai spedite e una donna scomparsa.";
    const generic = scoreTitleAgainstStory(
      { idea, genre: "romance", language: "Italian" },
      "La colpa dei baci impossibili",
      "Una storia di attrazione e colpa, segreti e trasformazione.",
    );
    const pipeline = buildTitleV2Pipeline({ idea, genre: "romance", language: "Italian" });
    const winner = pipeline.finalists[0];

    expect(generic.couldBelongToThousandBooks).toBe(true);
    expect(generic.scores.finalScore).toBeLessThan(winner.scores.finalScore);
    expect(`${winner.title} ${winner.subtitle}`).toMatch(/camera 14|hotel|lago|mappe|lettere|donna scomparsa/i);
  });

  it("scores title intelligence with DNA, genre, bestseller and click metrics", () => {
    const pipeline = buildTitleV2Pipeline({
      idea: "Dark Romance friends to lovers: due amici, una lettera nascosta, attrazione proibita, ferita familiare e desiderio che mette a rischio la relazione.",
      genre: "dark romance",
      subcategory: "friends to lovers",
      language: "Italian",
    });
    const winner = pipeline.finalists[0];

    expect(winner.scores.dnaCoherence).toBeGreaterThanOrEqual(60);
    expect(winner.scores.genreCoherence).toBeGreaterThanOrEqual(60);
    expect(winner.scores.bestsellerPotential).toBeGreaterThanOrEqual(60);
    expect(winner.scores.clickPotential).toBeGreaterThanOrEqual(50);
    expect(`${winner.title} ${winner.subtitle}`).toMatch(/attrazione|desiderio|relazione|ferita|romance|lettera/i);
  });
});
