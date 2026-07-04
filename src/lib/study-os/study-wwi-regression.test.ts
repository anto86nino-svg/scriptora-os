import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import { evaluateStudyTextQuality, summaryExtractivityRatio } from "@/lib/study-os/study-quality-gates";
import { countCauseConsequenceItems, countTimelineEvents } from "@/lib/study-os/study-history-outputs";
import { getSummaryModeLabels } from "@/lib/study-os/study-summary-labels";
import {
  WWI_FORBIDDEN_CONCEPTS,
  WWI_REQUIRED_CONCEPTS,
  WWI_SCHOOL_TEXT,
  WWI_SUMMARY_REQUIRED_TERMS,
} from "@/lib/study-os/fixtures/wwi-school-text";
import { isBannedStudyConcept } from "@/lib/study-os/study-keywords";
import { isExtractiveSummaryDefect } from "@/lib/study-os/study-summary-composer";
import { extractStudyTopic } from "@/lib/study-os/study-topic-extract";
import { isRealStudyDefinition } from "@/lib/study-os/study-vocabulary";

describe("Prima guerra mondiale regression", () => {
  const result = analyzeStudyMaterial(WWI_SCHOOL_TEXT, "testo-incollato.txt", {
    studySubject: "history",
    studyGoal: "exam_prep",
    difficultyLevel: 3,
    studyMaterialType: "school_notes",
  });

  const serialized = JSON.stringify(result).toLowerCase();

  it("passes text quality gate with score >= 90 and no structure warning", () => {
    const report = evaluateStudyTextQuality(WWI_SCHOOL_TEXT, { sourceType: "txt" });

    expect(report.status).toBe("pass");
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.detectedIssues.join(" ")).not.toMatch(/frasi senza struttura minima/i);
  });

  it("never uses pasted-text placeholders as topic or in outputs", () => {
    expect(extractStudyTopic(WWI_SCHOOL_TEXT, "testo-incollato.txt")).toBe("La Prima guerra mondiale");
    expect(result.title).toBe("La Prima guerra mondiale");

    const outputText = [
      result.title,
      result.detectedSubject,
      result.mediumSummary,
      result.studyNotesPro,
      JSON.stringify(result.summaries),
      JSON.stringify(result.keyConcepts),
      JSON.stringify(result.difficultWords),
    ].join(" ").toLowerCase();

    expect(outputText).not.toMatch(/testo[\s_-]*incollat/);
    expect(outputText).not.toMatch(/materiale[\s_-]*incollat/);
    expect(result.studyNotesPro).not.toMatch(/tema centrale:\s*testo/i);
  });

  it("extracts valid historical concepts and rejects garbage fragments", () => {
    const concepts = result.keyConcepts.map((item) => item.toLowerCase());

    for (const forbidden of WWI_FORBIDDEN_CONCEPTS) {
      expect(result.keyConcepts).not.toEqual(expect.arrayContaining([forbidden]));
      expect(concepts).not.toContain(forbidden.toLowerCase());
      expect(isBannedStudyConcept(forbidden)).toBe(true);
    }

    const matchedRequired = WWI_REQUIRED_CONCEPTS.filter((term) =>
      concepts.some((concept) => concept.toLowerCase().includes(term.toLowerCase())),
    );
    expect(matchedRequired.length).toBeGreaterThanOrEqual(6);
    expect(result.keyConcepts.length).toBeGreaterThanOrEqual(8);
    expect(concepts).not.toContain("intesa");
  });

  it("produces a composed complete summary without extractive defects", () => {
    const complete = result.summaries?.complete || result.mediumSummary || "";

    expect(complete).not.toMatch(/La Prima guerra mondiale La Prima guerra mondiale/i);
    expect(complete).not.toMatch(/se uno Stato fosse entrato\./i);
    expect(complete).not.toMatch(/^Per la sua estensione/im);
    expect(isExtractiveSummaryDefect(complete, WWI_SCHOOL_TEXT)).toBe(false);
    expect(summaryExtractivityRatio(complete, WWI_SCHOOL_TEXT)).toBeLessThanOrEqual(0.6);

    const lower = complete.toLowerCase();
    for (const term of WWI_SUMMARY_REQUIRED_TERMS) {
      expect(lower).toMatch(new RegExp(term, "i"));
    }
    expect(lower).toMatch(/nazionalismo/);
    expect(lower).toMatch(/sarajevo/);
    expect(lower).toMatch(/caporetto/);
    expect(lower).toMatch(/versailles/);
  });

  it("builds real vocabulary definitions without placeholders", () => {
    expect(result.difficultWords.length).toBeGreaterThanOrEqual(8);
    expect(result.difficultWords.every(isRealStudyDefinition)).toBe(true);

    const joined = result.difficultWords
      .map((item) => `${item.simple} ${item.technical} ${item.school} ${item.example}`)
      .join(" ");
    expect(joined).not.toMatch(/definizione scolastica|da spiegare|definizione \+ esempio|placeholder/i);
    expect(joined).not.toMatch(/parola importante del testo|prova a definirlo con parole tue|va capita, non solo memorizzata/i);

    const naz = result.difficultWords.find((item) => /nazionalismo/i.test(item.word));
    const intesa = result.difficultWords.find((item) => /triplice intesa/i.test(item.word));
    const caporetto = result.difficultWords.find((item) => /caporetto/i.test(item.word));
    expect(naz?.simple).toMatch(/popolo|nazione/i);
    expect(intesa?.simple).toMatch(/francia|russia|gran bretagna|alleanza/i);
    expect(caporetto?.example).toMatch(/piave|vittorio veneto|1917/i);
  });

  it("builds synthetic timeline, causes and key points", () => {
    const timeline = result.summaries?.chronological || "";
    const causeEffect = result.summaries?.causeEffect || "";
    const bullets = result.summaries?.bulletPoints || "";

    expect(countTimelineEvents(WWI_SCHOOL_TEXT)).toBeGreaterThanOrEqual(7);
    expect((timeline.match(/^\d+\./gm) || []).length).toBeGreaterThanOrEqual(7);

    const counts = countCauseConsequenceItems(WWI_SCHOOL_TEXT);
    expect(counts.causes).toBeGreaterThanOrEqual(5);
    expect(counts.consequences).toBeGreaterThanOrEqual(5);
    expect((causeEffect.match(/^• /gm) || []).length).toBeGreaterThanOrEqual(10);

    expect(bullets).toMatch(/nazionalismo/i);
    expect(bullets).toMatch(/Sarajevo|sarajevo/);
    expect(bullets).not.toMatch(/coinvolse le principali potenze europee e altri Stati tra il 1914 e il 1918/i);
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

    const didacticText = [
      JSON.stringify(result.summaries),
      result.mediumSummary,
      result.proSummary,
    ].join(" ").toLowerCase();
    expect(didacticText).not.toMatch(/\buniversitario\b/);
  });
});
