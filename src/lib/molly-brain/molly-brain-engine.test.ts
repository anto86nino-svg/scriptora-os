import { describe, expect, it } from "vitest";
import { analyzeMollyBrain } from "./molly-brain-engine";
import type { BookProject } from "@/types/book";

function mockProject(genre = "romance"): BookProject {
  return {
    id: "p1",
    config: {
      title: "Test",
      genre,
      subcategory: genre,
      language: "Italian",
      category: "Fiction",
      tone: "emotional",
      numberOfChapters: 3,
      chapterLength: "medium",
      bookLength: "medium",
    } as BookProject["config"],
    blueprint: {
      overview: "",
      emotionalArc: "",
      chapterOutlines: [{ title: "Cap 1", summary: "Incontro." }],
    },
    chapters: [
      {
        title: "Cap 1",
        content:
          'Luca disse: "Ti amo." Elena rispose: "Anch\'io ti amo. È tutto chiaro tra noi."\n\n' +
          'Luca aggiunse: "Non posso più farne a meno." Elena disse: "Anch\'io ti amo da morire."\n\n' +
          'Il dialogo era pulito, senza esitazioni. "Capisco perfettamente come ti senti," disse lei. ' +
          '"So esattamente cosa provi," rispose lui. Ogni frase suonava terapeutica e completa.',
        status: "done",
        subchapters: [],
      },
    ],
    frontMatter: null,
    backMatter: null,
    phase: "writing",
    messages: [],
  } as BookProject;
}

describe("analyzeMollyBrain", () => {
  it("returns actionable insight for romance fast payoff", () => {
    const insight = analyzeMollyBrain({
      project: mockProject("romance"),
      activeSection: "chapter-0",
      appContext: "writing",
    });
    expect(insight).not.toBeNull();
    expect(insight?.actions.length).toBeGreaterThan(0);
    expect(insight?.trigger).toBeTruthy();
    expect(insight?.comic.length).toBeGreaterThan(10);
  });
});
