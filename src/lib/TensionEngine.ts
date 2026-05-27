import type { BookConfig, Chapter } from "@/types/book";

export type NarrativeTensionContext = {
  config?: Partial<BookConfig>;
  previousChapters?: Array<Pick<Chapter, "title" | "content">>;
  chapterIndex?: number;
  outlineSummary?: string;
};

const NARRATIVE_GENRES = new Set([
  "romance",
  "dark-romance",
  "thriller",
  "fantasy",
  "memoir",
  "horror",
  "sci-fi",
  "historical",
  "biography",
  "children",
  "fairy-tale",
]);

const MEMORY_PATTERNS = [
  { id: "abandonment", re: /\b(abandon|abandoned|left|leaving|leave|stay|restare|lasciat[oa]|andare|rimani|queda|partir|bleiben|verlassen)\b/i },
  { id: "betrayal", re: /\b(betray|betrayed|trust|lied|tradit[oa]|fiducia|mentito|traicion|confiance|verrat)\b/i },
  { id: "fear", re: /\b(fear|afraid|panic|terrified|paura|spaventat[oa]|panico|miedo|peur|angst)\b/i },
  { id: "attachment", re: /\b(want|need|touch|kiss|desire|desider|bacio|toccare|besoin|beso|kuss)\b/i },
];

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function isNarrativeHumanizerGenre(config?: Partial<BookConfig>): boolean {
  const genre = String(config?.genre || "").toLowerCase();
  const category = String(config?.category || "").toLowerCase();
  const subcategory = String(config?.subcategory || "").toLowerCase();

  return (
    NARRATIVE_GENRES.has(genre) ||
    category.includes("fiction") ||
    subcategory.includes("romance") ||
    subcategory.includes("thriller") ||
    subcategory.includes("fantasy") ||
    subcategory.includes("novel")
  );
}

export function deriveEmotionalMemorySignals(previousChapters: NarrativeTensionContext["previousChapters"] = []): string[] {
  const memoryText = previousChapters
    .slice(-4)
    .map((chapter) => `${chapter.title || ""}\n${textOf(chapter.content).slice(-1600)}`)
    .join("\n")
    .toLowerCase();

  if (!memoryText.trim()) return [];
  return MEMORY_PATTERNS.filter((item) => item.re.test(memoryText)).map((item) => item.id);
}

export function buildTensionPromptBlock(context: NarrativeTensionContext = {}): string {
  if (!isNarrativeHumanizerGenre(context.config)) return "";

  const signals = deriveEmotionalMemorySignals(context.previousChapters);
  const memoryLine = signals.length
    ? `Long-term emotional memory to keep active: ${signals.join(", ")}. Let old wounds affect small reactions without explaining them.`
    : "Create a hidden emotional wound for the scene and let it leak through behavior, not explanation.";

  return `
HUMAN EMOTION ENGINE V2 - ADDITIVE NARRATIVE RULES:
- Keep the existing plot, genre and continuity. Do not change events just to create drama.
- Delay emotional resolution. Attraction can rise while the characters resist it.
- Dialogue must carry subtext: what they say should not be the whole truth.
- Under stress, people speak shorter, dodge direct answers, interrupt themselves and leave silences.
- Avoid therapist-like emotional clarity. Let characters be defensive, careful, contradictory or late to understand themselves.
- Balance lyricism with grounded beats: object handling, room sounds, awkward pauses, physical distance.
- ${memoryLine}

CHARACTER VOICE VARIANCE:
- Emotionally avoidant characters use shorter dialogue, deflection and unfinished thoughts.
- Emotionally expressive characters can be more directly vulnerable, but not perfectly articulate.
- Proud characters mask feeling with control, sarcasm, understatement or indirect admission.
- Anxious attachment characters seek reassurance, overthink, repeat small questions and fear disappearance.
- Do not let different characters use the same emotional confession pattern. Avoid recognizable repeated lines like "I don't know how to do this."

SUBTEXT BEFORE DIALOGUE:
For every important exchange, silently decide:
OUTWARD QUESTION: what the character says.
REAL INTENT: what the character cannot ask for.
Only write the outward line and the body behavior. Never label the hidden intent.
`.trim();
}

function languageKey(config?: Partial<BookConfig>): "it" | "en" | "default" {
  const language = String(config?.language || "").toLowerCase();
  if (language.includes("ital")) return "it";
  if (language.includes("english")) return "en";
  return "default";
}

const SILENCE_BEATS: Record<ReturnType<typeof languageKey>, string[]> = {
  it: [
    "Da qualche parte, nel corridoio, qualcosa scricchiolo. Nessuno dei due si mosse.",
    "Il bicchiere resto tra le sue dita, troppo stretto, troppo fragile.",
    "Per un momento ci fu solo il rumore del respiro trattenuto.",
  ],
  en: [
    "Somewhere down the hall, a floorboard creaked. Neither of them moved.",
    "The glass stayed in their hand, held too tightly to be casual.",
    "For a moment, there was only the sound of a breath being held.",
  ],
  default: [
    "A small sound crossed the room. Neither of them moved.",
    "The glass stayed in one hand, held too tightly.",
    "For a moment, nobody filled the silence.",
  ],
};

