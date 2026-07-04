import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import { evaluateStudyTextQuality, summaryExtractivityRatio } from "@/lib/study-os/study-quality-gates";
import { countCauseConsequenceItems, countTimelineEvents } from "@/lib/study-os/study-history-outputs";
import { getSummaryModeLabels } from "@/lib/study-os/study-summary-labels";
import {
  BANNED_DIDACTIC_PHRASES,
  buildDidacticAssessmentPack,
  containsBannedDidacticPhrase,
  countExamQuestionTypes,
  isSemanticallyDuplicate,
  isWeakAssessmentQuestion,
} from "@/lib/study-os/study-assessment-quality-engine";
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
  const assessmentPack = buildDidacticAssessmentPack({
    title: result.title,
    clean: WWI_SCHOOL_TEXT,
    classification: result.classification!,
    keyConcepts: result.keyConcepts,
    difficultyLevel: 3,
    difficultWords: result.difficultWords,
    proLines: [],
  });

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

  it("builds diverse exam questions without weak generic prompts", () => {
    expect(result.openQuestions.length).toBeGreaterThanOrEqual(8);
    expect(assessmentPack?.examQuestions.length).toBeGreaterThanOrEqual(8);

    const types = countExamQuestionTypes(assessmentPack!.examQuestions);
    const typeCount = Object.keys(types).length;
    expect(typeCount).toBeGreaterThanOrEqual(5);

    const weakStarts = result.openQuestions.filter((q) =>
      /^(che cosa significa|spiega il significato)/i.test(q.question),
    );
    expect(weakStarts.length).toBeLessThanOrEqual(2);

    const nelTesto = result.openQuestions.filter((q) => /\bnel testo\b/i.test(q.question));
    expect(nelTesto).toHaveLength(0);

    for (let i = 0; i < result.openQuestions.length; i++) {
      for (let j = i + 1; j < result.openQuestions.length; j++) {
        expect(isSemanticallyDuplicate(result.openQuestions[i].question, result.openQuestions[j].question)).toBe(false);
      }
    }

    result.openQuestions.forEach((q) => {
      expect(isWeakAssessmentQuestion(q.question)).toBe(false);
      expect(q.answerGuide).toMatch(/risposta modello/i);
    });
  });

  it("builds school-grade quiz with required formats and explanations", () => {
    const mc = result.quiz.filter((q) => (q.options?.length ?? 0) >= 3);
    const tf = result.trueFalse ?? [];
    const completion = result.quiz.filter((q) => /complet/i.test(q.question));
    const chronological = result.quiz.filter((q) => /ordine cronologico|metti in ordine/i.test(q.question));
    const shortOpen = result.quiz.filter((q) => q.type === "open" || q.type === "short-answer" || /breve risposta|domanda aperta/i.test(q.question));

    expect(mc.length).toBeGreaterThanOrEqual(3);
    expect(tf.length).toBeGreaterThanOrEqual(2);
    expect(completion.length).toBeGreaterThanOrEqual(2);
    expect(chronological.length).toBeGreaterThanOrEqual(1);
    expect(shortOpen.length).toBeGreaterThanOrEqual(2);

    [...result.quiz, ...tf].forEach((item) => {
      expect(item.explanation?.length).toBeGreaterThan(15);
      expect(containsBannedDidacticPhrase(item.explanation)).toBe(false);
    });

    const quizConcepts = result.quiz.map((q) => q.sourceReference || q.question.slice(0, 40));
    expect(new Set(quizConcepts).size).toBeGreaterThanOrEqual(Math.min(5, quizConcepts.length));
  });

  it("builds useful exercises with competences, model answers and common errors", () => {
    expect(result.exercises?.length).toBeGreaterThanOrEqual(5);

    const competences = new Set(result.exercises?.map((e) => e.exerciseType));
    expect(competences.size).toBeGreaterThanOrEqual(5);

    result.exercises?.forEach((item) => {
      expect(item.solution?.length).toBeGreaterThan(20);
      expect(item.commonError || item.hint).toBeTruthy();
      expect(item.objective || item.explanation).toBeTruthy();
      expect(containsBannedDidacticPhrase(`${item.prompt} ${item.solution}`)).toBe(false);
    });
  });

  it("provides professor-style explanations without banned phrases", () => {
    const joined = result.difficultWords
      .map((item) => `${item.school} ${item.simple} ${item.commonMistake}`)
      .join(" ");

    for (const pattern of BANNED_DIDACTIC_PHRASES) {
      expect(joined).not.toMatch(pattern);
    }

    const withDirectAnswer = result.difficultWords.filter((item) =>
      /risposta diretta:/i.test(item.school || "") && /errore comune:/i.test(item.school || ""),
    );
    expect(withDirectAnswer.length).toBeGreaterThanOrEqual(10);

    const uniqueSimple = new Set(result.difficultWords.map((item) => item.simple?.slice(0, 40)));
    expect(uniqueSimple.size).toBeGreaterThanOrEqual(6);
  });

  it("simulates realistic oral interrogation with follow-up and grading", () => {
    const oralReady = result.openQuestions.filter(
      (q) => q.modelAnswer && q.oralFollowUp && q.answerGuide.match(/risposta modello/i),
    );
    expect(oralReady.length).toBeGreaterThanOrEqual(3);

    const withTrap = result.openQuestions.filter((q) => q.oralTrap || /trabocchetto/i.test(q.answerGuide));
    expect(withTrap.length).toBeGreaterThanOrEqual(1);

    const withGrading = result.openQuestions.filter((q) => q.gradingCriteria || /criteri voto/i.test(q.answerGuide));
    expect(withGrading.length).toBeGreaterThanOrEqual(2);
  });

  it("avoids conceptual duplication across didactic sections", () => {
    const allPrompts = [
      ...result.openQuestions.map((q) => q.question),
      ...result.quiz.map((q) => q.question),
      ...(result.trueFalse ?? []).map((q) => q.question),
      ...(result.exercises ?? []).map((e) => e.prompt),
    ];

    for (let i = 0; i < allPrompts.length; i++) {
      for (let j = i + 1; j < allPrompts.length; j++) {
        expect(isSemanticallyDuplicate(allPrompts[i], allPrompts[j])).toBe(false);
      }
    }
  });

  it("builds concrete study card without generic instructions", () => {
    expect(result.studyNotesPro).toMatch(/cosa devi sapere/i);
    expect(result.studyNotesPro).toMatch(/da memorizzare/i);
    expect(result.studyNotesPro).toMatch(/per l'interrogazione/i);
    expect(result.studyNotesPro).not.toMatch(/definiscilo, spiegalo con parole tue e collegalo al tema centrale/i);
    expect(result.studyNotesPro).not.toMatch(/collegalo al tema centrale/i);
    expect(serialized).not.toMatch(/definiscilo con parole tue/i);
  });

  it("keeps material readiness coherent at MEDIUM level without Universitario label", () => {
    expect(result.difficultyLevel).toBe(3);
    expect(result.materialReadinessScore).toBeGreaterThanOrEqual(75);
    expect(result.studyReadinessScore).toBeGreaterThanOrEqual(75);
    expect(result.qualityScores?.reasons.join(" ")).not.toMatch(/source_quality_failed/);
  });
});
