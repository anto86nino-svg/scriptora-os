import { describe, expect, it } from "vitest";
import { resolveChapterTitle, resolveSubchapterTitle } from "./chapter-titles";
import { normalizeBlueprintShape } from "./blueprint-recovery";

describe("chapter title resolver", () => {
  it("rejects internal romance beats as public chapter titles", () => {
    const title = resolveChapterTitle("Forced proximity / inevitable encounter", 1, {
      config: {
        language: "Italian",
        genre: "dark gothic romance",
      },
      summary: "Celeste entra nella Sala del Sangue e trova un sigillo d'argento.",
      content:
        "Nei condotti, la coscienza artificiale ripete il falso nome di Leo. " +
        "Il bracciale di rame conserva una memoria nel ferro e un debito di sangue.",
    });

    expect(title).not.toBe("Forced proximity / inevitable encounter");
    expect(title).toMatch(/Condotti|Sangue|Sigillo|Ferro|Nome/);
  });

  it("keeps real narrative titles untouched", () => {
    expect(resolveChapterTitle("Memoria nel Ferro", 1)).toBe("Memoria nel Ferro");
  });

  it("replaces weak isolated chapter keywords with concept-aware horror titles", () => {
    const config = {
      title: "Casa Sotto Pelle",
      subtitle: "",
      genre: "horror",
      subcategory: "Horror",
      subgenre: "horror gotico",
      language: "Italian",
      tone: "oscuro e claustrofobico",
      idea: "Una donna torna nel paese d'infanzia e scopre che le madri scomparse non sono mai davvero andate via. La casa di famiglia sembra ricordare più di lei.",
      numberOfChapters: 12,
    } as any;

    const forbidden = /trova e paese|^paese$|^casa$|capitolo\s*3|adult[oa]|protagonista/i;
    const title = resolveChapterTitle("trova e paese", 0, {
      config,
      summary: config.idea,
    });

    expect(title).not.toMatch(forbidden);
    expect(title).toMatch(/piazza|madri|pareti|casa|targa|paese|stanza/i);
  });

  it("generates specific subchapter titles instead of technical beat placeholders", () => {
    const config = {
      title: "Casa Sotto Pelle",
      subtitle: "",
      genre: "horror",
      category: "Fiction",
      subcategory: "Horror",
      subgenre: "horror gotico",
      language: "Italian",
      tone: "oscuro e claustrofobico",
      authorStyle: "teso e sensoriale",
      chapterLength: "short",
      bookLength: "short",
      idea: "Una donna torna nel paese d'infanzia e scopre che le madri scomparse non sono mai davvero andate via. La casa di famiglia sembra ricordare più di lei.",
      numberOfChapters: 1,
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
    } as any;

    const blueprint = normalizeBlueprintShape({
      chapterOutlines: [{
        title: "trova e paese",
        summary: config.idea,
        subchapters: [
          { title: "trova e paese · Apertura", summary: "Il ritorno nel paese." },
          { title: "paese", summary: "La memoria del luogo mente." },
          { title: "casa", summary: "La casa ricorda le madri scomparse." },
        ],
      }],
    }, config);

    const subs = blueprint.chapterOutlines[0]?.subchapters || [];
    expect(subs).toHaveLength(3);
    expect(subs.map((sub) => sub.title).join(" ")).not.toMatch(/trova e paese|· Apertura|^paese$|^casa$|adult[oa]/i);
    expect(subs.map((sub) => sub.title).join(" ")).toMatch(/fontana|targa|madre|stanza|fotografie|porta/i);
  });

  it("resolves generated subchapter titles through the same concept-aware engine", () => {
    const title = resolveSubchapterTitle("paese", 1, "Il ritorno alla piazza vuota", {
      config: {
        title: "Casa Sotto Pelle",
        genre: "horror",
        language: "Italian",
        idea: "Una donna torna nel paese d'infanzia e scopre che le madri scomparse non sono mai davvero andate via.",
      },
      summary: "Il paese mente sulla sparizione delle madri.",
    });

    expect(title).not.toMatch(/^paese$|apertura|pressione/i);
    expect(title).toMatch(/fontana|targa|madre|stanza|fotografie|porta/i);
  });
});
