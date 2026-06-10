import { describe, expect, it } from "vitest";
import {
  buildHumanReadingQueue,
  detectReadingTone,
  estimateReadingDuration,
  sanitizeReadableText,
  splitTextForHumanReading,
} from "./human-reading-engine";

describe("sanitizeReadableText", () => {
  it("rimuove label tecniche e markdown", () => {
    const clean = sanitizeReadableText("**Marco** corre. Genre Coach · Chapter Intelligence.");
    expect(clean).toContain("Marco");
    expect(clean).not.toContain("**");
    expect(clean).not.toContain("Genre Coach");
    expect(clean).not.toContain("Chapter Intelligence");
  });
});

describe("splitTextForHumanReading", () => {
  it("crea segmenti non vuoti", () => {
    const segments = splitTextForHumanReading("Prima frase. Seconda frase.\n\nNuovo paragrafo qui.");
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.every((s) => s.id && s.type)).toBe(true);
  });

  it("riconosce dialoghi", () => {
    const segments = splitTextForHumanReading('Marco entrò. "Dove sei?" chiese.');
    const dialogue = segments.find((s) => s.type === "dialogue");
    expect(dialogue).toBeTruthy();
    expect(dialogue?.text).toContain("Dove sei");
  });

  it("riconosce titoli capitolo", () => {
    const segments = splitTextForHumanReading("Capitolo 3\n\nIl vento soffiava forte.");
    expect(segments[0]?.type).toBe("title");
    expect(segments[0]?.text.toLowerCase()).toContain("capitolo 3");
  });
});

describe("detectReadingTone", () => {
  it("classifica dialoghi", () => {
    expect(detectReadingTone({ text: '"Ciao"', type: "dialogue" })).toBe("dialogue");
  });
});

describe("estimateReadingDuration", () => {
  it("restituisce durata coerente", () => {
    const words = Array.from({ length: 150 }, (_, i) => `w${i}`).join(" ");
    expect(estimateReadingDuration(words, 150)).toBe(1);
  });
});

describe("buildHumanReadingQueue", () => {
  it("aggiunge titolo capitolo e pause naturali", () => {
    const queue = buildHumanReadingQueue("Testo del capitolo. Fine.", {
      chapterTitle: "Capitolo 1 — Inizio",
      mode: "narrative",
    });
    expect(queue.length).toBeGreaterThan(1);
    expect(queue[0]?.type).toBe("title");
    expect(queue.some((item) => item.pauseAfterMs >= 300)).toBe(true);
  });

  it("applica modalità notte con pause più lunghe", () => {
    const narrative = buildHumanReadingQueue("Frase uno. Frase due.", { mode: "narrative" });
    const night = buildHumanReadingQueue("Frase uno. Frase due.", { mode: "night" });
    const narrativePause = narrative.reduce((s, i) => s + i.pauseAfterMs, 0);
    const nightPause = night.reduce((s, i) => s + i.pauseAfterMs, 0);
    expect(nightPause).toBeGreaterThanOrEqual(narrativePause);
  });
});
