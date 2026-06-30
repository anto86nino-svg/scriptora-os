import { describe, expect, it } from "vitest";
import { buildPromptFromCanonicalConfig } from "@/lib/book-config-engine";
import { normalizeBookConfig } from "@/lib/book-config-studio/defaults";

describe("One Book Flow canon lock", () => {
  it("preserves the user-selected thriller concept without template contamination", () => {
    const concept = "Il Nome Scritto nel Buio. Elisa Ferri, criminologa, scopre che chi trova il proprio nome scritto su un muro abbandonato muore entro sette giorni. Le vittime sono collegate alla sparizione di un bambino avvenuta venticinque anni prima, ma nei documenti ufficiali quel bambino non e' mai esistito.";
    const config = normalizeBookConfig({
      title: "Il Nome Scritto nel Buio",
      subtitle: "Chi trova il proprio nome scritto su un muro muore entro sette giorni.",
      idea: concept,
      language: "Italian",
      genre: "thriller",
      category: "Fiction",
      subcategory: "Thriller psicologico",
      subgenre: "Thriller psicologico",
      tone: "oscuro e claustrofobico",
      bookTypeId: "thriller",
      bookFormat: "novel",
      numberOfChapters: 20,
      chapterLength: "medium",
      bookLength: "medium",
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
      targetReader: "Lettori di thriller psicologici oscuri, claustrofobici e fondati su misteri temporali.",
      authorName: "Scriptora Test",
      authorStyle: "Bestseller Commerciale",
      characters: [{ name: "Elisa Ferri", role: "protagonista", personality: "criminologa lucida e determinata" }],
      forgeAntiDriftRules: [
        "Mantenere Elisa Ferri come protagonista.",
        "Mantenere il countdown di sette giorni.",
        "Mantenere il mistero del bambino scomparso venticinque anni prima.",
      ],
    } as any);

    const { config: canonical, prompt } = buildPromptFromCanonicalConfig(config);
    const blob = `${canonical.title}\n${canonical.idea}\n${canonical.characters?.map((c) => c.name).join("\n")}\n${prompt}`;

    expect(canonical.title).toBe("Il Nome Scritto nel Buio");
    expect(canonical.genre).toBe("thriller");
    expect(canonical.subcategory).toContain("Thriller psicologico");
    expect(canonical.numberOfChapters).toBe(20);
    expect(canonical.subchaptersEnabled).toBe(true);
    expect(blob).toContain("Elisa Ferri");
    expect(blob).toMatch(/sette giorni/i);
    expect(blob).toMatch(/bambino/i);
    expect(blob).toMatch(/venticinque anni/i);
    expect(blob).not.toMatch(/\bNeri\b|citta nel ghiaccio|città nel ghiaccio|fotografia: storia di adulta/i);
  });
});
