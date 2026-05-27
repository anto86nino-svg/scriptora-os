export interface EditorialWarning {
  type:
    | "emotional_redundancy"
    | "dialogue_perfection"
    | "climax_oversaturation"
    | "character_flattening"
    | "repetitive_symbolism"
    | "weak_subtext"
    | "overwritten_scene";

  severity: "low" | "medium" | "high";

  chapter?: number;

  message: string;

  suggestion: string;
}

export interface EditorialReport {
  emotionalRedundancyScore: number;
  dialogueHumanityScore: number;
  pacingConsistencyScore: number;
  climaxDensityScore: number;
  subtextScore: number;
  characterConsistencyScore: number;

  warnings: EditorialWarning[];
}

const REPETITIVE_PHRASES = [
  "per sempre",
  "non ti lascio",
  "non andartene",
  "ti amo",
  "insieme",
  "sei mia",
  "sei mio",
  "resta",
  "nostro",
  "scegliamo",
];

function countOccurrences(text: string, phrase: string): number {
  const matches = text
    .toLowerCase()
    .match(new RegExp(phrase.toLowerCase(), "g"));

  return matches ? matches.length : 0;
}

export function detectEmotionalRedundancy(
  text: string
): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];

  for (const phrase of REPETITIVE_PHRASES) {
    const count = countOccurrences(text, phrase);

    if (count >= 6) {
      warnings.push({
        type: "emotional_redundancy",
        severity: count >= 10 ? "high" : "medium",

        message: `Phrase "${phrase}" appears ${count} times and may create emotional repetition.`,

        suggestion:
          "Reduce repeated emotional declarations and increase subtext/silence variation.",
      });
    }
  }

  return warnings;
}

export function analyzeNovel(text: string): EditorialReport {
  return {
    emotionalRedundancyScore: 0,
    dialogueHumanityScore: 0,
    pacingConsistencyScore: 0,
    climaxDensityScore: 0,
    subtextScore: 0,
    characterConsistencyScore: 0,

    warnings: detectEmotionalRedundancy(text),
  };
}
