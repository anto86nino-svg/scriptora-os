import { describe, expect, it } from "vitest";
import { prepareOneFlowWriterPackage, startOneFlowSession } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";

describe("SCRIPTORA format dominance regressions", () => {
  it("keeps cookbook blueprint on ingredient/recipe/technique tracks", () => {
    const session = startOneFlowSession("Libro di ricette cucina mediterranea", {
      genreHint: "Libro di ricette",
      language: "Italiano",
    });
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const joined = [
      payload!.config.genre,
      payload!.config.bookFormat,
      payload!.blueprint!.overview,
      payload!.blueprint!.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" "),
    ].join(" ");

    expect(joined).toMatch(/ingredient|ricett|tecnic/i);
    expect(joined).not.toMatch(/tradizione filosofica|implicazione esistenziale|literary fiction/i);
  });

  it("keeps workbook package practical and non-narrative", () => {
    const session = startOneFlowSession("Workbook 30 giorni contro l'ansia", {
      genreHint: "Workbook",
      language: "Italiano",
    });
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const joined = [
      payload!.config.genre,
      payload!.config.bookFormat,
      payload!.blueprint!.overview,
      payload!.blueprint!.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" "),
    ].join(" ");

    expect(joined).toMatch(/eserciz|tracker|scheda/i);
    expect(joined).not.toMatch(/hero journey|normalita|escalation/i);
  });

  it("keeps poetry collection away from narrative chapter defaults", () => {
    const session = startOneFlowSession("Raccolta poetica sul tempo", {
      genreHint: "Raccolta poetica",
      language: "Italiano",
    });
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const joined = [
      payload!.config.genre,
      payload!.config.bookFormat,
      payload!.blueprint!.overview,
      payload!.blueprint!.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" "),
    ].join(" ");

    expect(joined).toMatch(/sezione|voce poetic|poesi/i);
    expect(joined).not.toMatch(/capitolo 1 normalita/i);
  });

  it("keeps 03:17 idea on horror blueprint without regression", () => {
    const session = startOneFlowSession(
      "Ogni notte alle 03:17 una stazione ferroviaria abbandonata compare per sette minuti tra due gallerie inesistenti.",
      { genreHint: "Horror", language: "Italiano" },
    );
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const joined = [
      payload!.config.genre,
      payload!.config.bookFormat,
      payload!.blueprint!.overview,
      payload!.blueprint!.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" "),
    ].join(" ");

    expect(joined).toMatch(/horror|stazione|inquiet|paura|ombra/i);
  });

  it("keeps Elias high-concept fantasy away from romance and philosophy fallbacks", () => {
    const idea =
      "Elias, la porta nel cuore, ricordi di una donna vissuta mille anni prima, data della fine del mondo";
    const session = startOneFlowSession(`${idea} Fantasy, High Concept, Mistero, Destino, Memoria ancestrale, Fine del mondo`, {
      genreHint: "Fantasy",
      language: "Italiano",
    });
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const joined = [
      payload!.config.genre,
      payload!.proposal?.promise ?? "",
      payload!.proposal?.premise ?? "",
      payload!.proposal?.characters ?? "",
      payload!.blueprint!.overview,
      payload!.blueprint!.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" "),
    ].join(" ");

    expect(joined).toMatch(/fantasy/i);
    expect(joined).toMatch(/elias/i);
    expect(joined).toMatch(/porta|ricord|memor|fine del mondo|destino/i);
    expect(joined).not.toMatch(/forced proximity|amore proibito|tradizione filosofica|implicazione esistenziale/i);
    expect(joined).not.toMatch(/donna costretta a scegliere/i);
  });
});
