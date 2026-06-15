import { beforeEach, describe, expect, it } from "vitest";
import type { StudySessionResult } from "@/lib/study-session";
import {
  attachStudyResult,
  createEmptyStudySession,
  deleteStudySession,
  getCurrentStudySessionId,
  getFreshStudyResult,
  isStudyResultFresh,
  listStudySessions,
  migrateLegacyStudySession,
  setCurrentStudySessionId,
  updateStudySessionSource,
} from "./session-store";

function resultFixture(title = "Rivoluzione francese"): StudySessionResult {
  return {
    title,
    sourceName: `${title}.txt`,
    words: 120,
    detectedSubject: title,
    difficulty: "medium",
    lightSummary: "Riassunto breve.",
    mediumSummary: "Riassunto medio.",
    proSummary: "Riassunto pro.",
    studyNotesPro: "Note studio.",
    openQuestions: [{ question: "Domanda?", answerGuide: "Guida." }],
    difficultWords: [],
    flashcards: [{ front: "Concetto", back: "Spiegazione" }],
    quiz: [{ question: "Quiz?", options: ["A", "B"], answer: 0, explanation: "Perché A." }],
    keyConcepts: ["Concetto"],
  };
}

describe("Study session isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts a new session without inherited results", () => {
    const session = createEmptyStudySession({ sourceText: "Nuovo testo di studio", sourceName: "nuovo.txt" });

    expect(session.results.analysis).toBeUndefined();
    expect(getFreshStudyResult(session)).toBeNull();
  });

  it("invalidates old results when source text changes", () => {
    const sessionA = createEmptyStudySession({
      sourceText: "Materiale A con contenuto di storia moderna.",
      sourceName: "materiale-a.txt",
    });
    const withResult = attachStudyResult(sessionA, resultFixture("Materiale A"));
    const changed = updateStudySessionSource(withResult, {
      sourceText: "Materiale B con contenuto completamente diverso.",
      sourceName: "materiale-b.txt",
    });

    expect(changed.sourceChanged).toBe(true);
    expect(changed.session.results.analysis).toBeUndefined();
    expect(getFreshStudyResult(changed.session)).toBeNull();
  });

  it("does not render a result envelope tied to another source hash", () => {
    const sessionA = attachStudyResult(
      createEmptyStudySession({ sourceText: "Materiale A", sourceName: "a.txt" }),
      resultFixture("A"),
    );
    const sessionB = updateStudySessionSource(sessionA, {
      sourceText: "Materiale B",
      sourceName: "b.txt",
    }).session;

    expect(isStudyResultFresh(sessionB, sessionA.results.analysis)).toBe(false);
  });

  it("saves, lists and deletes isolated sessions", () => {
    const saved = attachStudyResult(
      createEmptyStudySession({ sourceText: "Sessione da archiviare", sourceName: "archivio.txt" }),
      resultFixture("Archivio"),
    );

    expect(listStudySessions().map((session) => session.id)).toContain(saved.id);
    deleteStudySession(saved.id);
    expect(listStudySessions().map((session) => session.id)).not.toContain(saved.id);
  });

  it("imports legacy study data as previous work without making it active", () => {
    localStorage.setItem(
      "scriptora-study-session-v1",
      JSON.stringify({
        rawText: "Vecchio materiale salvato prima del modello sessioni.",
        result: resultFixture("Vecchia sessione"),
      }),
    );
    setCurrentStudySessionId(null);

    const imported = migrateLegacyStudySession();

    expect(imported?.title).toMatch(/Sessione precedente importata/);
    expect(listStudySessions().some((session) => session.id === imported?.id)).toBe(true);
    expect(getCurrentStudySessionId()).toBeNull();
  });
});
