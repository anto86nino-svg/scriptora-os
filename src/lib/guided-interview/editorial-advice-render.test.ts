import { describe, expect, it } from "vitest";
import {
  deduplicateEditorialAdvice,
  areSemanticallySimilarAdvice,
  mergeAdviceMessages,
} from "./editorial-advice-render";

describe("editorial advice render", () => {
  it("detects semantically similar advice", () => {
    expect(
      areSemanticallySimilarAdvice(
        "Il protagonista ha ancora zone da rendere credibili.",
        "Il protagonista ha zone da rendere più credibili.",
      ),
    ).toBe(true);
  });

  it("deduplicates and caps advice to three items", () => {
    const deduped = deduplicateEditorialAdvice(
      [
        { id: "1", source: "editorial", message: "Funziona — ma con attenzione." },
        { id: "2", source: "editorial", message: "Funziona, ma con attenzione." },
        { id: "3", source: "market", message: "Forte potenziale BookTok." },
        { id: "4", source: "genre", message: "Attenzione genere: evita tono troppo leggero." },
        { id: "5", source: "narrative", message: "Serve più attrito narrativo." },
      ],
      3,
    );
    expect(deduped.length).toBe(3);
    expect(deduped.some((item) => /Funziona/i.test(item.message))).toBe(true);
  });

  it("merges duplicate message strings", () => {
    const merged = mergeAdviceMessages(
      [
        "Titolo debole rispetto al concept.",
        "Il titolo attuale sembra più debole del concept.",
        "Hook forte nel concept.",
      ],
      3,
    );
    expect(merged.length).toBeLessThanOrEqual(3);
    expect(merged.length).toBeGreaterThanOrEqual(2);
  });
});
