import { describe, expect, it } from "vitest";
import {
  autoFillBookFoundationIfNeeded,
  buildBookFoundationLock,
  confirmBookFoundationLock,
  generateCommercialHookOptions,
  generateGenreAwareCharacters,
  generateTitleSubtitleOptions,
  isBookFoundationComplete,
  isBookFoundationLocked,
  LENGTH_PRESET_CONFIGS,
  normalizeLengthPreset,
  validateBookFoundationFields,
  validateBookFoundationLock,
  validateFoundationFieldsFromSeed,
} from "./book-foundation-lock";
import { getBlueprintGateStatus } from "./blueprint-ready-gate";
import { validateForgeHandoffForBlueprint, buildForgeInterviewSeed } from "./forge-blueprint-handoff";
import { applyExpressScenarioToState, buildCompleteExpressBookPackage } from "./express-book-package";
import { getInitialInterviewState } from "./question-engine";
import { isMetadataOnly } from "./blueprint-ready-summary";

const fantasyInput = {
  genre: "fantasy",
  language: "Italiano",
  ideaSeed: "Elena scopre che il fratello è stato scelto dalla Selva e deve fidarsi di Kael",
  tone: "epico",
  lengthPreset: "medio" as const,
};

const darkRomanceInput = {
  genre: "dark romance",
  language: "Italiano",
  ideaSeed: "una restauratrice torna nella villa dove sua sorella è morta in un incendio doloso",
  tone: "oscuro",
  lengthPreset: "medio" as const,
};

const horrorInput = {
  genre: "horror",
  language: "Italiano",
  ideaSeed: "Luca torna nella casa abbandonata dove la famiglia ha seppellito la verità",
  tone: "crudo",
  lengthPreset: "breve" as const,
};

const selfHelpInput = {
  genre: "self-help",
  language: "Italiano",
  ideaSeed:
    "aiutare persone bloccate dalla paura del fallimento a ricostruire fiducia, disciplina e direzione in 30 giorni",
  tone: "pratico",
  lengthPreset: "medio" as const,
};

describe("generateGenreAwareCharacters", () => {
  it("fantasy generates protagonist, mentor, antagonist with magic stakes", () => {
    const chars = generateGenreAwareCharacters(fantasyInput);
    expect(chars.some((c) => c.role === "protagonist" && c.name === "Elena")).toBe(true);
    expect(chars.some((c) => c.role === "supporting" && c.name === "Orin")).toBe(true);
    expect(chars.some((c) => c.role === "antagonist")).toBe(true);
    expect(chars.find((c) => c.role === "protagonist")?.secret).toMatch(/potere|origine/i);
  });

  it("dark romance generates central couple, reciprocal wound, forbidden attraction", () => {
    const chars = generateGenreAwareCharacters(darkRomanceInput);
    const lead = chars.find((c) => c.role === "protagonist");
    const love = chars.find((c) => c.role === "antagonist");
    expect(lead?.name).toBeTruthy();
    expect(love?.name).toBe("Marco");
    expect(love?.secret).toMatch(/proibit|trauma/i);
    expect(lead?.wound).toBeTruthy();
    expect(love?.wound).toBeTruthy();
  });

  it("horror generates threat, primary fear, ally", () => {
    const chars = generateGenreAwareCharacters(horrorInput);
    expect(chars.some((c) => c.role === "protagonist")).toBe(true);
    expect(chars.some((c) => c.name === "La minaccia")).toBe(true);
    expect(chars.some((c) => c.name === "Sara")).toBe(true);
    expect(chars.find((c) => c.role === "protagonist")?.fear).toBeTruthy();
  });

  it("self-help generates idealReader, readerProblem, method via nonfiction subjects path", () => {
    const chars = generateGenreAwareCharacters(selfHelpInput);
    expect(chars[0]?.name).toBe("Lettore in trasformazione");
    expect(chars[0]?.wound).toMatch(/bloccat|fallimento|paura/i);
    expect(chars.some((c) => c.name === "Ostacolo interno")).toBe(false);
    const nf = buildCompleteExpressBookPackage(
      {
        genre: "self-help",
        language: "Italiano",
        titleMode: "suggest",
        ideaSeed: selfHelpInput.ideaSeed,
        tone: "pratico",
        length: "medio",
        controlLevel: "scenarios",
      },
      "commercial",
    );
    expect(nf.readerProblem).toBeTruthy();
    expect(nf.transformationPromise).toBeTruthy();
    expect(nf.methodFramework).toBeTruthy();
    expect(nf.exercises?.length).toBeGreaterThan(2);
  });
});

describe("generateTitleSubtitleOptions", () => {
  it("produces 3 distinct options", () => {
    for (const input of [fantasyInput, darkRomanceInput, selfHelpInput]) {
      const options = generateTitleSubtitleOptions(input);
      expect(options).toHaveLength(3);
      const titles = new Set(options.map((o) => o.title));
      expect(titles.size).toBe(3);
      for (const opt of options) {
        expect(opt.title.length).toBeGreaterThan(2);
        expect(opt.subtitle.length).toBeGreaterThan(10);
        expect(opt.commercialReason.length).toBeGreaterThan(5);
      }
    }
  });
});

