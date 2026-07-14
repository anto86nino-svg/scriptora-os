import { describe, expect, it } from "vitest";
import { resolveGenreDominanceContract } from "@/lib/book-intelligence/genre-dominance";
import { inferInterviewBookSignals } from "@/lib/guided-interview/contextual-interview";
import { applyInterviewAnswer, getInitialInterviewState } from "@/lib/guided-interview/question-engine";
import { buildCompleteExpressBookPackage } from "@/lib/guided-interview/express-book-package";
import {
  buildHorrorGothicFallbackPromise,
  buildHorrorGothicFallbackTitle,
  isHorrorGothicIdentity,
} from "@/lib/genre/horror-gothic-identity";

const FIXTURE = {
  bookFormat: "novel",
  genre: "Horror",
  subcategory: "Horror gotico",
  idea: "horror gotico maniero segreti familiari",
  tone: "gotico e atmosferico",
  length: "medio" as const,
  language: "Italiano",
  titleMode: "suggest" as const,
  controlLevel: "scenarios" as const,
  ideaSeed: "horror gotico maniero segreti familiari",
};

describe("Horror/Gothic fix sprint — regression fixture", () => {
  it("resolves gothic-horror dominance contract even with meta subcategory drift", () => {
    const contract = resolveGenreDominanceContract({
      genre: "literary fiction",
      subcategory: "narrativa commerciale",
      bookFormat: "novel",
      idea: FIXTURE.idea,
    });
    expect(contract.genreKey).toBe("gothic-horror");
  });

  it("classifies contextual interview as horror, not literary-fiction", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = {
      ...state,
      selectedGenre: "horror",
      inferredProfile: {
        genre: "horror",
        subgenre: "Horror gotico",
        confidence: 1,
      },
    };
    state = applyInterviewAnswer(state, FIXTURE.idea);
    const signals = inferInterviewBookSignals(state);
    expect(signals.category).toBe("gothic-dark");
    expect(signals.genre).toBe("horror");
    expect(signals.genre).not.toBe("literary-fiction");
  });

  it("does not emit commercial placeholder title or promise", () => {
    const title = buildHorrorGothicFallbackTitle({
      genre: FIXTURE.genre,
      subcategory: FIXTURE.subcategory,
      idea: FIXTURE.idea,
    });
    const promise = buildHorrorGothicFallbackPromise({
      genre: FIXTURE.genre,
      subcategory: FIXTURE.subcategory,
      idea: FIXTURE.idea,
    });

    expect(title).toBeTruthy();
    expect(title!).not.toMatch(/promessa narrativa commerciale/i);
    expect(promise).not.toMatch(/segreto familiare narrativa commerciale/i);
    expect(promise).toMatch(/atmosfera|paura|inquietudine|decadenza/i);
    expect(promise).not.toMatch(/attrazione crescente|dinamica romantica/i);
  });

  it("builds express package with horror language, not romance drift", () => {
    const pkg = buildCompleteExpressBookPackage(
      {
        genre: "horror",
        language: FIXTURE.language,
        titleMode: FIXTURE.titleMode,
        ideaSeed: FIXTURE.ideaSeed,
        tone: FIXTURE.tone,
        length: FIXTURE.length,
        controlLevel: FIXTURE.controlLevel,
      },
      "commercial",
    );

    const concept = [
      pkg.marketPromise,
      pkg.editorialSynopsis,
      pkg.centralConflict,
      pkg.desire,
    ].join(" ");

    expect(pkg.title).not.toMatch(/promessa narrativa commerciale/i);
    expect(concept).toMatch(/atmosfera|paura|inquietudine|decadenza|minaccia|presen/i);
    expect(concept).not.toMatch(/attrazione crescente|dinamica romantica|slow burn/i);
    expect(pkg.antiDriftRules.some((rule) => /romance|slow burn/i.test(rule))).toBe(true);
  });

  it("does not treat plain horror without gothic markers as gothic identity", () => {
    expect(isHorrorGothicIdentity("horror psicologico in città")).toBe(false);
    expect(isHorrorGothicIdentity("horror gotico maniero")).toBe(true);
  });
});
