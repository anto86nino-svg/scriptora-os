import { describe, expect, it } from "vitest";
import { distributeChapterWords } from "./word-distribution";

describe("word-distribution", () => {
  it("distributes horror chapter words with escalation bias", () => {
    const budgets = distributeChapterWords(
      10000,
      [
        { title: "Setup", purpose: "setup" },
        { title: "Unease", purpose: "unease" },
        { title: "Escalation", purpose: "escalation" },
        { title: "Confrontation", purpose: "confrontation" },
        { title: "Cliffhanger", purpose: "cliffhanger" },
      ],
      "horror",
    );
    expect(budgets).toHaveLength(5);
    const total = budgets.reduce((sum, b) => sum + b.targetWords, 0);
    expect(total).toBeGreaterThan(9000);
    expect(budgets[4].targetWords).toBeGreaterThan(budgets[0].targetWords);
  });

  it("assigns self-help teaching weight to middle beats", () => {
    const budgets = distributeChapterWords(
      8000,
      [
        { title: "Hook", purpose: "hook" },
        { title: "Story", purpose: "story" },
        { title: "Teaching", purpose: "teaching" },
        { title: "Exercise", purpose: "exercise" },
        { title: "Close", purpose: "retention" },
      ],
      "self-help",
    );
    expect(budgets[2].weight).toBeGreaterThan(budgets[0].weight);
  });
});
