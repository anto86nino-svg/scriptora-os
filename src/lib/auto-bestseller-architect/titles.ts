import { generateShadowTitleSet } from "@/lib/title-shadow";
import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import type { IdeaIntelligenceResult, MarketPositioningResult, TitleConcept } from "./types";

function titleRationale(
  title: string,
  subtitle: string,
  idea: IdeaIntelligenceResult,
  market: MarketPositioningResult,
  angle: string,
): string {
  const parts: string[] = [];

  if (title.split(/\s+/).length <= 5) {
    parts.push("Memorable, market-sized title length.");
  } else {
    parts.push("Descriptive title with clear genre signal.");
  }
  if (subtitle && subtitle.length > 12) {
    parts.push("Subtitle adds emotional intrigue without explaining the whole plot.");
  }
  if (/romance|thriller|fantasy|dark/.test(idea.genre)) {
    parts.push("Genre signal aligns with reader shelf expectations.");
  }
  if (market.hookStrength >= 60) {
    parts.push("Supports a commercially informed opening hook.");
  }
  if (angle) {
    parts.push(`Angle: ${angle}.`);
  }

  return parts.slice(0, 4).join(" ");
}

export function buildTitleConcepts(
  input: AutoBestsellerInput,
  idea: IdeaIntelligenceResult,
  market: MarketPositioningResult,
): TitleConcept[] {
  const candidates = generateShadowTitleSet(
    {
      idea: input.idea,
      genre: idea.genre,
      subcategory: idea.subgenre,
      targetAudience: market.audienceProfile,
      readerPromise: market.emotionalPromise,
      tone: input.tone,
      language: input.language,
      titleLanguage: input.titleLanguage || input.language,
      title: input.prefilledTitle,
      subtitle: input.prefilledSubtitle,
    },
    4,
  );

  const concepts: TitleConcept[] = candidates.map((c) => ({
    title: c.title,
    subtitle: c.subtitle,
    confidence: c.confidence,
    rationale: titleRationale(c.title, c.subtitle, idea, market, c.angle),
  }));

  if (input.prefilledTitle?.trim()) {
    const manual: TitleConcept = {
      title: input.prefilledTitle.trim(),
      subtitle: (input.prefilledSubtitle || "").trim(),
      confidence: 0.85,
      rationale: "Author-selected title preserved from brief.",
    };
    const exists = concepts.some(
      (c) => c.title.toLowerCase() === manual.title.toLowerCase(),
    );
    if (!exists) concepts.unshift(manual);
  }

  return concepts.slice(0, 4);
}
