import { describe, expect, it } from "vitest";
import {
  distributeChapterContentToSubchapters,
  hasRealSubchapterContent,
  MIN_REAL_SUBCHAPTER_CHARS,
  resyncSubchapterContentsFromChapter,
} from "./subchapter-content";
import { assembleChapterFromSubchapters } from "@/lib/writer/subchapter-pipeline";

describe("subchapter content distribution", () => {
  it("splits a single generated chapter into the expected real subchapters", () => {
    const chapterContent = [
      "La Sala del Sangue si aprì senza rumore, e Celeste capì che il sigillo d'argento non stava proteggendo nessuno.",
      "Leo trovò le lettere segrete sotto il bracciale di rame, dove il codice antico aveva inciso un falso nome.",
      "Nei condotti, la coscienza artificiale parlò con la voce di Vera e pretese un debito di sangue.",
      "Marzio non era più uomo: era memoria nel ferro, promessa spezzata e prova vivente del patto.",
    ].map((paragraph) => `${paragraph} ${"dettaglio ".repeat(16)}`).join("\n\n");

    const subchapters = distributeChapterContentToSubchapters({
      chapterContent,
      chapterIndex: 1,
      expectedCount: 4,
      existingSubchapters: [
        { title: "2.1", content: "" },
        { title: "2.2", content: "" },
        { title: "2.3", content: "" },
        { title: "2.4", content: "" },
      ],
    });

    expect(subchapters).toHaveLength(4);
    expect(subchapters.every((sub) => hasRealSubchapterContent(sub.content))).toBe(true);
    expect(subchapters[0]!.content.length).toBeGreaterThanOrEqual(MIN_REAL_SUBCHAPTER_CHARS);
  });

  it("uses explicit markers when the chapter already contains them", () => {
    const chapterContent = `
2.1: Apertura
${"Celeste entra nella Sala del Sangue e riconosce il sigillo. ".repeat(4)}

2.2: Pressione
${"Leo trova le lettere segrete e capisce che il falso nome e' una trappola. ".repeat(4)}

2.3: Scelta
${"La coscienza artificiale chiede il debito di sangue nei condotti. ".repeat(4)}

2.4: Conseguenza
${"Il ferro conserva la memoria e cambia il patto finale. ".repeat(4)}
`;

    const subchapters = distributeChapterContentToSubchapters({
      chapterContent,
      chapterIndex: 1,
      expectedCount: 4,
    });

    expect(subchapters).toHaveLength(4);
    expect(subchapters[0]!.content).toContain("Sala del Sangue");
    expect(subchapters[1]!.content).toContain("lettere segrete");
    expect(subchapters[2]!.content).toContain("coscienza artificiale");
    expect(subchapters[3]!.content).toContain("ferro");
  });

  it("resyncSubchapterContentsFromChapter keeps subchapters aligned after chapter trim", () => {
    const subs = [
      { title: "1.1", content: "Prima scena. ".repeat(40) },
      { title: "1.2", content: "Seconda scena. ".repeat(40) },
      { title: "1.3", content: "Terza scena. ".repeat(40) },
    ];
    const trimmed = `${subs[0]!.content}\n\n${subs[1]!.content.slice(0, 120)} [Limite parole del piano raggiunto.]`;

    const resynced = resyncSubchapterContentsFromChapter(trimmed, subs, 0);
    expect(trimmed).toContain(resynced[0]!.content.slice(0, 20));
    expect(trimmed).toContain("[Limite parole del piano raggiunto.]");
    expect(resynced.every((sub) => sub.content.length > 0)).toBe(true);
  });
});
