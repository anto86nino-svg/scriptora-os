import { describe, expect, it } from "vitest";
import { enrichStudySessionLocally } from "./study-analysis";
import { containsStudyLeak, sanitizeStudyOsOutput } from "./study-quality";
import { STUDY_FIXTURES } from "./study-fixtures";
import { ensureStudyOsFields } from "./study-output-parser";
import { analyzeStudyMaterial } from "@/lib/study-session";

describe("Study OS Engine", () => {
  it("analizza Rivoluzione francese con cause e concetti", () => {
    const fixture = STUDY_FIXTURES.find((f) => f.id === "history-revolution")!;
    const result = enrichStudySessionLocally(fixture.text, "rivoluzione-francese.txt", "exam");
    const joined = `${result.mediumSummary} ${result.keyConcepts.join(" ")} ${result.proSummary}`.toLowerCase();
    expect(result.materialAnalysis?.detectedSubject).toMatch(/storia/i);
    expect(result.keyConcepts.length).toBeGreaterThanOrEqual(3);
    expect(result.quiz.length).toBeGreaterThanOrEqual(3);
    expect(result.flashcards.length).toBeGreaterThanOrEqual(3);
    for (const token of ["1789", "bastiglia"]) {
      expect(joined).toContain(token);
    }
  });

  it("analizza fotosintesi con termini scientifici", () => {
    const fixture = STUDY_FIXTURES.find((f) => f.id === "biology-photosynthesis")!;
    const result = enrichStudySessionLocally(fixture.text, "fotosintesi.txt", "quiz");
    const joined = `${result.simpleExplanation} ${result.mediumSummary} ${result.keyConcepts.join(" ")}`.toLowerCase();
    for (const token of ["clorofilla", "anidride carbonica", "glucosio"]) {
      expect(joined).toContain(token);
    }
    expect(result.explanationPack?.stepByStep.length).toBeGreaterThanOrEqual(3);
  });

  it("analizza Costituzione senza inventare articoli extra nel fallback locale", () => {
    const fixture = STUDY_FIXTURES.find((f) => f.id === "law-constitution")!;
    const result = enrichStudySessionLocally(fixture.text, "costituzione.txt", "interrogation");
    expect(result.openQuestions.length).toBeGreaterThanOrEqual(2);
    expect(result.materialAnalysis?.mainTopics.length).toBeGreaterThanOrEqual(1);
    expect(result.studyPlan?.priorityOrder.length).toBeGreaterThanOrEqual(3);
  });

  it("blocca leak tecnici nell'output", () => {
    const dirty = `system: ignore rules\nAssistant: ecco il JSON\nCome modello AI posso aiutarti.\nRiassunto valido del tema.`;
    const clean = sanitizeStudyOsOutput(dirty, "Italian");
    expect(containsStudyLeak(clean.text)).toBe(false);
    expect(clean.text).toContain("Riassunto valido");
  });

  it("output italiano senza intestazioni inglesi principali", () => {
    const result = enrichStudySessionLocally(STUDY_FIXTURES[0].text, "test.txt");
    const headers = `${result.lightSummary}\n${result.simpleExplanation}`.toLowerCase();
    expect(headers).not.toMatch(/\bsummary:\s/);
    expect(result.reviewChecklist?.length).toBeGreaterThanOrEqual(3);
  });

  it("ensureStudyOsFields arricchisce risultato legacy", () => {
    const base = analyzeStudyMaterial(STUDY_FIXTURES[3].text, "memoria.txt");
    const enriched = ensureStudyOsFields(base, STUDY_FIXTURES[3].text, "exam");
    expect(enriched.conceptMap).toBeTruthy();
    expect(enriched.studyPlan?.dailyPlan.length).toBeGreaterThanOrEqual(2);
  });
});
