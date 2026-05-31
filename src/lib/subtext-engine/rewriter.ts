import type { SubtextAnalysis } from "./types";

const REWRITE_MAP: Array<[RegExp, string]> = [
  [
    /\b(?:She|He|They|I|Elena|Marco|Lei|Lui) (?:was|were|felt|era|erano|si sent(?:iva|ivano)) (?:sad|triste| unhappy|infelice|abbandonat\w*) because (?:she|he|they|I|si) felt (?:abandoned|alone|abbandonat\w*|sol[oa])\.?/gi,
    "Guardò il telefono.\nNessun messaggio.",
  ],
  [
    /\b(?:Era|Erano|She was|He was) triste perch[eé] si sentiva abbandonat\w*\.?/gi,
    "Guardò il telefono.\nNessun messaggio.",
  ],
  [
    /\b(?:She|He|They|I) felt (?:abandoned|alone|abbandonat|sol[oa]) because[^.!?]+[.!?]/gi,
    "Il telefono restò muto sul comodino.",
  ],
  [
    /\b(?:was|were|era|erano) (?:sad|triste|angry|arrabbiat) because (?:[^.!?]+)[.!?]/gi,
    "Non rispose. Il silenzio pesò più di una risposta.",
  ],
  [
    /\bI felt ([^.!?]+) because ([^.!?]+)[.!?]/gi,
    "Le mani non trovarono niente da fare. Il $2 restò lì, non detto.",
  ],
];

export function rewriteExplainedEmotion(text: string, analysis?: SubtextAnalysis): string {
  if (!analysis?.weakPassages.length && !REWRITE_MAP.some(([p]) => p.test(text))) {
    return text;
  }

  let next = text;
  for (const [pattern, replacement] of REWRITE_MAP) {
    pattern.lastIndex = 0;
    next = next.replace(pattern, replacement);
  }

  return next.replace(/\n{3,}/g, "\n\n").trim();
}