describe("generateCommercialHookOptions", () => {
  it("produces hooks that are not metadata", () => {
    for (const input of [fantasyInput, selfHelpInput, horrorInput]) {
      const hooks = generateCommercialHookOptions(input);
      expect(hooks).toHaveLength(3);
      for (const h of hooks) {
        expect(h.hook.length).toBeGreaterThan(30);
        expect(isMetadataOnly(h.hook)).toBe(false);
      }
    }
  });
});

describe("length presets", () => {
  it("breve/medio/lungo/epico set coherent chapter counts", () => {
    expect(LENGTH_PRESET_CONFIGS.breve.chapterCount).toBeGreaterThanOrEqual(8);
    expect(LENGTH_PRESET_CONFIGS.medio.chapterCount).toBeGreaterThanOrEqual(16);
    expect(LENGTH_PRESET_CONFIGS.lungo.chapterCount).toBeGreaterThanOrEqual(30);
    expect(LENGTH_PRESET_CONFIGS.epico.chapterCount).toBeGreaterThanOrEqual(60);
    expect(normalizeLengthPreset("pro")).toBe("epico");
  });
});

describe("Book Foundation Lock validation", () => {
  it("incomplete foundation reports missingFields on empty extracted seed", () => {
    const state = {
      ...getInitialInterviewState({ chatFirst: true }),
      extracted: {},
      characters: undefined,
    };
    expect(isBookFoundationLocked(state)).toBe(false);
    const missing = validateFoundationFieldsFromSeed({
      extracted: {},
      characters: [],
    });
    expect(missing.length).toBeGreaterThan(0);
    expect(isBookFoundationLocked(state)).toBe(false);
  });

  it("complete locked foundation allows blueprint gate", () => {
    const pkg = buildCompleteExpressBookPackage(
      {
        genre: "fantasy",
        language: "Italiano",
        titleMode: "suggest",
        ideaSeed: fantasyInput.ideaSeed,
        tone: "epico",
        length: "medio",
        controlLevel: "scenarios",
      },
      "commercial",
    );
    let state = applyExpressScenarioToState(getInitialInterviewState({ chatFirst: true }), pkg);
    state = confirmBookFoundationLock(state, state.bookFoundation);
    expect(isBookFoundationLocked(state)).toBe(true);
    expect(validateBookFoundationLock(state).missingFields).toEqual([]);
    const gate = getBlueprintGateStatus(state);
    expect(gate.foundationComplete).toBe(true);
  });

  it("standard interview cannot pass handoff without core foundation fields", () => {
    const applied = getInitialInterviewState({ chatFirst: true });
    const seed = buildForgeInterviewSeed(applied);
    const handoff = validateForgeHandoffForBlueprint(seed);
    expect(handoff.ready).toBe(false);
    expect(handoff.missing.length).toBeGreaterThan(0);
  });

  it("auto mode auto-generates and locks missing fields", () => {
    const pkg = buildCompleteExpressBookPackage(
      {
        genre: "self-help",
        language: "Italiano",
        titleMode: "suggest",
        ideaSeed: selfHelpInput.ideaSeed,
        tone: "pratico",
        length: "medio",
        controlLevel: "auto",
      },
      "commercial",
    );
    let state = applyExpressScenarioToState(
      {
        ...getInitialInterviewState({ chatFirst: true }),
        expressConfig: {
          genre: "self-help",
          language: "Italiano",
          titleMode: "suggest",
          ideaSeed: selfHelpInput.ideaSeed,
          tone: "pratico",
          length: "medio",
          controlLevel: "auto",
        },
      },
      pkg,
    );
    state = autoFillBookFoundationIfNeeded(state);
    expect(state.bookFoundation?.title).toBeTruthy();
    expect(state.bookFoundation?.commercialHook).toBeTruthy();
    if (state.bookFoundationLocked) {
      const handoff = validateForgeHandoffForBlueprint(buildForgeInterviewSeed(state));
      expect(handoff.missing).not.toContain("hook");
    }
  });
});

describe("Studio Express foundation package fields", () => {
  it("fantasy package has title, subtitle, hook and characters", () => {
    const pkg = buildCompleteExpressBookPackage(
      {
        genre: "fantasy",
        language: "Italiano",
        titleMode: "suggest",
        ideaSeed: fantasyInput.ideaSeed,
        tone: "epico",
        length: "medio",
        controlLevel: "scenarios",
      },
      "commercial",
    );
    expect(pkg.title.length).toBeGreaterThan(2);
    expect(pkg.subtitle.length).toBeGreaterThan(10);
    expect(pkg.hook.length).toBeGreaterThan(20);
    expect(pkg.characters.length).toBeGreaterThanOrEqual(2);
  });
});
