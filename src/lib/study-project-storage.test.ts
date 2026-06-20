import { beforeEach, describe, expect, it } from "vitest";
import { saveStudyProject } from "./study-project-storage";
import type { StudySessionResult } from "./study-session";

function resultFixture(): StudySessionResult {
  return {
    title: "Pagina fotografata",
    sourceName: "pagina.heic",
    words: 60,
    detectedSubject: "Storia",
    difficulty: "medium",
    lightSummary: "Sintesi breve.",
    mediumSummary: "Sintesi media.",
    proSummary: "Sintesi completa.",
    studyNotesPro: "Note.",
    openQuestions: [],
    difficultWords: [],
    flashcards: [],
    quiz: [],
    keyConcepts: [],
  };
}

describe("study project storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists camera/image materials as image source type", () => {
    const saved = saveStudyProject({
      title: "Pagina fotografata",
      sourceName: "pagina.heic",
      rawText: "Rivoluzione francese monarchia repubblica costituzione assemblea.",
      result: resultFixture(),
    });

    expect(saved.sourceType).toBe("image");
  });
});
