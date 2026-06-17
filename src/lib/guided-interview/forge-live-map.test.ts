import { describe, expect, it } from "vitest";
import { buildForgeLiveMap, nodeStateRank } from "./forge-live-map";
import { getInitialInterviewState } from "./question-engine";
import { getInterviewProgress } from "./question-engine";

describe("forge-live-map", () => {
  it("starts with idea in understanding after opening", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const progress = getInterviewProgress(state);
    const map = buildForgeLiveMap(state, progress.dnaLock, false);
    expect(map.nodes[0]?.id).toBe("idea");
    expect(map.nodes[0]?.state).toBe("empty");
    expect(map.confidencePct).toBeGreaterThanOrEqual(0);
  });

  it("marks emotional core confirmed when fields are strong", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    state.messages.push(
      { id: "u1", role: "user", content: "Un romanzo storico emozionale", createdAt: 1 },
      { id: "u2", role: "user", content: "Roma vissuta come esperienza umana", createdAt: 2 },
    );
    state.extracted.emotionalTone = "Immersivo e cinematografico";
    state.extracted.centralConflict = "Roma vissuta come esperienza umana profonda";
    const progress = getInterviewProgress(state);
    const map = buildForgeLiveMap(state, progress.dnaLock, false);
    const emotional = map.nodes.find((n) => n.id === "emotionalCore");
    expect(emotional?.state).toBe("confirmed");
  });

  it("ranks locked above confirmed", () => {
    expect(nodeStateRank("locked")).toBeGreaterThan(nodeStateRank("confirmed"));
    expect(nodeStateRank("confirmed")).toBeGreaterThan(nodeStateRank("understanding"));
  });
});
