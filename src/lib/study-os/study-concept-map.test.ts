import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import { buildStudyIntelligencePlan } from "@/lib/study-os/study-intelligence-kernel";
import {
  buildStudyConceptMap,
  getConceptMapLevelLabel,
  layoutConceptMapSvg,
} from "@/lib/study-os/study-concept-map";

describe("Study Concept Map", () => {
  const result = analyzeStudyMaterial(
    "Il Rinascimento porta umanesimo, prospettiva e classicismo. ".repeat(10),
    "storia.txt",
    { studySubject: "history" },
  );
  const plan = buildStudyIntelligencePlan({ text: result.lightSummary, subject: "history", objective: "exam_prep" });

  it("generates nodes and edges for base level", () => {
    const map = buildStudyConceptMap(result, plan, "base");
    expect(map.nodes.length).toBeGreaterThan(1);
    expect(map.edges.length).toBeGreaterThan(0);
    expect(map.level).toBe("base");
  });

  it("expands nodes at esame level", () => {
    const base = buildStudyConceptMap(result, plan, "base");
    const exam = buildStudyConceptMap(result, plan, "esame");
    expect(exam.nodes.length).toBeGreaterThanOrEqual(base.nodes.length);
    expect(getConceptMapLevelLabel(exam.level)).toBe("Esame");
  });

  it("layoutConceptMapSvg assigns coordinates", () => {
    const map = buildStudyConceptMap(result, plan, "avanzata");
    const layout = layoutConceptMapSvg(map);
    expect(layout.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });
});
