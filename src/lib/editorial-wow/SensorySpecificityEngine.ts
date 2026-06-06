/**
 * SENSORY SPECIFICITY ENGINE
 *
 * Replaces generic sensory references with more specific alternatives.
 * Adds at most 1–2 concrete sensory anchors per chapter (non-intrusive).
 *
 * "A smell" → "the smell of cold stone and candle wax"
 * "some light" → "pale light through narrow glass"
 *
 * Conservative: only replaces explicit generic placeholders.
 * Pure, synchronous, never throws.
 */

type Lang = "it" | "en" | "default";

function langKey(l: string): Lang {
  if (/ital/i.test(l)) return "it";
  if (/engl/i.test(l)) return "en";
  return "default";
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < Math.min(s.length, 400); i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/* ---- Concrete sensory pools ---- */

const SMELLS_IT = [
  "odore di pietra fredda e cera",
  "profumo di erba bagnata",
  "odore acre di inchiostro vecchio",
  "odore di cucina calda",
  "profumo di legno stagionato",
];
const SMELLS_EN = [
  "cold stone and candle wax",
  "wet grass and mud",
  "old ink and dust",
  "warm bread and woodsmoke",
  "salt and pine",
];

const LIGHTS_IT = [
  "luce pallida che filtrava a strisce sottili",
  "bagliore arancione del tardo pomeriggio",
  "luce fluorescente, fredda e piatta",
  "controluce di prima mattina",
];
const LIGHTS_EN = [
  "pale light slanting through narrow glass",
  "orange late-afternoon glare",
  "cold flat fluorescent white",
  "early morning backlight",
];

const SOUNDS_IT = [
  "il rumore sordo dei passi su parquet",
  "il ronzio continuo dei condizionatori",
  "uno scricchiolio lontano",
  "silenzio tranne il respiro",
];
const SOUNDS_EN = [
  "the dull thud of footsteps on old boards",
  "the hum of an AC unit somewhere above",
  "a single distant creak",
  "silence except for breathing",
];

const TEXTURES_IT = [
  "freddo del metallo sotto le dita",
  "ruvido del muro di mattoni",
  "tessuto logoro del cuscino",
];
const TEXTURES_EN = [
  "cold metal under the fingers",
  "rough brick wall",
  "worn fabric of an old cushion",
];

/* ---- Generic → specific replacements ---- */

function buildPatterns(lang: Lang, seedText: string): Array<[RegExp, string]> {
  const s = hash(seedText);
  const pick = <T>(arr: T[]) => arr[s % arr.length] as T;

  if (lang === "it") {
    return [
      [/\bun (certo )?profumo\b/gi, `un profumo di ${pick(SMELLS_IT)}`],
      [/\bun (certo )?odore\b/gi, `odore di ${pick(SMELLS_IT)}`],
      [/\bla (poca |debole )?luce\b/gi, pick(LIGHTS_IT)],
      [/\bun (certo )?rumore\b/gi, pick(SOUNDS_IT)],
      [/\bqualcosa di (ruvido|duro|freddo|morbido)\b/gi, pick(TEXTURES_IT)],
    ];
  } else {
    return [
      [/\ba (certain |faint )?smell\b/gi, `a smell of ${pick(SMELLS_EN)}`],
      [/\bsome (faint |dim )?light\b/gi, pick(LIGHTS_EN)],
      [/\ba (certain |strange )?sound\b/gi, pick(SOUNDS_EN)],
      [/\bsomething (rough|hard|cold|soft)\b/gi, pick(TEXTURES_EN)],
    ];
  }
}

export interface SensoryResult {
  text: string;
  interventions: string[];
}

export function applySensorySpecificityEngine(
  text: string,
  language = "Italian",
): SensoryResult {
  if (!text?.trim()) return { text: text ?? "", interventions: [] };

  const lang = langKey(language);
  const patterns = buildPatterns(lang, text.slice(0, 300));
  const interventions: string[] = [];
  let result = text;
  let totalReplaced = 0;

  for (const [pattern, replacement] of patterns) {
    if (totalReplaced >= 2) break; // max 2 sensory upgrades per chapter
    const before = result;
    // Only replace the FIRST occurrence of each pattern
    result = result.replace(pattern, replacement);
    if (result !== before) {
      totalReplaced++;
      interventions.push(`Sensory specificity: "${pattern.source.slice(0, 30)}…" → more concrete`);
    }
  }

  return { text: result, interventions };
}
