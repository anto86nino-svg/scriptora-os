/** Light post-pass — preserves author voice, removes only obvious AI tells */

const AI_APHORISM_ENDINGS: RegExp[] = [
  /\b(e in quel momento capì che|and in that moment (?:he|she|they) (?:knew|understood|realized) that)[^.!?…]{0,80}[.!?…]/gi,
  /\b(alcune cose cambiano per sempre|some things change forever)[.!?…]?/gi,
  /\b(il silenzio tra loro diceva tutto|the silence between them said everything)[.!?…]?/gi,
];

const GENERIC_METAPHOR_CLUSTERS: RegExp[] = [
  /\bcome un fulmine a ciel sereno\b/gi,
  /\blike a bolt from the blue\b/gi,
  /\bun mare di emozioni\b/gi,
  /\bocean of emotions\b/gi,
];

export function buildAiDetectionReductionBlock(): string {
  return `
AI DETECTION REDUCTION (MANDATORY):
REDUCE: generic metaphors, aphorism endings, overly elegant reflections, perfect closure lines
INCREASE: concrete sensory detail, imperfect rhythm, specificity over beauty
No sentence should sound like a motivational quote unless the character would actually think that way.
`.trim();
}

export function applyLightAiTellSoftening(text: string): string {
  if (!text?.trim()) return text;
  let result = text;
  for (const p of AI_APHORISM_ENDINGS) {
    result = result.replace(p, (m) => {
      const trimmed = m.trim();
      if (trimmed.length < 30) return trimmed;
      return trimmed.replace(/^[^.!?…]+[.!?…]\s*/, "").trim() || trimmed;
    });
  }
  for (const p of GENERIC_METAPHOR_CLUSTERS) {
    result = result.replace(p, "");
  }
  return result.replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function scoreAiTellDensity(text: string): number {
  let hits = 0;
  for (const p of [...AI_APHORISM_ENDINGS, ...GENERIC_METAPHOR_CLUSTERS]) {
    hits += (text.match(p) || []).length;
  }
  const therapy = (text.match(/\b(in fondo|alla fine|la verità è che|the truth is|deep down)\b/gi) || []).length;
  return Math.round(Math.max(25, 100 - hits * 14 - therapy * 6));
}
