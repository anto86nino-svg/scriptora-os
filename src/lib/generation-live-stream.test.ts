import { describe, expect, it } from "vitest";
import {
  buildChapterLivePreview,
  consumeGenerationDeltaMarkers,
  createChapterPartialProgressThrottleState,
  createGenerationDeltaParseState,
  GENERATION_DELTA_MARKER,
  GENERATION_RESULT_MARKER,
  shouldEmitChapterPartialProgress,
} from "./generation";

describe("chapter live stream markers", () => {
  it("emits multiple __DELTA__ payloads before __RESULT__", () => {
    const state = createGenerationDeltaParseState();
    const events: Array<{ delta: string; full: string }> = [];
    let resultPartial = "";

    consumeGenerationDeltaMarkers(
      state,
      `\n${GENERATION_DELTA_MARKER}${JSON.stringify({ content: "La " })}`
        + `\n${GENERATION_DELTA_MARKER}${JSON.stringify({ content: "porta" })}`,
      (delta, full) => events.push({ delta, full }),
      (full) => { resultPartial = full; },
    );

    expect(events).toEqual([
      { delta: "La ", full: "La " },
      { delta: "porta", full: "La porta" },
    ]);
    expect(state.resultMarkerSeen).toBe(false);

    consumeGenerationDeltaMarkers(
      state,
      `\n${GENERATION_RESULT_MARKER}${JSON.stringify({ success: true, content: "La porta" })}`,
      (delta, full) => events.push({ delta, full }),
      (full) => { resultPartial = full; },
    );

    expect(resultPartial).toBe("La porta");
    expect(state.resultMarkerSeen).toBe(true);
  });

  it("handles split marker and JSON payload boundaries", () => {
    const state = createGenerationDeltaParseState();
    const events: Array<{ delta: string; full: string }> = [];

    for (const chunk of [
      "\n__DE",
      'LTA__{"content":"Pri',
      'mo"}\n__DELTA__{"content":" testo"}',
    ]) {
      consumeGenerationDeltaMarkers(
        state,
        chunk,
        (delta, full) => events.push({ delta, full }),
      );
    }

    expect(events).toEqual([
      { delta: "Primo", full: "Primo" },
      { delta: " testo", full: "Primo testo" },
    ]);
  });

  it("builds the provisional live preview without touching final merge rules", () => {
    expect(buildChapterLivePreview("", "  Prime parole live  ")).toBe("Prime parole live");
    expect(buildChapterLivePreview("Testo gia' salvato", "Nuovo blocco")).toBe("Testo gia' salvato\n\nNuovo blocco");
  });
});

describe("chapter partial progress throttle", () => {
  it("always emits the first visible partial even inside the normal throttle window", () => {
    const state = createChapterPartialProgressThrottleState();

    expect(shouldEmitChapterPartialProgress(state, 4, 10)).toBe(true);
    expect(shouldEmitChapterPartialProgress(state, 20, 100)).toBe(false);
    expect(shouldEmitChapterPartialProgress(state, 130, 120)).toBe(true);
  });
});
