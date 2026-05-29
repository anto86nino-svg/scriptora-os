import { generateShadowTitleSet } from "@/lib/title-shadow";
import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import { getTitleRationaleCopy, normalizeArchitectLang } from "./localized-copy";
import type { IdeaIntelligenceResult, MarketPositioningResult, TitleConcept } from "./types";

function titleRationale(
  title: string,
  subtitle: string,
  idea: IdeaIntelligenceResult,
  market: MarketPositioningResult,
  angle: string,
  lang: ReturnType<typeof normalizeArchitectLang>,
): string {
  const copy = getTitleRationaleCopy(lang);
  const parts: string[] = [];

  if (title.split(/\s+/).length <= 5) {
    parts.push(copy.shortTitle);
  } else {
    parts.push(copy.longTitle);
  }
  if (subtitle && subtitle.length > 12) {
    parts.push(copy.subtitle);
  }
  if (/romance|thriller|fantasy|dark/.test(idea.genre)) {
    parts.push(copy.genre);
  }
  if (market.hookStrength >= 60) {
    parts.push(copy.hook);
  }
  if (angle) {
    parts.push(copy.angle(angle));
  }

  return parts.slice(0, 4).join(" ");
}

export function buildTitleConcepts(
  input: AutoBestsellerInput,
  idea: IdeaIntelligenceResult,
  market: MarketPositioningResult,
): TitleConcept[] {
  const lang = normalizeArchitectLang(input.language);
  const rationaleCopy = getTitleRationaleCopy(lang);
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
    rationale: titleRationale(c.title, c.subtitle, idea, market, c.angle, lang),
  }));

  if (input.prefilledTitle?.trim()) {
    const manual: TitleConcept = {
      title: input.prefilledTitle.trim(),
      subtitle: (input.prefilledSubtitle || "").trim(),
      confidence: 0.85,
      rationale: rationaleCopy.manual,
    };
    const exists = concepts.some(
      (c) => c.title.toLowerCase() === manual.title.toLowerCase(),
    );
    if (!exists) concepts.unshift(manual);
  }

  return concepts.slice(0, 4);
}
