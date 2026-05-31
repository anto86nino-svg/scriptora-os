import type { BookConfig } from "@/types/book";
import { computeGreatnessScore } from "@/lib/greatness-engine";
import { analyzeSubtext } from "@/lib/subtext-engine";
import { analyzeTensionV2 } from "@/lib/tension-engine-v2";
import type { MasterpieceReviewReport, MasterpieceSuggestion } from "./types";
import { clamp100, endingChars, openingWords, splitScenes } from "./utils";
import { analyzeQuotePotential } from "./quote-detector";

export function reviewMasterpiece(input: {
  content: string;
  config: BookConfig;
  chapterIndex: number;
}): MasterpieceReviewReport {
  const text = String(input.content || "");
  const suggestions: MasterpieceSuggestion[] = [];
  const subtext = analyzeSubtext({ content: text, chapterIndex: input.chapterIndex });
  const tension = analyzeTensionV2({ content: text, chapterIndex: input.chapterIndex, config: input.config });
  const greatness = computeGreatnessScore({ content: text, config: input.config, chapterIndex: input.chapterIndex });
  const quotes = analyzeQuotePotential(text);

  if (subtext.metrics.explainedEmotion > 0) {
    suggestions.push({
      lens: "developmental",
      message: "Emotion is still partially told — swap one named feeling for a concrete gesture.",
      microElevation: "Replace one 'was sad/happy' beat with an object or silence.",
    });
  }
  if (tension.narrativeTension < 58) {
    suggestions.push({
      lens: "developmental",
      message: "Scene arc resolves too early — delay one reconciliation or reveal.",
    });
  }
  if (!quotes.topQuote) {
    suggestions.push({
      lens: "line",
      message: "No underline-worthy line yet — craft one short sentence with contrast.",
      microElevation: "Some details stay — even when you want to forget them.",
    });
  }
  if (greatness.greatnessScore.dimensions.bingeability < 70) {
    suggestions.push({
      lens: "beta",
      message: "Reader could stop at chapter end — add forward pull, not tidy closure.",
      microElevation: "The next move would not wait for her.",
    });
  }
  if (openingWords(text, 80).match(/^(it was|in this chapter|this chapter)/i)) {
    suggestions.push({
      lens: "commercial",
      message: "Opening reads generic — start in scene with friction or wrong detail.",
    });
  }
  if (/(everything was fine|all was well|in conclusion)/i.test(endingChars(text))) {
    suggestions.push({
      lens: "commercial",
      message: "Closing resolves commercially weak — leave one thread hot.",
      microElevation: "Something still waited — unanswered.",
    });
  }

  const idealGapScore = clamp100(
    100 -
      (subtext.metrics.explainedEmotion > 0 ? 12 : 0) -
      (tension.narrativeTension < 58 ? 10 : 0) -
      (!quotes.topQuote ? 14 : 0) -
      (greatness.greatnessScore.dimensions.bingeability < 55 ? 10 : 0),
  );

  return {
    suggestions: suggestions.slice(0, 6),
    idealGapScore,
    passesGate: idealGapScore >= 72 && suggestions.length <= 3,
  };
}

export function applyMasterpieceMicroElevations(content: string, review: MasterpieceReviewReport): { content: string; applied: number } {
  let next = content.trim();
  let applied = 0;

  for (const suggestion of review.suggestions) {
    if (!suggestion.microElevation) continue;
    if (suggestion.microElevation === "Some details stay — even when you want to forget them." && !/Some details stay/i.test(next)) {
      const paragraphs = splitScenes(next);
      paragraphs.splice(Math.min(1, paragraphs.length), 0, suggestion.microElevation);
      next = paragraphs.join("\n\n");
      applied += 1;
    } else if (suggestion.microElevation === "The next move would not wait for her." && !/next move would not wait/i.test(next)) {
      next = `${next}\n\n${suggestion.microElevation}`;
      applied += 1;
    } else if (suggestion.microElevation === "Something still waited — unanswered." && !/still waited/i.test(next)) {
      next = `${next}\n\n${suggestion.microElevation}`;
      applied += 1;
    }
  }

  return { content: next.replace(/\n{3,}/g, "\n\n").trim(), applied };
}
