import { extractBeatClustersFromText } from "@/lib/premium-writing/narrative-beat-engine";

type LanguageKey = "it" | "en" | "default";

const FEAR_VARIANTS: Record<LanguageKey, string[]> = {
  it: [
    "Si spostò verso la porta senza aprirla.",
    "Le mani non trovarono nulla da fare.",
    "Non rispose. Non subito.",
    "Guardò un punto fisso sul pavimento.",
  ],
  en: [
    "She moved toward the door without opening it.",
    "Her hands had nothing to do.",
    "She didn't answer. Not right away.",
    "She stared at a fixed point on the floor.",
  ],
  default: ["They went still.", "No answer came."],
};

/** Evolve in-chapter repeated fear beats instead of "ho paura" variants (AI smell). */
export function evolveRepeatedEmotionalBeats(
  text: string,
  priorChapterText: string,
  language: LanguageKey,
): string {
  const priorClusters = extractBeatClustersFromText(priorChapterText);
  const currentClusters = extractBeatClustersFromText(text);
  const staleFear = priorClusters.includes("fear_of_loss") && currentClusters.includes("fear_of_loss");
  if (!staleFear) return text;

  const fearPatterns = language === "it"
    ? [/\bho (?:ancora )?paura\b/gi, /\bavevo (?:ancora )?paura\b/gi, /\bnon voglio perderti\b/gi]
    : [/\b(?:i am|i'm) (?:still )?afraid\b/gi, /\bafraid of losing (?:you|him|her)\b/gi];

  let next = text;
  let replaced = 0;
  const variants = FEAR_VARIANTS[language] || FEAR_VARIANTS.default;

  for (const pattern of fearPatterns) {
    next = next.replace(pattern, (match) => {
      if (replaced >= 2) return match;
      replaced += 1;
      return variants[replaced % variants.length];
    });
  }

  return next;
}
