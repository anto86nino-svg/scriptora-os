import { describe, expect, it } from "vitest";
import {
  classifyBeatCluster,
  extractBeatClustersFromText,
  scoreEmotionalRepetition,
  detectStaleBeatLoop,
} from "./narrative-beat-engine";

describe("narrative-beat-engine", () => {
  it("maps word variants to the same beat cluster", () => {
    expect(classifyBeatCluster("Ho paura che lui se ne vada.")).toBe("fear_of_loss");
    expect(classifyBeatCluster("Non sono pronta per questo.")).toBe("unreadiness");
    expect(classifyBeatCluster("Non so se posso fidarmi di lui.")).toBe("trust_doubt");
    expect(classifyBeatCluster("Ho ancora paura di soffrire.")).toBe("suffering_fear");
  });

  it("detects multiple clusters in one chapter", () => {
    const text = [
      "Ho paura che tutto finisca.",
      "Non sono pronta a dirgli la verità.",
      "Non so se posso fidarmi.",
    ].join("\n\n");
    const clusters = extractBeatClustersFromText(text);
    expect(clusters).toContain("fear_of_loss");
    expect(clusters).toContain("unreadiness");
    expect(clusters).toContain("trust_doubt");
    expect(clusters.length).toBe(3);
  });

  it("penalizes repeating the same emotional beats across chapters", () => {
    const prior = "Ho paura. Non sono pronta. Non so se posso fidarmi.";
    const current = "Aveva ancora paura di soffrire. Non era pronta. Non si fidava.";
    const score = scoreEmotionalRepetition(current, prior);
    expect(score).toBeLessThan(58);
    expect(detectStaleBeatLoop(current, prior)).toBe(true);
  });

  it("scores fresh beats higher when prior text is empty", () => {
    const current = "La porta si chiuse e lei non disse nulla.";
    expect(scoreEmotionalRepetition(current, "")).toBeGreaterThan(80);
    expect(detectStaleBeatLoop(current, "")).toBe(false);
  });
});
