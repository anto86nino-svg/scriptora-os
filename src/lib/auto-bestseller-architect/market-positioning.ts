import { computeMarketPremiumScores } from "@/lib/market-intelligence-premium";
import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import type { IdeaIntelligenceResult } from "./types";
import type { MarketPositioningResult } from "./types";

function inferAudience(input: AutoBestsellerInput, idea: IdeaIntelligenceResult): string {
  if (input.targetAudience?.trim()) return input.targetAudience.trim();

  const domain = idea.report.layers.domain;
  const sub = idea.subgenre.toLowerCase();

  if (/enemies to lovers|dark romance|romantasy|slow burn/.test(sub)) {
    return "Adult readers who crave emotionally charged relationship arcs with high tension and delayed payoff.";
  }
  if (/psychological thriller|thriller|crime/.test(sub)) {
    return "Readers who binge suspense — they want escalating dread, sharp hooks, and credible stakes.";
  }
  if (/fantasy|epic|paranormal/.test(sub)) {
    return "Speculative fiction readers who expect immersive world logic plus emotional character stakes.";
  }
  if (domain === "nonfiction" && /productivity|habit|mindset/.test(sub)) {
    return "Professionals seeking structured behavior change — they want clarity, not motivational fluff.";
  }
  if (domain === "nonfiction") {
    return "Readers looking for credible guidance with a clear promise and practical application.";
  }
  return "Adult readers aligned with the genre's core emotional contract and commercial expectations.";
}

function emotionalPromise(input: AutoBestsellerInput, idea: IdeaIntelligenceResult): string {
  if (input.readerPromise?.trim()) return input.readerPromise.trim();

  const domain = idea.report.layers.domain;
  const sub = idea.subgenre.toLowerCase();

  if (/enemies to lovers/.test(sub)) {
    return "The slow, charged transformation from antagonism to intimacy — without losing edge.";
  }
  if (/dark romance/.test(sub)) {
    return "Forbidden desire under moral pressure — readers want intensity with consequence.";
  }
  if (/psychological thriller/.test(sub)) {
    return "A tightening sense that nothing is safe — perception and trust become the battlefield.";
  }
  if (domain === "fiction") {
    return "An emotionally earned journey where conflict, subtext, and payoff honor the premise.";
  }
  return "A credible path from problem to transformation — readers should feel guided, not lectured.";
}

function commercialPositioning(idea: IdeaIntelligenceResult): string {
  const sub = idea.subgenre.toLowerCase();
  const genre = idea.genre.toLowerCase();

  if (/romance|dark-romance|fantasy/.test(genre) && /enemies|romantasy|slow burn|dark/.test(sub)) {
    return "Strong crossover potential between emotionally driven fantasy/romance readers and high-tension commercial fiction audiences.";
  }
  if (/thriller|crime|mystery/.test(genre)) {
    return "Positioned in the commercial suspense lane — hook-first openings and sustained escalation matter more than literary density.";
  }
  if (idea.report.layers.domain === "nonfiction") {
    return `Commercial nonfiction lane: ${idea.subgenre} — authority and specificity beat generic inspiration.`;
  }
  return idea.commercialLane;
}

function hookExplanation(hook: number, premium: ReturnType<typeof computeMarketPremiumScores>): string {
  if (hook >= 72) {
    return "Opening premise carries clear commercial intrigue — the idea signals conflict or promise quickly.";
  }
  if (hook >= 58) {
    return "Solid conceptual hook with room to sharpen the first-page tension or specificity.";
  }
  return "Concept needs a sharper opening angle — consider leading with conflict, stakes, or an unexpected image.";
}

function buildReaderRisks(
  input: AutoBestsellerInput,
  idea: IdeaIntelligenceResult,
  premium: ReturnType<typeof computeMarketPremiumScores>,
): MarketPositioningResult["readerRisks"] {
  const risks: MarketPositioningResult["readerRisks"] = [];
  const ideaLen = input.idea.trim().split(/\s+/).length;

  if (premium.hookStrength < 55) {
    risks.push({ severity: "high", message: "Weak opening risk — premise may not grab readers on page one." });
  }
  if (ideaLen < 12) {
    risks.push({ severity: "medium", message: "Premise may read generic until character stakes and conflict are specified." });
  }
  if (premium.genreAlignment < 55) {
    risks.push({ severity: "high", message: "Genre expectation mismatch — align tone and structure with reader norms." });
  }
  if (/slow burn|slow-burn/.test(idea.subgenre) && premium.emotionalMomentum < 50) {
    risks.push({ severity: "medium", message: "Emotional tension may arrive too late for slow-burn romance expectations." });
  }
  if (premium.readerRetentionRisk === "high") {
    risks.push({ severity: "high", message: "Reader retention risk — middle sections may need stronger unresolved friction." });
  }
  if (idea.confidence < 0.5) {
    risks.push({ severity: "low", message: "Niche signals are mixed — refine subgenre or comp titles in the brief." });
  }
  if (!risks.length) {
    risks.push({ severity: "low", message: "No major commercial red flags detected — focus on execution in the writing room." });
  }
  return risks.slice(0, 5);
}

export function buildMarketPositioning(
  input: AutoBestsellerInput,
  idea: IdeaIntelligenceResult,
): MarketPositioningResult {
  const premium = computeMarketPremiumScores({
    content: input.idea,
    genre: idea.genre,
    language: input.language,
  });

  const hookStrength = premium.hookStrength;

  return {
    audienceProfile: inferAudience(input, idea),
    emotionalPromise: emotionalPromise(input, idea),
    commercialPositioning: commercialPositioning(idea),
    hookStrength,
    hookExplanation: hookExplanation(hookStrength, premium),
    readerRisks: buildReaderRisks(input, idea, premium),
    premium,
  };
}
