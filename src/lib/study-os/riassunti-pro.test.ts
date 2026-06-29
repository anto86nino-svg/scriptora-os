import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import { buildStudyIntelligencePlan } from "@/lib/study-os/study-intelligence-kernel";
import {
  buildRiassuntoPro,
  getRiassuntoProLevelLabel,
  RIASSUNTO_PRO_LEVELS,
} from "@/lib/study-os/riassunti-pro";

function studyText(topic: string, body: string): string {
  return Array.from({ length: 8 }, (_, i) => `${topic} ${i + 1}. ${body}`).join("\n\n");
}

describe("Riassunti Pro", () => {
  const result = analyzeStudyMaterial(
    studyText(
      "Biologia",
      "La fotosintesi clorofilliana trasforma luce, anidride carbonica e acqua in glucosio. Clorofilla, mitocondrio e metabolismo sono concetti chiave.",
    ),
    "biologia.txt",
    { studySubject: "biology", studyGoal: "exam_prep", difficultyLevel: 4 },
  );

  it("exposes all five summary levels", () => {
    expect(RIASSUNTO_PRO_LEVELS).toHaveLength(5);
    expect(getRiassuntoProLevelLabel("per_esame")).toBe("Riassunto per esame");
  });

  it.each(RIASSUNTO_PRO_LEVELS)("builds structured output for level %s", (level) => {
    const section = buildRiassuntoPro(result, level);
    expect(section.body.length).toBeGreaterThan(20);
    expect(section.keyConcepts.length).toBeGreaterThan(0);
    expect(section.level).toBe(level);
  });

  it("includes definitions and common errors for exam level", () => {
    const section = buildRiassuntoPro(result, "per_esame");
    expect(section.definitions.length).toBeGreaterThan(0);
    expect(section.commonErrors.length).toBeGreaterThan(0);
    expect(section.examples.length).toBeGreaterThan(0);
  });

  it("picks rapido body for quick plan", () => {
    const plan = buildStudyIntelligencePlan({
      text: result.lightSummary,
      objective: "quick_understanding",
      timeAvailableMinutes: 10,
    });
    const section = buildRiassuntoPro(result, plan.summaryLevel);
    expect(plan.summaryLevel).toBe("rapido");
    expect(section.body).toBeTruthy();
  });
});
