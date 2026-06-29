import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import {
  adaptPlanWithMemory,
  buildStudyIntelligencePlan,
  classifyStudySubject,
} from "@/lib/study-os/study-intelligence-kernel";

function studyText(topic: string, body: string): string {
  return Array.from({ length: 8 }, (_, i) => `${topic} ${i + 1}. ${body}`).join("\n\n");
}

describe("Study Intelligence Kernel", () => {
  it("routes law exam prep toward quiz, exam_sim and per_esame summary", () => {
    const text = studyText(
      "Diritto",
      "Articolo, comma, codice civile, obbligazione, contratto, responsabilità e norma regolano il caso.",
    );
    const plan = buildStudyIntelligencePlan({
      text,
      sourceName: "diritto-civile.pdf",
      subject: "law",
      objective: "exam_prep",
      level: 5,
      timeAvailableMinutes: 90,
    });

    expect(plan.classification.type).toBe("law");
    expect(plan.recommendedModes).toContain("quiz");
    expect(plan.recommendedModes).toContain("exam_sim");
    expect(plan.summaryLevel).toBe("per_esame");
    expect(plan.quizDifficulty).toBe("esame");
    expect(plan.quizTypes).toContain("practical_case");
    expect(plan.subjectProfile.isNarrative).toBe(false);
  });

  it("routes narrative manuscript toward explain and interrogation", () => {
    const text = studyText(
      "Capitolo",
      "Viola entrò nella villa. Damiano le porse un contratto. La porta chiusa e il dipinto creavano tensione gotica.",
    );
    const plan = buildStudyIntelligencePlan({
      text,
      sourceName: "capitolo.txt",
      intent: { studyMaterialType: "narrative_manuscript", literaryGenre: "horror_gothic" },
      objective: "manuscript_analysis",
    });

    expect(plan.subjectProfile.isNarrative).toBe(true);
    expect(plan.recommendedModes[0]).toBe("explain");
    expect(plan.recommendedModes).toContain("interrogation");
    expect(plan.flashcardTypes).not.toContain("formula");
  });

  it("routes quick understanding with little time to rapido summary", () => {
    const text = studyText("Biologia", "La cellula contiene DNA, mitocondrio, membrana e metabolismo.");
    const plan = buildStudyIntelligencePlan({
      text,
      subject: "biology",
      objective: "quick_understanding",
      timeAvailableMinutes: 15,
    });

    expect(plan.summaryLevel).toBe("rapido");
    expect(plan.primaryMode).toBe("explain");
    expect(plan.recommendedModes).toContain("review");
  });

  it("classifyStudySubject delegates to study-session classifier", () => {
    const text = studyText("Storia", "La rivoluzione del 1789 ebbe cause economiche e conseguenze politiche.");
    const direct = classifyStudySubject(text);
    expect(direct.type).toBe("history");
  });

  it("adaptPlanWithMemory boosts review when accuracy is low", () => {
    const text = studyText("Fisica", "Forza, massa, accelerazione e energia descrivono il moto.");
    const base = buildStudyIntelligencePlan({ text, subject: "physics" });
    const adapted = adaptPlanWithMemory(base, {
      weakTopics: ["energia", "accelerazione"],
      recentQuizAccuracy: 0.4,
    });

    expect(adapted.recommendedModes[0]).toBe("review");
    expect(adapted.recommendedModes).toContain("flashcard");
    expect(adapted.rationale.some((r) => /Memoria studio|Accuratezza/i.test(r))).toBe(true);
  });
});
