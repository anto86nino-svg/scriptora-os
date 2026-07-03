import { describe, expect, it } from "vitest";
import {
  canAdvanceToStep,
  isNarrativeReadyForBlueprint,
  isStepComplete,
  stepCompletionHint,
  NARRATIVE_STEP_BLOCKED_MESSAGE,
  type BookForgeWizardState,
} from "./step-completion";

function baseState(overrides: Partial<BookForgeWizardState> = {}): BookForgeWizardState {
  return {
    language: "Italian",
    bookTypeId: "romance",
    genre: "romance",
    subgenre: "",
    idea: "",
    title: "",
    targetReader: "",
    tone: "",
    subtitle: "",
    authorName: "",
    identityBasicsOk: false,
    pov: "",
    chapters: 18,
    bookLength: "medium",
    structureType: "tre atti",
    narrativePromise: "",
    coreConflict: "",
    setting: "",
    openingHook: "",
    protagonist: "",
    shouldUseCharacterForge: true,
    hasNamedCharacter: false,
    canonRules: "",
    forbiddenContent: "",
    validationIssueCount: 0,
    commercialGoal: "",
    shortDescription: "",
    blueprintPreview: false,
    foundationsConfirmed: true,
    ...overrides,
  };
}

describe("book forge step completion", () => {
  it("blocks step 1 until idea or title is present on step 0", () => {
    const incomplete = baseState({ foundationsConfirmed: false });
    expect(isStepComplete(0, incomplete)).toBe(false);
    expect(canAdvanceToStep(1, incomplete)).toBe(false);

    const withIdea = baseState({
      foundationsConfirmed: true,
      idea: "Un thriller psicologico su una stazione abbandonata dove ogni notte qualcuno sparisce senza lasciare tracce.",
    });
    expect(isStepComplete(0, withIdea)).toBe(true);
    expect(canAdvanceToStep(1, withIdea)).toBe(true);
  });

  it("blocks narrativa step until protagonist, conflict and objective are present", () => {
    const incomplete = baseState({
      idea: "Romanzo dark romance con ferite emotive, slow burn e tensione morale in città notturna.",
      title: "Il Patto delle Ombre",
      authorName: "Lua Galli",
      targetReader: "Lettrici romance adulte che amano tensione emotiva e payoff lento.",
      bookLength: "medium",
    });
    expect(isStepComplete(3, incomplete)).toBe(false);
    expect(stepCompletionHint(3, incomplete)).toBe(NARRATIVE_STEP_BLOCKED_MESSAGE);

    const complete = baseState({
      ...incomplete,
      protagonist: "Mara",
      coreConflict: "Deve scegliere tra verità e protezione della famiglia.",
      narrativePromise: "Una donna scopre che il passato non è mai davvero sepolto.",
    });
    expect(isStepComplete(3, complete)).toBe(true);
  });

  it("allows narrativa step when auto-generation was approved", () => {
    const approved = baseState({ narrativeAutoApproved: true });
    expect(isStepComplete(3, approved)).toBe(true);
  });

  it("blocks blueprint when narrative structure is incomplete", () => {
    const incomplete = baseState({ genre: "thriller", chapters: 12, structureType: "tre atti" });
    expect(isNarrativeReadyForBlueprint(incomplete)).toBe(false);

    const ready = baseState({
      genre: "thriller",
      chapters: 12,
      structureType: "tre atti",
      protagonist: "Luca",
      coreConflict: "Indaga su visioni che predicono morti reali.",
      narrativePromise: "Ogni notte alle 03:17 il futuro bussa alla porta.",
    });
    expect(isNarrativeReadyForBlueprint(ready)).toBe(true);
  });

  it("blocks step 6 until validation issues are cleared on step 5", () => {
    const through4 = baseState({
      idea: "Fantasy epico su un regno dimenticato e un eroe che deve recuperare la memoria del mondo.",
      title: "La Cattedrale delle Anime",
      authorName: "Lua Galli",
      tone: "epico, sensoriale, cinematografico",
      narrativePromise: "Un viaggio di redenzione attraverso un mondo che ha dimenticato la propria storia.",
      protagonist: "Mara",
      hasNamedCharacter: true,
      coreConflict: "Recuperare la memoria del mondo prima che svanisca.",
      validationIssueCount: 2,
    });
    expect(isStepComplete(5, through4)).toBe(false);
    expect(canAdvanceToStep(6, through4)).toBe(false);

    const ready = baseState({ ...through4, validationIssueCount: 0 });
    expect(isStepComplete(5, ready)).toBe(true);
    expect(canAdvanceToStep(6, ready)).toBe(true);
  });

  it("requires blueprint preview before approval step is complete", () => {
    const preBlueprint = baseState({ blueprintPreview: false });
    expect(isStepComplete(7, preBlueprint)).toBe(false);

    const approved = baseState({ blueprintPreview: true });
    expect(isStepComplete(7, approved)).toBe(true);
  });
});
