import { describe, expect, it } from "vitest";
import {
  applyExpressScenarioToState,
  buildCompleteExpressBookPackage,
  buildExpressBookScenarios,
  ensureExpressBookPackageCompleteness,
  validateExpressPackageReadiness,
} from "./express-book-package";
import { confirmBookFoundationLock } from "./book-foundation-lock";
import { buildExpressForgeConfiguration } from "./express-forge-config";
import { finalizeForgeForBlueprint } from "./forge-evolution-engine";
import {
  buildForgeInterviewSeed,
  validateForgeHandoffForBlueprint,
} from "./forge-blueprint-handoff";
import { isMetadataOnly } from "./blueprint-ready-summary";
import { applyBlueprintReadySummaryToState } from "./blueprint-ready-summary";
import { validateBookReadinessForBlueprint } from "@/lib/book-config-engine/blueprint-readiness";
import { enrichBookConfigFromForgeSeed } from "./forge-writer-bridge";
import { getInitialInterviewState } from "./question-engine";

const DARK_ROMANCE_IDEA =
  "una restauratrice torna nella villa dove sua sorella è morta in un incendio doloso";

const expressInput = {
  genre: "dark romance",
  language: "Italiano",
  titleMode: "suggest" as const,
  ideaSeed: DARK_ROMANCE_IDEA,
  tone: "oscuro",
  length: "medio" as const,
  controlLevel: "scenarios" as const,
};

const selfHelpInput = {
  genre: "self-help",
  language: "Italiano",
  titleMode: "suggest" as const,
  ideaSeed:
    "aiutare persone bloccate dalla paura del fallimento a ricostruire fiducia, disciplina e direzione in 30 giorni",
  tone: "pratico",
  length: "medio" as const,
  controlLevel: "scenarios" as const,
};

describe("buildCompleteExpressBookPackage — self-help", () => {
  it("does not produce fiction synopsis or restauratrice template", () => {
    const pkg = buildCompleteExpressBookPackage(selfHelpInput, "commercial");
    expect(pkg.editorialSynopsis).not.toContain("restauratrice");
    expect(pkg.editorialSynopsis).not.toContain("villa");
    expect(pkg.protagonist.toLowerCase()).not.toContain("elena");
  });

  it("includes nonfiction package fields", () => {
    const commercial = buildCompleteExpressBookPackage(selfHelpInput, "commercial");
    expect(commercial.readerProblem).toBeTruthy();
    expect(commercial.transformationPromise).toBeTruthy();
    expect(commercial.methodFramework).toBeTruthy();
    expect(commercial.exercises?.length).toBeGreaterThan(3);
    expect(commercial.reflectionPrompts?.length).toBeGreaterThan(2);
    expect(commercial.idealReader).toBeTruthy();
    expect(commercial.subtitle.length).toBeGreaterThan(10);
    expect(commercial.chapterBlueprintSeeds[0]?.title).toMatch(/problema|lettore/i);
  });

  it("uses Practical / Transformative / Deep scenario labels", () => {
    const scenarios = buildExpressBookScenarios(selfHelpInput);
    expect(scenarios.map((s) => s.label)).toEqual([
      "Libro A — Practical",
      "Libro B — Transformative",
      "Libro C — Deep / Premium",
    ]);
  });

  it("applyExpressScenarioToState sets nonfiction book type", () => {
    const pkg = buildCompleteExpressBookPackage(selfHelpInput, "commercial");
    let next = applyExpressScenarioToState(getInitialInterviewState({ chatFirst: true }), pkg);
    next = confirmBookFoundationLock(next, next.bookFoundation);
    expect(next.selectedBookType).not.toBe("Romanzo");
    expect(next.extracted?.readerTransformation).toBeTruthy();
    expect(next.extracted?.centralConflict).toBe(pkg.readerProblem);
  });
});

