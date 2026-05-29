import { detectBookIntelligence } from "@/lib/book-intelligence";
import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import type { IdeaIntelligenceResult } from "./types";

const EMOTIONAL_CATEGORY: Record<string, string> = {
  fiction: "Emotional immersion & relationship tension",
  nonfiction: "Transformation & practical clarity",
};

function commercialLaneFromReport(report: ReturnType<typeof detectBookIntelligence>): string {
  const { layers } = report;
  if (layers.domain === "fiction") {
    if (/romance|dark-romance|enemies|mafia/.test(layers.writingBrainId)) {
      return "Emotion-forward commercial fiction with high reader compulsion";
    }
    if (/thriller|crime|mystery|psychological/.test(layers.writingBrainId)) {
      return "Suspense-driven commercial fiction with escalating stakes";
    }
    if (/fantasy|epic|paranormal|sci-fi|dystopian/.test(layers.writingBrainId)) {
      return "Speculative fiction with world-building and emotional payoff";
    }
    return "Character-driven narrative with genre-specific reader expectations";
  }
  if (/productivity|business|finance/.test(layers.writingBrainId)) {
    return "Outcome-oriented nonfiction with actionable authority";
  }
  if (/psychology|self-help|spirituality/.test(layers.writingBrainId)) {
    return "Inner-transformation nonfiction with emotional resonance";
  }
  if (/horticultural|practical-manual|cookbook|technical/.test(layers.writingBrainId)) {
    return "Instructional nonfiction with trust-through-specificity";
  }
  return layers.commercialStructure || "Commercially informed niche positioning";
}

export function inferIdeaIntelligence(input: AutoBestsellerInput): IdeaIntelligenceResult {
  const report = detectBookIntelligence({
    idea: input.idea,
    genre: input.genre,
    subcategory: input.subcategory,
    tone: input.tone,
  });

  const domain = report.layers.domain;
  const emotionalCategory =
    report.layers.archetype && report.layers.archetype !== "general"
      ? `${EMOTIONAL_CATEGORY[domain] || "Reader-centered emotional journey"} · ${report.layers.archetype}`
      : EMOTIONAL_CATEGORY[domain] || "Reader-centered emotional journey";

  const readerExpectation =
    report.layers.readerExpectations?.slice(0, 2).join(" ") ||
    (domain === "fiction"
      ? "Readers expect escalating emotional friction, clear genre signals, and a payoff that honors the premise."
      : "Readers expect credible authority, a clear transformation path, and practical value without generic filler.");

  return {
    genre: report.resolvedGenre,
    subgenre: report.subcategory || report.layers.subgenre,
    emotionalCategory,
    commercialLane: commercialLaneFromReport(report),
    readerExpectation,
    confidence: report.confidence,
    signals: report.signals,
    report,
  };
}
