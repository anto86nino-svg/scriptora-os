import { describe, expect, it } from "vitest";
import {
  LONG_IDEA_THRESHOLD,
  analyzeLongIdeaForProposal,
  detectGenreWithConfidence,
} from "./auto-detection-engine";

const LONG_FANTASY_IDEA =
  "Voglio un fantasy epico ambientato in un regno sommerso nel ghiaccio da trecento anni, " +
  "dove un cartografo scopre che la città custodisce una tecnologia impossibile e sette giorni " +
  "persi nella memoria collettiva. Il tono deve essere avventuroso ma inquietante, con tensione " +
  "politica tra potenze mondiali e abitanti convinti che sia passata solo una settimana.";

const SHORT_FUTURE_LETTERS = "Un uomo riceve lettere dal futuro";

describe("book forge auto-detection engine", () => {
  it("detects short ideas with confidence hypotheses", () => {
    const hypotheses = detectGenreWithConfidence(SHORT_FUTURE_LETTERS);
    expect(hypotheses.length).toBeGreaterThanOrEqual(2);
    expect(hypotheses[0].confidencePercent).toBeGreaterThan(hypotheses[1]?.confidencePercent || 0);
    const total = hypotheses.reduce((sum, h) => sum + h.confidencePercent, 0);
    expect(total).toBe(100);
  });

  it("proposes genre from a short idea when long threshold is not met", () => {
    const result = analyzeLongIdeaForProposal(SHORT_FUTURE_LETTERS);
    expect(result.isShortIdea).toBe(true);
    expect(result.shouldPropose).toBe(true);
    expect(result.proposal?.genre).toBeTruthy();
  });

  it("proposes genre from a long idea", () => {
    expect(LONG_FANTASY_IDEA.length).toBeGreaterThanOrEqual(LONG_IDEA_THRESHOLD);
    const result = analyzeLongIdeaForProposal(LONG_FANTASY_IDEA);
    expect(result.shouldPropose).toBe(true);
    expect(result.proposal).not.toBeNull();
    expect(result.proposal?.genre).toBeTruthy();
    expect(result.proposal?.bookTypeId).toBeTruthy();
    expect(["low", "medium", "high"]).toContain(result.proposal?.confidence);
  });

  it("includes tone and target reader when inference is confident", () => {
    const result = analyzeLongIdeaForProposal(LONG_FANTASY_IDEA);
    expect(result.proposal?.tone.length).toBeGreaterThan(8);
    expect(result.proposal?.targetReader.length).toBeGreaterThan(12);
  });
});
