import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import { evaluateStudyTextQuality } from "@/lib/study-os/study-quality-gates";
import { getSummaryModeLabels } from "@/lib/study-os/study-summary-labels";
import {
  WWI_FORBIDDEN_CONCEPTS,
  WWI_REQUIRED_CONCEPTS,
  WWI_SCHOOL_TEXT,
  WWI_SUMMARY_REQUIRED_TERMS,
} from "@/lib/study-os/fixtures/wwi-school-text";
import { isExtractiveSummaryDefect } from "@/lib/study-os/study-summary-composer";
import { isRealStudyDefinition } from "@/lib/study-os/study-vocabulary";

describe("Prima guerra mondiale regression", () => {
  const result = analyzeStudyMaterial(WWI_SCHOOL_TEXT, "prima-guerra-mondiale.txt", {
    studySubject: "history",
    studyGoal: "exam_prep",
    difficultyLevel: 3,
    studyMaterialType: "school_notes",
  });

  it("passes text quality gate with score >= 90 and no structure warning", () => {
    const report = evaluateStudyTextQuality(WWI_SCHOOL_TEXT, { sourceType: "txt" });

    expect(report.status).toBe("pass");
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.detectedIssues.join(" ")).not.toMatch(/frasi senza struttura minima/i);
  });

  it("extracts valid historical concepts and rejects garbage fragments", () => {
    const concepts = result.keyConcepts.map((item) => item.toLowerCase());

    for (const forbidden of WWI_FORBIDDEN_CONCEPTS) {
      expect(result.keyConcepts).not.toEqual(expect.arrayContaining([forbidden]));
      expect(concepts).not.toContain(forbidden.toLowerCase());
    }

    const matchedRequired = WWI_REQUIRED_CONCEPTS.filter((term) =>
      concepts.some((concept) => concept.toLowerCase().includes(term.toLowerCase())),
    );
    expect(matchedRequired.length).toBeGreaterThanOrEqual(6);
    expect(result.keyConcepts.length).toBeGreaterThanOrEqual(8);
  });

  it("produces a composed complete summary without extractive defects", () => {
    const complete = result.summaries?.complete || result.mediumSummary || "";

    expect(complete).not.toMatch(/La Prima guerra mondiale La Prima guerra mondiale/i);
    expect(complete).not.toMatch(/se uno Stato fosse entrato\./i);
    expect(complete).not.toMatch(/^Per la sua estensione/im);
    expect(isExtractiveSummaryDefect(complete)).toBe(false);

    const lower = complete.toLowerCase();
    for (const term of WWI_SUMMARY_REQUIRED_TERMS) {
      expect(lower).toMatch(new RegExp(term, "i"));
    }
  });

  it("builds real vocabulary definitions without placeholders", () => {
    expect(result.difficultWords.length).toBeGreaterThanOrEqual(8);
    expect(result.difficultWords.every(isRealStudyDefinition)).toBe(true);

    const joined = result.difficultWords
      .map((item) => `${item.simple} ${item.technical} ${item.school} ${item.example}`)
      .join(" ");
    expect(joined).not.toMatch(/definizione scolastica|da spiegare|definizione \+ esempio|placeholder/i);
  });

  it("reports material readiness >= 75 for a fresh full session", () => {
    expect(result.sessionMode).toBe("full");
    expect(result.materialReadinessScore).toBeGreaterThanOrEqual(75);
    expect(result.studentPreparationScore).toBe(0);
  });

  it("uses school-appropriate summary labels at difficulty level 3", () => {
    const labels = getSummaryModeLabels(3);
    const titles = labels.map((item) => item.title);

    expect(titles).toContain("Approfondito");
    expect(titles).not.toContain("Universitario");
  });
});
