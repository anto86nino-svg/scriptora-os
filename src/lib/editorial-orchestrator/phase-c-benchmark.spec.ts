import { describe, expect, it } from "vitest";
import { analyzeBehavioralConsistency } from "@/lib/behavioral-consistency";
import {
  buildCharacterIntentSheets,
  buildCharacterSupremacyProfiles,
} from "@/lib/character-supremacy";
import { computeSupremeEditorialScore } from "@/lib/editorial-orchestrator/supreme-score";
import { analyzeSubtext, rewriteExplainedEmotion } from "@/lib/subtext-engine";
import { analyzeTensionV2 } from "@/lib/tension-engine-v2";

const WEAK_SUBTEXT = `Elena guardò Marco. Era triste perché si sentiva abbandonata.
Marco le disse: "I understand exactly how you feel." They hugged and made up immediately.`;

const CH3_MARCO = `Marco set the glass down. "I never lie," he said. "Not to you."`;
const CH8_MARCO_LIE = `Marco lied without a second thought. "I wasn't there," he told her calmly.`;

describe("editorial orchestrator phase C benchmark", () => {
  it("builds character intent sheets with relationships", () => {
    const profiles = buildCharacterSupremacyProfiles({
      config: {
        genre: "romance",
        characters: [
          {
            name: "Elena",
            role: "protagonist",
            externalDesire: "essere amata",
            wound: "abbandono",
            secret: "la verità sul padre",
            relationships: "Con Marco: trust 40%, attraction 80%",
          },
          { name: "Marco", role: "love interest", personality: "evita la vulnerabilità" },
        ],
      } as any,
      blueprint: null,
      chapters: [],
    });

    const sheets = buildCharacterIntentSheets({ profiles, chapterIndex: 3, presentOnly: profiles });
    const elena = sheets.find(s => s.character.name === "Elena");
    expect(elena?.character.desires.some(d => /amata/i.test(d))).toBe(true);
    expect(elena?.character.secrets.some(s => /padre/i.test(s))).toBe(true);
    expect(elena?.character.relationships.some(r => r.withCharacter === "Marco" && r.trust === 40)).toBe(true);
  });

  it("detects behavioral inconsistency — Marco hates lying then lies", () => {
    const report = analyzeBehavioralConsistency({
      content: CH8_MARCO_LIE,
      chapterIndex: 7,
      previousChapters: [{ title: "Ch3", content: CH3_MARCO, subchapters: [] }],
      profiles: buildCharacterSupremacyProfiles({
        config: { genre: "thriller", characters: [{ name: "Marco" }] } as any,
        chapters: [{ title: "Ch3", content: CH3_MARCO, subchapters: [] }],
      }),
    });

    expect(report.violations.some(v => v.type === "value_contradiction")).toBe(true);
    expect(report.passesGate).toBe(false);
  });

  it("rewrites explained emotion into subtext", () => {
    const analysis = analyzeSubtext({ content: WEAK_SUBTEXT, chapterIndex: 2 });
    expect(analysis.metrics.explainedEmotion).toBeGreaterThan(0);
    const rewritten = rewriteExplainedEmotion(WEAK_SUBTEXT, analysis);
    expect(rewritten.toLowerCase()).not.toMatch(/because she felt abandoned/);
    expect(rewriteExplainedEmotion(rewritten).length).toBeGreaterThan(20);
  });

  it("flags premature romance payoff arc", () => {
    const tension = analyzeTensionV2({
      content: `She wanted him the moment he walked in. "I love you," he said. They kissed and everything was fine.`,
      chapterIndex: 1,
      config: { genre: "romance" } as any,
    });
    expect(tension.violations).toContain("attraction_to_payoff_skip");
    expect(tension.passesGate).toBe(false);
  });

  it("improves supreme score after subtext rewrite", () => {
    const config = { genre: "romance", numberOfChapters: 12 } as any;
    const padded = `${WEAK_SUBTEXT}\n\n${WEAK_SUBTEXT}`.repeat(4);
    const subtextBefore = analyzeSubtext({ content: padded, chapterIndex: 2 });
    const rewritten = rewriteExplainedEmotion(padded, subtextBefore);
    const subtextAfter = analyzeSubtext({ content: rewritten, chapterIndex: 2 });

    const before = computeSupremeEditorialScore({
      content: padded,
      config,
      chapterIndex: 2,
      totalChapters: 12,
      subtextAnalysis: subtextBefore,
    });
    const after = computeSupremeEditorialScore({
      content: rewritten,
      config,
      chapterIndex: 2,
      totalChapters: 12,
      subtextAnalysis: subtextAfter,
    });

    expect(after.dimensions.subtextStrength).toBeGreaterThanOrEqual(before.dimensions.subtextStrength);
    expect(after.criticalCount).toBeLessThanOrEqual(before.criticalCount);
  });
});
