export function buildShowDontTellBlock(language?: string): string {
  const lang = String(language || "Italian");
  return `
SHOW DON'T TELL DOMINANCE (MANDATORY):
Before every emotional label, ask: "Posso mostrarlo invece di spiegarlo?"

CONVERT labels into behavior:
- "Era triste" → gesture, object, physical detail, avoidance
- "Aveva paura" → breath, grip, wrong word, delayed response
- "Si sentiva in colpa" → over-apologizing for something small, or silence

REDUCE: emotional adjectives standing alone (triste, felice, terrorizzato, devastato)
INCREASE: sensory detail, micro-action, environment reflecting inner state
Emotion must cost something visible — never only stated.
Write in ${lang}.
`.trim();
}
