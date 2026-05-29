import { describe, expect, it } from "vitest";
import { buildCharacterPsychologyProfiles } from "./character-psychology";

describe("character psychology engine v2", () => {
  it("builds deep profile from blueprint character memory", () => {
    const profiles = buildCharacterPsychologyProfiles({
      config: { characters: [], genre: "dark-romance", tone: "intense", language: "Italian", title: "Test", numberOfChapters: 10, authorStyle: "" } as any,
      blueprint: {
        blueprintIntegrity: {
          characterMemoryEngine: [
            {
              canonicalName: "Elena",
              role: "protagonist",
              coreFear: "being vulnerable",
              coreDesire: "to be chosen",
              internalContradiction: "wants intimacy but pushes people away",
              emotionalWounds: "abandonment by her father",
              angerStyle: "cold withdrawal",
            },
          ],
        },
      } as any,
      chapters: [],
    });

    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe("Elena");
    expect(profiles[0].fear).toContain("vulnerable");
    expect(profiles[0].desire).toContain("chosen");
    expect(profiles[0].behavioralDirectives.length).toBeGreaterThan(0);
    expect(profiles[0].forbiddenPatterns.length).toBeGreaterThan(0);
  });

  it("flags premature resolution in chapter text", () => {
    const profiles = buildCharacterPsychologyProfiles({
      config: {
        characters: [{ name: "Marco", role: "lead", personality: "guarded" }],
        genre: "romance",
        tone: "warm",
        language: "English",
        title: "Test",
        numberOfChapters: 8,
        authorStyle: "",
      } as any,
      blueprint: null,
      chapters: [
        {
          title: "Ch1",
          content: 'Marco looked at her. "I understand now. I love you. Everything is fine."',
          subchapters: [],
        },
      ],
    });

    expect(profiles[0].behavioralDirectives.some(d => /premature|friction/i.test(d))).toBe(true);
  });
});
