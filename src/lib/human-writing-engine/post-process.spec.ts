import { describe, expect, it } from "vitest";
import { buildHumanWritingPromptBlock } from "@/lib/human-writing-engine/prompt";
import { applyHumanWritingPostProcess } from "@/lib/human-writing-engine/post-process";
import { resolveHumanWritingProfile } from "@/lib/human-writing-engine/profiles";

describe("Human Writing Engine V2", () => {
  it("uses instructional clarity for horticultural brain — not romance subtext", () => {
    const profile = resolveHumanWritingProfile({
      genre: "gardening",
      bookIntelligence: {
        layers: {
          writingBrainId: "horticultural-guide-brain",
          domain: "nonfiction",
        },
      },
    });

    expect(profile.id).toBe("instructional-clarity");
    expect(profile.subtextLevel).toBe(0);

    const block = buildHumanWritingPromptBlock({
      genre: "gardening",
      bookIntelligence: profile.sourceBrainId
        ? { layers: { writingBrainId: profile.sourceBrainId, domain: "nonfiction" } }
        : undefined,
    });
    expect(block).toContain("INSTRUCTIONAL CLARITY");
    expect(block).toContain("NOT motivational fiction");
  });

  it("uses high subtext profile for dark romance", () => {
    const profile = resolveHumanWritingProfile({
      genre: "dark-romance",
      bookIntelligence: { layers: { writingBrainId: "dark-romance-brain", domain: "fiction" } },
    });

    expect(profile.subtextLevel).toBeGreaterThan(0.85);
    const block = buildHumanWritingPromptBlock({
      genre: "dark-romance",
      bookIntelligence: { layers: { writingBrainId: "dark-romance-brain", domain: "fiction" } },
    });
    expect(block).toContain("SUBTEXT PROTOCOL");
    expect(block).toContain("Silence");
  });

  it("post-process reduces explained emotion and subtext labels", () => {
    const input =
      'She felt devastated by the news. What she really meant was that she still loved him. "I\'m fine," she said.';
    const output = applyHumanWritingPostProcess(input, {
      config: {
        language: "English",
        genre: "dark-romance",
        bookIntelligence: { layers: { writingBrainId: "dark-romance-brain", domain: "fiction" } },
      },
    });

    expect(output).not.toContain("What she really meant");
    expect(output).not.toMatch(/felt devastated/i);
  });
});
