import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import { buildStudyIntelligencePlan } from "@/lib/study-os/study-intelligence-kernel";
import { buildStudyQuizPack } from "@/lib/study-os/study-quiz-engine";

function studyText(topic: string, body: string): string {
  return Array.from({ length: 8 }, (_, i) => `${topic} ${i + 1}. ${body}`).join("\n\n");
}

describe("Study Quiz Engine", () => {
  it("keeps law/medical quiz subject-appropriate without narrative tropes", () => {
    const law = analyzeStudyMaterial(
      studyText(
        "Diritto",
        "Il codice civile disciplina obbligazioni, contratti, responsabilità e norme. Articolo 1218 regola l'inadempimento.",
      ),
      "diritto.pdf",
      { studySubject: "law", studyGoal: "exam_prep", difficultyLevel: 5 },
    );
    const plan = buildStudyIntelligencePlan({
      text: studyText("Diritto", law.lightSummary),
      subject: "law",
      objective: "exam_prep",
      level: 5,
    });
    const pack = buildStudyQuizPack(law, plan);

    const joined = pack.items.map((q) => q.question).join(" ");
    expect(pack.subjectAppropriate).toBe(true);
    expect(joined).not.toMatch(/Viola|Damiano|villa gotica|desiderio proibito/i);
    expect(pack.byType.practical_case.length).toBeGreaterThan(0);
  });

  it("includes multiple quiz types for STEM material", () => {
    const physics = analyzeStudyMaterial(
      studyText("Fisica", "F = m * a. Energia cinetica E = 1/2 m v^2. Forza, massa e accelerazione."),
      "fisica.txt",
      { studySubject: "physics", difficultyLevel: 4 },
    );
    const plan = buildStudyIntelligencePlan({
      text: physics.mediumSummary,
      subject: "physics",
      objective: "exam_prep",
      level: 4,
    });
    const pack = buildStudyQuizPack(physics, plan);

    expect(pack.byType.multiple_choice.length).toBeGreaterThan(0);
    expect(pack.byType.true_false.length).toBeGreaterThan(0);
    expect(pack.items.some((q) => q.kernelType === "completion" || q.kernelType === "practical_case")).toBe(true);
  });

  it("allows narrative craft questions for fiction", () => {
    const fiction = analyzeStudyMaterial(
      studyText(
        "Capitolo",
        "Viola resta nella villa con Damiano. Il dipinto e la porta chiusa alimentano il mistero gotico.",
      ),
      "capitolo.txt",
      { studyMaterialType: "narrative_manuscript" },
    );
    const plan = buildStudyIntelligencePlan({
      text: fiction.lightSummary,
      intent: { studyMaterialType: "narrative_manuscript" },
    });
    const pack = buildStudyQuizPack(fiction, plan);

    expect(plan.subjectProfile.isNarrative).toBe(true);
    expect(pack.items.length).toBeGreaterThan(0);
    expect(pack.byType.practical_case.length).toBe(0);
  });
});
