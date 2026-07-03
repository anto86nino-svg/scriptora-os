import { describe, expect, it } from "vitest";
import { buildExpressBookScenarios } from "@/lib/guided-interview/express-book-package";
import { buildExpressForgeConfiguration } from "@/lib/guided-interview/express-forge-config";
import { analyzeConceptFromIdea } from "@/lib/concept-dominance";
import { prepareOneFlowWriterPackage, startOneFlowSessionWithConfirmedFoundations } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";
import {
  extractConceptProtagonist,
  hasSubmergedCitySciFiSignals,
} from "@/lib/concept-dominance";
import { isGenericNarrativePromise } from "@/lib/narrative-promise-intelligence";
import { isInvalidGeneratedTitle } from "@/lib/title-intelligence-validation";

export const AREN_EXACT_IDEA = `Per oltre trecento anni una città è rimasta nascosta sotto il ghiaccio eterno del Nord.
Quando il disgelo libera la città, i suoi abitanti credono che siano passati solo sette giorni.
Aren, giovane cartografo, scopre che la città custodisce una tecnologia impossibile e un segreto capace di riscrivere la storia dell'umanità.
Mentre il mondo combatte per impossessarsene, Aren scopre che il ghiaccio era una prigione costruita per contenere qualcosa che sta per svegliarsi.`;

const GENERIC_BLUEPRINT_PATTERNS =
  /mondo ordinario|inciting incident|mid\s*point|crepa|origine|modulo\s*1|domanda contemplativa|tradizione filosofica|mentore|chiamata|rifiuto|soglia/i;

describe("Aren submerged-city — exact author idea", () => {
  it("detects ice-city sci-fi signals and Aren as protagonist", () => {
    expect(hasSubmergedCitySciFiSignals(AREN_EXACT_IDEA)).toBe(true);
    expect(extractConceptProtagonist(AREN_EXACT_IDEA)).toBe("Aren");
    expect(extractConceptProtagonist(AREN_EXACT_IDEA)).not.toBe("Per");
  });

  it("builds forge configuration with sci-fi genre despite Fantasy hint", () => {
    const analysis = analyzeConceptFromIdea(AREN_EXACT_IDEA, { genre: "Fantasy" });
    expect(analysis.genre).toBe("sci-fi");
    const forge = buildExpressForgeConfiguration({
      bookFormat: "novel",
      genre: analysis.genre ?? "Fantasy",
      language: "Italiano",
      ideaSeed: AREN_EXACT_IDEA,
      tone: "",
      length: "medio",
      controlLevel: "auto",
      titleMode: "suggest",
    });
    const commercial = forge.packages.find((p) => p.variant === "commercial")!;
    expect(commercial.genre).toMatch(/sci/i);
    expect(commercial.subtitle.toLowerCase()).not.toMatch(/fantasy emozionale/i);
  });

  it("builds submerged-city commercial scenario with sci-fi subtitle", () => {
    const scenarios = buildExpressBookScenarios({
      bookFormat: "novel",
      genre: "sci-fi",
      language: "Italiano",
      ideaSeed: AREN_EXACT_IDEA,
      tone: "emozionale",
      length: "medio",
      controlLevel: "auto",
      titleMode: "suggest",
    });
    const commercial = scenarios.find((s) => s.variant === "commercial")!;
    expect(commercial.genre).toMatch(/sci/i);
    expect(commercial.subtitle.toLowerCase()).toMatch(/ghiaccio|disgelo|sette giorni|cartograf/i);
    expect(commercial.subtitle.toLowerCase()).not.toMatch(/fantasy emozionale/i);
  });

  it("keeps exact Aren idea through One Flow with editor-quality proposal", () => {
    const session = startOneFlowSessionWithConfirmedFoundations(AREN_EXACT_IDEA, { genreHint: "Fantasy", language: "Italiano" });
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const title = session.proposal?.title ?? "";
    const subtitle = session.proposal?.subtitle ?? "";
    const promise = session.proposal?.promise ?? "";
    const characters = session.proposal?.characters ?? "";
    const chapters = payload!.blueprint!.chapterOutlines.map((c) => c.title).join(" ");

    expect(isInvalidGeneratedTitle(title, AREN_EXACT_IDEA, subtitle)).toBe(false);
    expect(title.toLowerCase()).not.toMatch(/citt[aà].*rimasta nascosta|camera di/i);
    expect(title.toLowerCase()).toMatch(/disgelo|ghiaccio|sette giorni|prigione|citt[aà]/i);

    expect(isGenericNarrativePromise(promise)).toBe(false);
    expect(promise.toLowerCase()).toMatch(/aren/);
    expect(promise.toLowerCase()).toMatch(/citt[aà]|ghiaccio/);
    expect(promise.toLowerCase()).not.toMatch(/\bdi la\b/);
    expect(promise.toLowerCase()).toMatch(/segreto|tecnolog/);
    expect(promise.toLowerCase()).toMatch(/svegli|prigione|minaccia/);

    expect(characters.toLowerCase()).toMatch(/aren/);
    expect(characters.toLowerCase()).not.toMatch(/\bper\b.*vs|kael/i);

    expect(subtitle.toLowerCase()).toMatch(/ghiaccio|disgelo|sette giorni|cartograf|segreto/i);
    expect(subtitle.toLowerCase()).not.toMatch(/fantasy emozionale|magia, tradimento/i);

    expect(chapters).toMatch(/disgelo/i);
    expect(chapters).toMatch(/sette giorni/i);
    expect(chapters).toMatch(/tecnolog/i);
    expect(chapters).toMatch(/prigione.*ghiaccio|ghiaccio/i);
    expect(chapters).toMatch(/svegli/i);
    expect(chapters).not.toMatch(GENERIC_BLUEPRINT_PATTERNS);

    expect(payload!.config.genre.toLowerCase()).toMatch(/sci/);
    expect(session.proposal?.genre?.toLowerCase() ?? "").toMatch(/sci/);
  });
});
