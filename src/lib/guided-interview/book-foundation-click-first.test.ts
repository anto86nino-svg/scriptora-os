import { describe, expect, it } from "vitest";
import {
  applyBestTitleOption,
  autoCompleteMissingFoundationFields,
  buildBookFoundationLock,
  confirmBookFoundationLock,
  generateChapterStructure,
  generateFoundationCast,
  generateTitleSubtitleOptions,
  getMissingFieldActions,
  LENGTH_PRESET_CONFIGS,
  resolveFoundationFlowStep,
  shouldShowFoundationFlow,
  validateBookFoundationFields,
} from "./book-foundation-lock";
import {
  buildCharacterAwareQuestionPrompt,
  createEmptyFoundationCharacter,
  forgeCastToFoundation,
  foundationCastToForge,
} from "./character-foundation-studio";
import { enrichInterviewQuestion } from "./contextual-interview";
import { getInitialInterviewState } from "./question-engine";
import { getBlueprintGateStatus } from "./blueprint-ready-gate";
import { applyExpressScenarioToState, buildCompleteExpressBookPackage } from "./express-book-package";

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

describe("click-first foundation flow", () => {
  it("shows foundation flow when genre is selected before lock", () => {
    const state = {
      ...getInitialInterviewState({ selectedGenre: "fantasy" }),
      selectedGenre: "fantasy",
      bookFoundationLocked: false,
    };
    expect(shouldShowFoundationFlow(state)).toBe(true);
    const foundation = {
      bookType: "fiction",
      genre: "fantasy",
      subgenre: "fantasy",
      language: "",
      lengthPreset: "medio" as const,
      chapterCount: 0,
      subchaptersEnabled: false,
      tone: "",
      title: "",
      subtitle: "",
      commercialHook: "",
      targetAudience: "",
      marketPromise: "",
      characters: [],
      structurePreset: "",
      confidence: 0.3,
      missingFields: ["language", "chapterCount", "title"],
      locked: false,
    };
    expect(resolveFoundationFlowStep(foundation)).toBe("setup");
  });

  it("fantasy foundation cast has rich editorial fields", () => {
    const cast = generateFoundationCast(fantasyInput);
    const lead = cast.find((c) => c.role === "protagonista");
    expect(lead?.narrativeFunction || lead?.shortDescription).toBeTruthy();
    expect(lead?.innerWound).toBeTruthy();
    expect(lead?.desire).toBeTruthy();
    expect(lead?.fear).toBeTruthy();
    expect(lead?.secret).toBeTruthy();
    expect(lead?.arcDirection).toBeTruthy();
  });

  it("dark romance generates couple with reciprocal wounds", () => {
    const cast = generateFoundationCast(darkRomanceInput);
    const lead = cast.find((c) => c.role === "protagonista");
    const love = cast.find((c) => c.role === "love interest" || c.role === "antagonista");
    expect(lead?.innerWound).toBeTruthy();
    expect(love?.innerWound || love?.secret).toBeTruthy();
    expect(love?.contradiction || love?.desire).toBeTruthy();
  });

  it("horror generates threat and emotional symbol", () => {
    const cast = generateFoundationCast(horrorInput);
    expect(cast.some((c) => c.role === "minaccia" || c.role === "antagonista")).toBe(true);
    expect(cast.some((c) => c.role === "vittima/simbolo emotivo" || c.name === "Sara")).toBe(true);
    expect(cast.find((c) => c.role === "protagonista")?.fear).toBeTruthy();
  });

  it("epic length generates extended indexed cast", () => {
    const cast = generateFoundationCast({ ...fantasyInput, lengthPreset: "epico" });
    expect(cast.length).toBeGreaterThanOrEqual(6);
    expect(cast.some((c) => c.name === "Lyra")).toBe(true);
    expect(cast.every((c) => c.roleIndex >= 1)).toBe(true);
  });

  it("user can add and edit foundation characters manually", () => {
    const manual = createEmptyFoundationCharacter("alleato");
    manual.name = "Nova";
    manual.innerWound = "Fiducia tradita";
    const merged = foundationCastToForge([manual]);
    expect(merged[0]?.name).toBe("Nova");
    expect(merged[0]?.wound).toBe("Fiducia tradita");
  });

  it("nonfiction path uses subjects not narrative cast", () => {
    const cast = generateFoundationCast(selfHelpInput);
    expect(cast[0]?.name).toBe("Lettore in trasformazione");
    expect(cast.some((c) => c.name === "Ostacolo interno")).toBe(false);
    const state = {
      ...getInitialInterviewState({ selectedGenre: "self-help" }),
      selectedGenre: "self-help",
      extracted: { genre: "self-help", language: "Italiano" },
    };
    const completed = autoCompleteMissingFoundationFields(state);
    expect(completed.nonfictionSubjects?.readerProblem).toBeTruthy();
    expect(completed.nonfictionSubjects?.methodFramework).toBeTruthy();
    expect(completed.nonfictionSubjects?.transformationPromise).toBeTruthy();
  });
});

