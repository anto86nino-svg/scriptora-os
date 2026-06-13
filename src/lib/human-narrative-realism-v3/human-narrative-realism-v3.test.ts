import { describe, expect, it } from "vitest";
import {
  applyHumanNarrativeRealismV3,
  buildHumanNarrativeRealismV3Block,
  scoreGenerationExcellence,
  scoreHumanNarrativeRealism,
} from "./index";

const GOTHIC_AI = `Ho paura di perderti perché il mio passato mi ha insegnato ad avere paura dell'abbandono.
La cattedrale sembrava respirare il dolore del tempo. Era una ferita aperta, un animale ferito.
"Devo essere vulnerabile con te perché ho elaborato il mio trauma," disse.`;

const ROMANCE_AI = `"Ti amo," confessò tutto. "Ho paura di amarti perché il mio passato mi rende vulnerabile."
Era devastata perché aveva capito il trauma. Non era pronta, ma lo disse lo stesso.`;

const SELF_HELP_AI = `Devi guarire. Sei abbastanza. Ogni ferita ha una lezione.
In questo capitolo esploreremo come elaborare il trauma e diventare vulnerabili.`;

const STUDY_AI = `In questo capitolo esploreremo la storia del Rinascimento in modo poetico e profondo.
La cattedrale sembrava respirare il dolore del tempo attraverso le anime dei secoli.`;

describe("human-narrative-realism-v3 phase 1", () => {
  it("builds escalation v2 + resistance rules in prompt", () => {
    const block = buildHumanNarrativeRealismV3Block({
      config: { genre: "thriller", bookTypeId: "gothic-thriller", language: "Italian", numberOfChapters: 18 },
      chapterIndex: 4,
      previousChapters: [{ title: "Cap 3", content: "Ho paura di perderlo. Avevo paura." }],
    });
    expect(block).toContain("NARRATIVE ESCALATION V2");
    expect(block).toContain("EMOTIONAL BEAT MEMORY");
    expect(block).toContain("CHARACTER RESISTANCE");
  });

  describe("Gothic Thriller", () => {
    it("reduces AI smell vs baseline", () => {
      const human = applyHumanNarrativeRealismV3(GOTHIC_AI, {
        config: { genre: "thriller", bookTypeId: "gothic-thriller", language: "Italian", numberOfChapters: 18 },
        chapterIndex: 4,
        previousChapters: [{ title: "Cap 3", content: "Ho paura di perderlo." }],
      });
      const before = scoreGenerationExcellence(GOTHIC_AI, { config: { genre: "thriller" } });
      const after = scoreGenerationExcellence(human, {
        priorText: "Ho paura di perderlo.",
        config: { genre: "thriller", bookTypeId: "gothic-thriller" },
      });
      expect(after.aiSmellReduction).toBeGreaterThan(before.aiSmellReduction);
      expect(human.toLowerCase()).not.toContain("perché il mio passato");
    });
  });

  describe("Romance", () => {
    it("blocks early trauma dump + therapy dialogue", () => {
      const human = applyHumanNarrativeRealismV3(ROMANCE_AI, {
        config: { genre: "romance", language: "Italian", numberOfChapters: 20 },
        chapterIndex: 1,
      });
      expect(human.toLowerCase()).not.toMatch(/ho paura di amarti perché/);
      expect(scoreHumanNarrativeRealism(human).dialogueHumanity).toBeGreaterThan(
        scoreHumanNarrativeRealism(ROMANCE_AI).dialogueHumanity,
      );
    });
  });

  describe("Self Help", () => {
    it("strips therapy fluff", () => {
      const human = applyHumanNarrativeRealismV3(SELF_HELP_AI, {
        config: { genre: "self-help", bookTypeId: "mindset", language: "Italian" },
      });
      expect(human.toLowerCase()).not.toContain("devi guarire");
      expect(human).not.toMatch(/esploreremo/i);
    });
  });

  describe("Study Book", () => {
    it("removes exploratory filler + poetic padding", () => {
      const human = applyHumanNarrativeRealismV3(STUDY_AI, {
        config: { genre: "education", bookTypeId: "education", language: "Italian" },
      });
      expect(human).not.toMatch(/esploreremo/i);
      expect(human.length).toBeLessThan(STUDY_AI.length);
      expect(scoreHumanNarrativeRealism(human).poeticDensity).toBeGreaterThanOrEqual(
        scoreHumanNarrativeRealism(STUDY_AI).poeticDensity,
      );
    });
  });
});
