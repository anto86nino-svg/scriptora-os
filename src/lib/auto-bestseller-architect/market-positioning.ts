import { computeMarketPremiumScores } from "@/lib/market-intelligence-premium";
import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import { getMarketPositioningCopy, normalizeArchitectLang } from "./localized-copy";
import type { IdeaIntelligenceResult } from "./types";
import type { MarketPositioningResult } from "./types";

function inferAudience(
  input: AutoBestsellerInput,
  idea: IdeaIntelligenceResult,
  copy: ReturnType<typeof getMarketPositioningCopy>,
): string {
  if (input.targetAudience?.trim()) return input.targetAudience.trim();

  const domain = idea.report.layers.domain;
  const sub = idea.subgenre.toLowerCase();

  if (/enemies to lovers|dark romance|romantasy|slow burn/.test(sub)) {
    return copy.audiences.romance;
  }
  if (/psychological thriller|thriller|crime/.test(sub)) {
    return copy.audiences.thriller;
  }
  if (/fantasy|epic|paranormal/.test(sub)) {
    return copy.audiences.fantasy;
  }
  if (domain === "nonfiction" && /productivity|habit|mindset/.test(sub)) {
    return copy.audiences.productivity;
  }
  if (domain === "nonfiction") {
    return copy.audiences.nonfiction;
  }
  return copy.audiences.fallback;
}

function emotionalPromise(
  input: AutoBestsellerInput,
  idea: IdeaIntelligenceResult,
  copy: ReturnType<typeof getMarketPositioningCopy>,
): string {
  if (input.readerPromise?.trim()) return input.readerPromise.trim();

  const domain = idea.report.layers.domain;
  const sub = idea.subgenre.toLowerCase();

  if (/enemies to lovers/.test(sub)) {
    return copy.promises.enemies;
  }
  if (/dark romance/.test(sub)) {
    return copy.promises.darkRomance;
  }
  if (/psychological thriller/.test(sub)) {
    return copy.promises.thriller;
  }
  if (domain === "fiction") {
    return copy.promises.fiction;
  }
  return copy.promises.nonfiction;
}

function commercialPositioning(
  idea: IdeaIntelligenceResult,
  copy: ReturnType<typeof getMarketPositioningCopy>,
): string {
  const sub = idea.subgenre.toLowerCase();
  const genre = idea.genre.toLowerCase();

  if (/romance|dark-romance|fantasy/.test(genre) && /enemies|romantasy|slow burn|dark/.test(sub)) {
    return copy.positioning.crossover;
  }
  if (/thriller|crime|mystery/.test(genre)) {
    return copy.positioning.suspense;
  }
  if (idea.report.layers.domain === "nonfiction") {
    return copy.positioning.nonfiction(idea.subgenre);
  }
  return idea.commercialLane;
}

function hookExplanation(
  hook: number,
  copy: ReturnType<typeof getMarketPositioningCopy>,
): string {
  if (hook >= 72) return copy.hooks.high;
  if (hook >= 58) return copy.hooks.mid;
  return copy.hooks.low;
}

function buildReaderRisks(
  input: AutoBestsellerInput,
  idea: IdeaIntelligenceResult,
  premium: ReturnType<typeof computeMarketPremiumScores>,
  copy: ReturnType<typeof getMarketPositioningCopy>,
): MarketPositioningResult["readerRisks"] {
  const risks: MarketPositioningResult["readerRisks"] = [];
  const ideaLen = input.idea.trim().split(/\s+/).length;

  if (premium.hookStrength < 55) {
    risks.push({ severity: "high", message: copy.risks.weakHook });
  }
  if (ideaLen < 12) {
    risks.push({ severity: "medium", message: copy.risks.shortIdea });
  }
  if (premium.genreAlignment < 55) {
    risks.push({ severity: "high", message: copy.risks.genreMismatch });
  }
  if (/slow burn|slow-burn/.test(idea.subgenre) && premium.emotionalMomentum < 50) {
    risks.push({ severity: "medium", message: copy.risks.slowBurn });
  }
  if (premium.readerRetentionRisk === "high") {
    risks.push({ severity: "high", message: copy.risks.retention });
  }
  if (idea.confidence < 0.5) {
    risks.push({ severity: "low", message: copy.risks.mixedSignals });
  }
  if (!risks.length) {
    risks.push({ severity: "low", message: copy.risks.none });
  }
  return risks.slice(0, 5);
}

export function buildMarketPositioning(
  input: AutoBestsellerInput,
  idea: IdeaIntelligenceResult,
): MarketPositioningResult {
  const copy = getMarketPositioningCopy(normalizeArchitectLang(input.language));
  const premium = computeMarketPremiumScores({
    content: input.idea,
    genre: idea.genre,
    language: input.language,
  });

  const hookStrength = premium.hookStrength;

  return {
    audienceProfile: inferAudience(input, idea, copy),
    emotionalPromise: emotionalPromise(input, idea, copy),
    commercialPositioning: commercialPositioning(idea, copy),
    hookStrength,
    hookExplanation: hookExplanation(hookStrength, copy),
    readerRisks: buildReaderRisks(input, idea, premium, copy),
    premium,
  };
}