describe("buildCompleteExpressBookPackage", () => {
  it("produces editorial synopsis not metadata", () => {
    const pkg = buildCompleteExpressBookPackage(expressInput, "commercial");
    expect(pkg.editorialSynopsis.length).toBeGreaterThan(120);
    expect(isMetadataOnly(pkg.editorialSynopsis)).toBe(false);
    expect(pkg.editorialSynopsis).toContain("restauratrice");
    expect(pkg.marketPromise).not.toContain("Romanzo · Dark Romance");
    expect(isMetadataOnly(pkg.marketPromise)).toBe(false);
  });

  it("fills all critical narrative fields", () => {
    const pkg = buildCompleteExpressBookPackage(expressInput, "bold");
    expect(pkg.protagonist).toBeTruthy();
    expect(pkg.antagonistOrLoveInterest).toBeTruthy();
    expect(pkg.setting).toBeTruthy();
    expect(pkg.hook.length).toBeGreaterThan(20);
    expect(pkg.subtitle.length).toBeGreaterThan(10);
    expect(pkg.centralConflict).toBeTruthy();
    expect(pkg.stakes).toBeTruthy();
    expect(pkg.chapterCount).toBeGreaterThan(0);
    expect(pkg.chapterBlueprintSeeds.length).toBe(pkg.chapterCount);
    expect(pkg.chapterBlueprintSeeds[0]!.subchapters).toEqual([]);
    expect(pkg.chapterBlueprintSeeds[0]!.id).toBeTruthy();
    expect(pkg.chapterBlueprintSeeds[0]!.expectedSetting).toBeTruthy();
    expect(pkg.characters.length).toBeGreaterThanOrEqual(2);
    expect(pkg.characters[0]?.name?.length).toBeGreaterThan(1);
    expect(pkg.frontMatter).toBeTruthy();
    expect(pkg.backMatter).toBeTruthy();
    expect(pkg.keyScenes.length).toBe(4);
  });

  it("builds 3 complete scenarios", () => {
    const scenarios = buildExpressBookScenarios(expressInput);
    expect(scenarios).toHaveLength(3);
    expect(scenarios.map((s) => s.variant)).toEqual(["safe", "commercial", "bold"]);
    for (const s of scenarios) {
      expect(s.editorialSynopsis.length).toBeGreaterThan(80);
      expect(s.blueprintReadiness).toBe("complete");
    }
  });
});

describe("express end-to-end readiness", () => {
  it("applyExpressScenarioToState passes forge handoff validation", () => {
    const { packages, state } = buildExpressForgeConfiguration(expressInput);
    const selected = packages[1]!;
    let next = applyExpressScenarioToState(state, selected);
    next = confirmBookFoundationLock(next, next.bookFoundation);
    next = applyBlueprintReadySummaryToState(next);
    next = finalizeForgeForBlueprint(next);

    const seed = buildForgeInterviewSeed(next);
    const handoff = validateForgeHandoffForBlueprint(seed);
    expect(handoff.ready, handoff.missing.join(", ")).toBe(true);
    expect(handoff.missing).not.toContain("characters");
    expect(handoff.missing).not.toContain("hook");
    expect(handoff.missing).not.toContain("sottotitolo");
    expect(handoff.missing).not.toContain("promessa");
    expect(handoff.missing).not.toContain("canon");
  });

  it("validateExpressPackageReadiness reports complete package", () => {
    const { packages, state } = buildExpressForgeConfiguration(expressInput);
    let applied = applyExpressScenarioToState(state, packages[0]!);
    applied = confirmBookFoundationLock(applied, applied.bookFoundation);
    const readiness = validateExpressPackageReadiness(applied);
    expect(readiness.handoffMissing).toEqual([]);
    expect(readiness.ready).toBe(true);
  });

  it("enriched book config passes blueprint readiness for narrative", () => {
    const { packages, state } = buildExpressForgeConfiguration(expressInput);
    let applied = applyExpressScenarioToState(state, packages[0]!);
    applied = confirmBookFoundationLock(applied, applied.bookFoundation);
    const seed = buildForgeInterviewSeed(finalizeForgeForBlueprint(applied));
    const config = enrichBookConfigFromForgeSeed(
      {
        title: seed.extracted?.bookTitle ?? "Test",
        subtitle: seed.extracted?.bookSubtitle ?? "",
        language: "Italian",
        genre: "dark-romance",
        subcategory: "dark romance",
        subgenre: "dark romance",
        idea: packages[0]!.editorialSynopsis,
        targetReader: seed.extracted?.targetReader ?? "",
        tone: seed.extracted?.emotionalTone ?? "oscuro",
        numberOfChapters: packages[0]!.chapterCount,
        authorStyle: "Autorevole ma umano",
        configStatus: "validated",
      } as import("@/types/book").BookConfig,
      seed,
    );
    const report = validateBookReadinessForBlueprint(config);
    expect(report.blockingIssues).toEqual([]);
    expect(report.missingFields).toEqual([]);
    expect(hasNamedCharacter(config)).toBe(true);
  });
});

function hasNamedCharacter(config: import("@/types/book").BookConfig): boolean {
  return Boolean(config.characters?.some((c) => String(c.name).length >= 2));
}

describe("buildExpressForgeConfiguration", () => {
  it("returns 3 packages from minimal input", () => {
    const result = buildExpressForgeConfiguration(expressInput, getInitialInterviewState({ chatFirst: true }));
    expect(result.packages).toHaveLength(3);
    expect(result.state.forgeMode).toBe("express");
    expect(result.state.blueprintScenarios?.[0]?.editorialSynopsis).toBeTruthy();
  });

  it("ensureExpressBookPackageCompleteness fills gaps", () => {
    const { packages, state } = buildExpressForgeConfiguration(expressInput);
    const ensured = ensureExpressBookPackageCompleteness(applyExpressScenarioToState(state, packages[0]!));
    expect(ensured.characters?.length).toBeGreaterThan(0);
    expect(ensured.extracted?.openingHook).toBeTruthy();
    expect(ensured.extracted?.bookSubtitle).toBeTruthy();
  });
});
