import type { BookConfig } from "@/types/book";

type LanguageKey = "it" | "en" | "default";

function isRomanceOrThriller(config?: Partial<BookConfig>): boolean {
  const g = String(config?.genre || "").toLowerCase();
  const sub = String(config?.subcategory || "").toLowerCase();
  return /romance|thriller|dark-romance|gothic|horror/.test(`${g} ${sub}`);
}

function languageKey(config?: Partial<BookConfig>): LanguageKey {
  const language = String(config?.language || "").toLowerCase();
  if (language.includes("ital")) return "it";
  if (language.includes("english")) return "en";
  return "default";
}

const TRAUMA_DUMP_PATTERNS: Record<LanguageKey, RegExp[]> = {
  it: [
    /\b(?:quando avevo|da bambin[oa]|mio padre|mia madre).{40,220}(?:trauma|ferita|abbandono|abuso|violenz)/gi,
    /\b(?:ho capito che|ho sempre saputo che).{30,180}(?:vulnerabil|ferit|trauma|abbandon)/gi,
    /\bconfessò tutto.{20,120}/gi,
  ],
  en: [
    /\b(?:when i was|as a child|my father|my mother).{40,220}(?:trauma|wound|abandon|abuse|violence)/gi,
    /\b(?:i realized|i always knew).{30,180}(?:vulnerab|wound|trauma|abandon)/gi,
    /\bconfessed everything.{20,120}/gi,
  ],
  default: [],
};

const RESISTANCE_REPLACEMENTS: Record<LanguageKey, string[]> = {
  it: [
    "Non era il momento di dirlo. Lo sapeva anche lei.",
    "Si interruppe. Come se avesse già detto troppo.",
    "— Lascia stare — mormorò, guardando altrove.",
  ],
  en: [
    "It wasn't the moment to say it. She knew that too.",
    "She stopped mid-sentence, as if she'd already said too much.",
    "— Drop it — she murmured, looking away.",
  ],
  default: ["She stopped. That was enough for now."],
};

/** Block trauma-dumping + instant emotional availability in early romance/thriller chapters. */
export function applyCharacterResistance(
  text: string,
  ctx: { config?: Partial<BookConfig>; chapterIndex?: number },
): string {
  const chapterIndex = ctx.chapterIndex ?? 0;
  const total = ctx.config?.numberOfChapters || 12;
  const earlyPhase = chapterIndex / total < 0.35;
  if (!earlyPhase || !isRomanceOrThriller(ctx.config)) return text;

  const language = languageKey(ctx.config);
  let next = text;
  let hits = 0;
  const replacements = RESISTANCE_REPLACEMENTS[language] || RESISTANCE_REPLACEMENTS.default;

  for (const pattern of TRAUMA_DUMP_PATTERNS[language] || TRAUMA_DUMP_PATTERNS.default) {
    next = next.replace(pattern, () => {
      if (hits >= 2) return "";
      const replacement = replacements[hits % replacements.length];
      hits += 1;
      return replacement;
    });
  }

  return next;
}