const MEMORY_BEATS: Record<string, Record<ReturnType<typeof languageKey>, string[]>> = {
  abandonment: {
    it: ["La parola restare le passo in gola e non usci.", "Guardò la porta come se avesse gia scelto per entrambi.", "Fece per parlare, ma il suono mori prima."],
    en: ["The word stay rose in the throat and went nowhere.", "They looked at the door as if it had already chosen for them.", "Someone started to speak, then lost the nerve."],
    default: ["The word stay almost appeared, then disappeared again.", "A glance moved toward the door and came back empty.", "Someone nearly asked, then swallowed it."],
  },
  betrayal: {
    it: ["La fiducia arrivo per prima. La paura, subito dopo.", "Per un secondo volle crederci. Poi ricordo.", "Il vecchio tradimento fece rumore senza dire il proprio nome."],
    en: ["Trust arrived first. Fear followed too closely behind it.", "For one second, belief almost won. Then memory answered.", "The old betrayal made noise without naming itself."],
    default: ["Trust arrived first. Fear followed close behind.", "Belief almost won. Memory answered faster.", "The old hurt moved through the room unnamed."],
  },
  fear: {
    it: ["Le dita cercarono qualcosa da stringere prima ancora che arrivasse una risposta.", "Il respiro si fece piu piccolo.", "Non arretrò. Non proprio."],
    en: ["The fingers searched for something to hold before an answer came.", "The breath got smaller.", "They did not step back. Not exactly."],
    default: ["A hand searched for something to hold before an answer came.", "The breath got smaller.", "Nobody stepped back. Not exactly."],
  },
  attachment: {
    it: ["Fece mezzo passo avanti. Poi si fermo come se il pavimento avesse cambiato idea.", "La distanza tra loro rimase piccola. Abbastanza da far male.", "La mano si mosse, poi torno al proprio posto."],
    en: ["They took half a step forward. Then stopped, as if the floor had changed its mind.", "The space between them stayed small. Small enough to hurt.", "A hand moved, then returned to its place."],
    default: ["Someone took half a step forward, then stopped.", "The space between them stayed small enough to hurt.", "A hand moved, then returned to its place."],
  },
};

function chooseBeat(items: string[], seed: number): string {
  return items[Math.abs(seed) % items.length] || items[0] || "";
}

function normalizePatternText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countNormalizedOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function previousChapterText(context: NarrativeTensionContext): string {
  return normalizePatternText(
    (context.previousChapters || [])
      .slice(-8)
      .map((chapter) => `${chapter.title || ""}\n${textOf(chapter.content)}`)
      .join("\n"),
  );
}

function chooseBeatWithMemory(items: string[], seed: number, context: NarrativeTensionContext, currentText: string): string {
  if (!items.length) return "";
  const history = previousChapterText(context);
  const current = normalizePatternText(currentText);
  const scored = items.map((item) => {
    const normalized = normalizePatternText(item);
    return {
      item,
      repeats: countNormalizedOccurrences(history, normalized) * 3 + countNormalizedOccurrences(current, normalized),
    };
  });
  const lowest = Math.min(...scored.map((entry) => entry.repeats));
  const leastRepeated = scored.filter((entry) => entry.repeats === lowest);
  return leastRepeated[Math.abs(seed) % leastRepeated.length]?.item || scored[0].item;
}

function hasRecentGrounding(text: string): boolean {
  return /\b(door|glass|cup|table|chair|floor|window|phone|breath|hand|fingers|porta|bicchiere|tavolo|sedia|pavimento|finestra|telefono|respiro|mano|dita)\b/i.test(text);
}

export function applyTensionEngine(text: string, context: NarrativeTensionContext = {}): string {
  if (!text?.trim() || !isNarrativeHumanizerGenre(context.config)) return text;

  const lang = languageKey(context.config);
  const paragraphs = text.split(/\n{2,}/);
  const seed = (context.chapterIndex || 0) + text.length;
  const hasDialogue = /["“”«»]/.test(text);
  const signals = deriveEmotionalMemorySignals(context.previousChapters);

  let injectedSilence = false;
  let injectedMemory = false;

  const result = paragraphs.map((paragraph, index) => {
    let next = paragraph;
    const shouldAddSilence =
      !injectedSilence &&
      hasDialogue &&
      index > 0 &&
      index < paragraphs.length - 1 &&
      /["“”«»]/.test(paragraph) &&
      !hasRecentGrounding(paragraph) &&
      paragraph.length > 120;

    if (shouldAddSilence) {
      next += `\n${chooseBeatWithMemory(SILENCE_BEATS[lang], seed + index, context, next)}`;
      injectedSilence = true;
    }

    if (!injectedMemory && signals.length && index > 1 && index < paragraphs.length - 1) {
      const signal = signals[(seed + index) % signals.length];
      const beats = MEMORY_BEATS[signal]?.[lang] || MEMORY_BEATS[signal]?.default;
      const beat = beats ? chooseBeatWithMemory(beats, seed + index + signals.length, context, next) : "";
      if (beat && /\b(stay|leave|trust|touch|kiss|restare|andare|fiducia|toccare|bacio)\b/i.test(text)) {
        next += `\n${beat}`;
        injectedMemory = true;
      }
    }

    return next;
  });

  return result.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
