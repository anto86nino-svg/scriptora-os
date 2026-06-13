import type { MarketWinnerMode } from "./types";
import { clampScore } from "./utils";
import type { ReaderAddictionResult } from "./reader-addiction";
import type { MemorabilityResult } from "./memorability";
import type { HookPowerResult } from "./hook-power";
import type { ChapterEndingResult } from "./chapter-ending";

export function resolveMarketWinnerMode(genre: string, family: string): MarketWinnerMode {
  const g = `${genre}`.toLowerCase();
  if (family === "instructional" || /self-help|productivity|business|manual|education/.test(g)) {
    return "actionable_momentum";
  }
  if (/romance|dark-romance/.test(g)) return "emotional_addiction";
  if (/thriller|gothic|mystery|suspense|noir|horror/.test(g)) return "compulsive_mystery";
  if (/fantasy|sci-fi|science-fiction/.test(g)) return "wonder_momentum";
  return "commercial_narrative";
}

export function scoreMarketWinnerLite(
  mode: MarketWinnerMode,
  hook: HookPowerResult,
  ending: ChapterEndingResult,
  addiction: ReaderAddictionResult,
  memorability: MemorabilityResult,
): number {
  let score = 50;
  switch (mode) {
    case "emotional_addiction":
      score = addiction.emotionalMomentum * 0.45 + hook.score * 0.2 + ending.score * 0.2 + memorability.score * 0.15;
      break;
    case "compulsive_mystery":
      score = ending.score * 0.35 + hook.score * 0.25 + addiction.bingeability * 0.25 + (100 - addiction.dropRisk) * 0.15;
      break;
    case "wonder_momentum":
      score = memorability.score * 0.3 + addiction.emotionalMomentum * 0.25 + hook.score * 0.2 + ending.score * 0.25;
      break;
    case "actionable_momentum":
      score = hook.score * 0.35 + addiction.emotionalMomentum * 0.35 + memorability.score * 0.15 + (100 - addiction.narrativeDrag) * 0.15;
      break;
    default:
      score = (hook.score + ending.score + addiction.score + memorability.score) / 4;
  }
  return clampScore(score);
}

export function buildMarketWinnerPromptBlock(mode: MarketWinnerMode): string {
  const lines: Record<MarketWinnerMode, string> = {
    emotional_addiction: "MARKET WINNER LITE — Romance: emotional addiction, attrito/desiderio, chiusure che bruciano.",
    compulsive_mystery: "MARKET WINNER LITE — Thriller/Gothic: mistero compulsivo, domande aperte, rischio crescente.",
    wonder_momentum: "MARKET WINNER LITE — Fantasy: wonder + momentum, immagini memorabili, avanzamento mondo/trama.",
    actionable_momentum: "MARKET WINNER LITE — Self Help: actionable momentum, payoff pratico rapido, zero fuffa iniziale.",
    commercial_narrative: "MARKET WINNER LITE: commercial readability, bingeability, hook retention, reader retention.",
  };
  return `${lines[mode]}
Valuta: BookTok potential, commercial readability, bingeability, reader retention, hook retention.`;
}
