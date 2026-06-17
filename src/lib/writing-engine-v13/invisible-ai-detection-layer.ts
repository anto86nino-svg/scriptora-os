import type { V13Context, V13Result, V13Signal } from "./types";

const AI_SMELL = [
  /\bun silenzio carico di significato\b/gi,
  /\bil silenzio diceva tutto\b/gi,
  /\bun mare di emozioni\b/gi,
  /\bcapì finalmente che\b/gi,
  /\bin quel momento capì\b/gi,
  /\bcome se il mondo intero\b/gi,
  /\buna nuova consapevolezza\b/gi,
  /\ba silence heavy with meaning\b/gi,
  /\ban ocean of emotions\b/gi,
  /\bin that moment .* realized\b/gi,
];

export function runInvisibleAiDetectionLayer(text: string, ctx: V13Context = {}): V13Result {
  const signals: V13Signal[] = [];
  let hits = 0;

  for (const re of AI_SMELL) {
    const count = (text.match(re) || []).length;
    hits += count;
  }

  if (hits > 0) {
    signals.push({ id: "ai_smell", score: Math.max(30, 82 - hits * 12), message: `Trovate ${hits} frasi con odore AI/generico.` });
  }

  return {
    score: hits === 0 ? 96 : Math.max(40, 90 - hits * 12),
    signals,
    directives: [
      "Remove generic poetic AI phrases. Replace with specific object, gesture, pressure, or concrete observation.",
      "Prefer one precise image over a beautiful generic sentence.",
    ],
  };
}

export function applyInvisibleAiCleanup(text: string): string {
  return text
    .replace(/\bun silenzio carico di significato\b/gi, "un silenzio troppo lungo")
    .replace(/\bil silenzio diceva tutto\b/gi, "nessuno parlò subito")
    .replace(/\bun mare di emozioni\b/gi, "una confusione difficile da tenere ferma")
    .replace(/\bcapì finalmente che\b/gi, "si accorse che")
    .replace(/\bin quel momento capì che\b/gi, "solo allora vide che")
    .replace(/\bin quel momento capì\b/gi, "solo allora vide")
    .replace(/\buna nuova consapevolezza\b/gi, "una cosa semplice e scomoda");
}