describe("title, hook and auto-complete", () => {
  it("generateTitleSubtitleOptions creates 3 coherent options", () => {
    const options = generateTitleSubtitleOptions(fantasyInput);
    expect(options).toHaveLength(3);
    for (const opt of options) {
      expect(opt.title.length).toBeGreaterThan(2);
      expect(opt.subtitle.length).toBeGreaterThan(10);
      expect(opt.source).toBeUndefined();
    }
  });

  it("applyBestTitleOption picks a usable title", () => {
    const options = generateTitleSubtitleOptions(darkRomanceInput);
    const best = applyBestTitleOption(options);
    expect(best.title.length).toBeGreaterThan(2);
    expect(best.subtitle.length).toBeGreaterThan(10);
  });

  it("autoComplete fills missing fields without overwriting user-locked values", () => {
    const baseFoundation = {
      bookType: "fiction",
      genre: "fantasy",
      subgenre: "fantasy",
      language: "Italiano",
      lengthPreset: "medio" as const,
      chapterCount: 20,
      subchaptersEnabled: false,
      tone: "epico",
      title: "Titolo Utente",
      subtitle: "",
      commercialHook: "",
      targetAudience: "",
      marketPromise: "",
      characters: [],
      titleCandidates: [],
      hookCandidates: [],
      structurePreset: "medio",
      confidence: 0.5,
      missingFields: ["subtitle", "commercialHook", "protagonist"],
      locked: false,
      fieldProvenance: {
        title: { source: "user" as const, locked: true },
      },
    };
    const state = {
      ...getInitialInterviewState({ selectedGenre: "fantasy" }),
      selectedGenre: "fantasy",
      extracted: { genre: "fantasy", language: "Italiano", bookTitle: "Titolo Utente" },
      bookFoundation: baseFoundation,
    };
    const completed = autoCompleteMissingFoundationFields(state, baseFoundation);
    expect(completed.title).toBe("Titolo Utente");
    expect(completed.subtitle.length).toBeGreaterThan(10);
    expect(completed.commercialHook.length).toBeGreaterThan(20);
    expect(completed.foundationCharacters?.length).toBeGreaterThan(0);
    expect(completed.chapterCount).toBeGreaterThan(0);
  });

  it("missing field actions include CTA not bare errors", () => {
    const actions = getMissingFieldActions(["commercialHook", "subtitle"]);
    expect(actions[0]?.label).toMatch(/Hook mancante/i);
    expect(actions[0]?.cta).toMatch(/Genera hook/i);
    expect(actions[1]?.label).toMatch(/Sottotitolo mancante/i);
    expect(actions[1]?.cta).toMatch(/Genera/i);
  });

  it("length presets set coherent chapter counts and structure", () => {
    for (const preset of ["breve", "medio", "lungo", "epico"] as const) {
      const config = LENGTH_PRESET_CONFIGS[preset];
      const structure = generateChapterStructure({ ...fantasyInput, lengthPreset: preset }, config.chapterCount);
      expect(structure).toHaveLength(config.chapterCount);
    }
  });
});

describe("blueprint readiness with auto-repair", () => {
  it("blueprint does not start without foundation lock", () => {
    const state = {
      ...getInitialInterviewState({ selectedGenre: "fantasy" }),
      selectedGenre: "fantasy",
      bookFoundationLocked: false,
    };
    const gate = getBlueprintGateStatus(state);
    expect(gate.isBlueprintReady).toBe(false);
  });

  it("auto-repair enables blueprint when pillars complete", () => {
    const pkg = buildCompleteExpressBookPackage(
      {
        genre: "fantasy",
        language: "Italiano",
        titleMode: "suggest",
        ideaSeed: fantasyInput.ideaSeed,
        tone: "epico",
        length: "medio",
        controlLevel: "auto",
      },
      "commercial",
    );
    let state = applyExpressScenarioToState(getInitialInterviewState({ chatFirst: true }), pkg);
    state = confirmBookFoundationLock(state, autoCompleteMissingFoundationFields(state, state.bookFoundation));
    expect(validateBookFoundationFields(state.bookFoundation!)).toEqual([]);
    const gate = getBlueprintGateStatus(state);
    expect(gate.isBlueprintReady).toBe(true);
  });
});

describe("story room character-aware questions", () => {
  it("enriches conflict questions with existing cast names", () => {
    const cast = generateFoundationCast(fantasyInput);
    const state = {
      ...getInitialInterviewState({ selectedGenre: "fantasy" }),
      selectedGenre: "fantasy",
      bookFoundation: {
        ...buildBookFoundationLock(getInitialInterviewState({ selectedGenre: "fantasy" })),
        foundationCharacters: cast,
        characters: foundationCastToForge(cast),
      },
    };
    const enriched = enrichInterviewQuestion(state, {
      key: "centralConflict",
      question: "Qual è il conflitto centrale del libro?",
    });
    expect(enriched.question).not.toBe("Qual è il conflitto centrale del libro?");
    expect(enriched.question).toMatch(/Elena|protagonista/i);
  });

  it("buildCharacterAwareQuestionPrompt references mentor and threat in fantasy", () => {
    const cast = forgeCastToFoundation(
      foundationCastToForge(generateFoundationCast(fantasyInput)),
      "auto",
    );
    const prompt = buildCharacterAwareQuestionPrompt(
      "Qual è il conflitto?",
      cast,
      "fantasy",
    );
    expect(prompt).toMatch(/costo del potere|salvare|Kael|Orin/i);
  });
});
