import { describe, expect, it } from "vitest";
import {
  applyMemorabilityLocalPatch,
  evaluateMemorability,
  MAX_QUALITY_REPAIR_ATTEMPTS,
  runMemorabilityPreHumanPass,
  shouldApplyMemorabilityLocalPatch,
} from "./memorability-engine";

const GENERIC_ROMANCE = `Si guardarono negli occhi profondi. Il cuore le batteva forte.
«Capisco che tu abbia paura», disse lui dolcemente. «La verità è che ti amo.»
Lei annuì. Si abbracciarono e tutto sembrò finalmente a posto. Nulla sarebbe stato più come prima.`;

const DISTINCTIVE_THRILLER = `La chiave nera odorava di cera e pioggia vecchia sul palmo di Elena.
Lui non spiegò nulla: passò il pollice sul bordo del bicchiere e lasciò cadere solo: «Forse non oggi.»
Lei non rispose. Ma la distanza tra loro restò, sottile e non ancora risolta.`;

describe("memorability-engine", () => {
  it("scores predictable romance lower than distinctive thriller", () => {
    const generic = evaluateMemorability(GENERIC_ROMANCE, { language: "Italian", genre: "romance" });
    const distinctive = evaluateMemorability(DISTINCTIVE_THRILLER, {
      language: "Italian",
      genre: "thriller",
      bookTitle: "La chiave nera",
      chapterTitle: "Cera e pioggia",
    });

    expect(generic.scores.memorability).toBeLessThan(distinctive.scores.memorability);
    expect(generic.scores.predictability).toBeGreaterThan(distinctive.scores.predictability);
    expect(generic.issues.some((i) => i.kind === "predictable_trope" || i.kind === "explained_dialogue")).toBe(true);
  });

  it("local patch does not empty chapter", () => {
    const report = evaluateMemorability(GENERIC_ROMANCE, { language: "Italian" });
    expect(shouldApplyMemorabilityLocalPatch(report)).toBe(true);

    const patched = applyMemorabilityLocalPatch(GENERIC_ROMANCE, report.localPatchHints, "Italian");
    expect(patched.length).toBeGreaterThan(GENERIC_ROMANCE.length * 0.9);
    expect(patched.trim().length).toBeGreaterThan(50);
  });

  it("pre-human pass applies local patch when needed", () => {
    const result = runMemorabilityPreHumanPass(GENERIC_ROMANCE, { language: "Italian", genre: "romance" });
    expect(result.appliedLocalPatch).toBe(true);
    expect(result.text.length).toBeGreaterThanOrEqual(GENERIC_ROMANCE.length);
  });

  it("exposes retry cap constant at 2", () => {
    expect(MAX_QUALITY_REPAIR_ATTEMPTS).toBe(2);
  });

  it("returns top problems and improvements", () => {
    const report = evaluateMemorability(GENERIC_ROMANCE, { language: "Italian" });
    expect(report.problems.length).toBeGreaterThan(0);
    expect(report.improvements.length).toBeGreaterThan(0);
    expect(report.scores.narrativeQuality).toBeGreaterThan(0);
    expect(report.scores.dialogue).toBeGreaterThan(0);
  });
});
