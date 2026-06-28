import { describe, expect, it } from "vitest";
import { resolveCharacterStudioFormatUiProfile } from "./format-aware-ui";

describe("Character Studio format-aware UI", () => {
  it("hides narrative fields for poetry collections", () => {
    const profile = resolveCharacterStudioFormatUiProfile({ bookFormat: "poetry_collection", genre: "poetry" });

    expect(profile.studioId).toBe("poetry");
    expect(profile.studioTitle).toBe("POESIE E RACCOLTE");
    expect(profile.generatorName).toBe("Poetry Collection Generator");
    expect(profile.showNarrativeFields).toBe(false);
    expect(profile.showCharacterFields).toBe(false);
    expect(profile.showPoetryFields).toBe(true);
    expect(`${profile.ideaLabel} ${profile.subjectLabel} ${profile.methodLabel}`).not.toMatch(/romanzo|protagonista|cast/i);
    expect(profile.countLabel).toMatch(/poesie/i);
  });

  it("hides characters and narrative ending for manuals", () => {
    const profile = resolveCharacterStudioFormatUiProfile({ bookFormat: "manual", genre: "self help" });

    expect(profile.studioId).toBe("professional_guide");
    expect(profile.studioTitle).toBe("MANUALI E GUIDE PROFESSIONALI");
    expect(profile.showNarrativeFields).toBe(false);
    expect(profile.showCharacterFields).toBe(false);
    expect(profile.showManualFields).toBe(true);
    expect(profile.subjectLabel).toMatch(/problema/i);
    expect(profile.methodLabel).toMatch(/metodo|framework/i);
  });

  it("surfaces worksheets and exercises for workbooks", () => {
    const profile = resolveCharacterStudioFormatUiProfile({ bookFormat: "workbook", genre: "self-help" });

    expect(profile.studioId).toBe("workbook");
    expect(profile.studioTitle).toBe("ESERCIZI E WORKBOOK");
    expect(profile.showWorkbookFields).toBe(true);
    expect(profile.countLabel).toMatch(/schede/i);
    expect(profile.sectionCountLabel).toMatch(/attivita|scheda/i);
    expect(profile.step4Description).toMatch(/schede|esercizi|tracker/i);
  });

  it("surfaces modules, quiz and flashcards for study material", () => {
    const profile = resolveCharacterStudioFormatUiProfile({ bookFormat: "study_material", genre: "education" });

    expect(profile.studioId).toBe("study");
    expect(profile.studioTitle).toBe("STUDIO E FORMAZIONE");
    expect(profile.showStudyFields).toBe(true);
    expect(profile.countLabel).toMatch(/moduli/i);
    expect(profile.step4Description).toMatch(/moduli|quiz|flashcard/i);
    expect(profile.ideaLabel).toMatch(/materiale|materia/i);
  });
});
