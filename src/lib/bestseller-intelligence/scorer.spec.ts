import { describe, expect, it } from "vitest";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence/scorer";

const darkRomanceOpen = `
The door was wrong before she touched it — colder than the hallway, like something behind it had been holding its breath.
Marco did not look at her when he said, "You shouldn't be here."
She almost answered. Then didn't.
By the time the elevator opened again, the question had changed: not whether she would leave, but what it would cost to stay.
What are you hiding from me?
`.trim();

const weakOpen = `
It was a normal day when Elena woke up and thought about her life.
She felt sad because many things had happened.
In this chapter we will explore her emotions and understand why change matters.
Everything was fine at the end.
`.trim();

describe("Bestseller Intelligence Engine V4", () => {
  it("scores strong dark romance chapter higher than generic weak opening", () => {
    const strong = evaluateBestsellerChapter({
      content: darkRomanceOpen.repeat(8),
      chapterIndex: 2,
      totalChapters: 20,
      genre: "dark-romance",
      bookIntelligence: {
        layers: {
          writingBrainId: "dark-romance-brain",
          domain: "fiction",
          bestsellerMode: "BookTok intensity + cliffhanger density",
        },
      },
    });

    const weak = evaluateBestsellerChapter({
      content: weakOpen.repeat(6),
      chapterIndex: 2,
      totalChapters: 20,
      genre: "self-help",
    });

    expect(strong.scores.overall).toBeGreaterThan(weak.scores.overall);
    expect(strong.scores.hookStrength).toBeGreaterThan(weak.scores.hookStrength);
    expect(strong.scores.bingeability).toBeGreaterThan(weak.scores.bingeability);
  });

  it("returns optimizations for weak commercial signals", () => {
    const report = evaluateBestsellerChapter({
      content: weakOpen.repeat(6),
      chapterIndex: 0,
      totalChapters: 12,
      genre: "romance",
      bookIntelligence: { layers: { writingBrainId: "romance-brain", domain: "fiction" } },
    });

    expect(report.optimizations.length).toBeGreaterThan(0);
    expect(report.risks.length).toBeGreaterThan(0);
  });
});
