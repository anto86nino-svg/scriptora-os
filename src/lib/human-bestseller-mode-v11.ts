import type { BookConfig } from "@/types/book";
import { resolveBookTypeContext } from "@/lib/book-type-engine";

type BestsellerMode = "generation" | "rewrite" | "final-pass";
type BookFamily = "narrative" | "nonfiction" | "manual" | "educational" | "poetry" | "cookbook";

interface BestsellerModeOptions {
  chapterIndex?: number;
  mode?: BestsellerMode;
}

interface BestsellerPostprocessOptions extends BestsellerModeOptions {
  language?: string;
  priorText?: string;
  config?: BookConfig;
}

function lower(value: unknown): string {
  return String(value || "").toLowerCase();
}

function isItalian(language?: string): boolean {
  return /ital/i.test(language || "");
}

function resolveFamily(config?: BookConfig): BookFamily {
  if (!config) return "narrative";
  try {
    return resolveBookTypeContext(config).definition.family as BookFamily;
  } catch {
    return "narrative";
  }
}

function genreBundle(config: BookConfig): string {
  return [config.genre, config.subgenre, config.subcategory, config.category, config.bookTypeId]
    .map(lower)
    .filter(Boolean)
    .join(" ");
}

function buildNarrativeGenreRules(config: BookConfig): string {
  const g = genreBundle(config);
  const rules: string[] = [];

  if (/romance/.test(g)) {
    rules.push(`ROMANCE / DARK ROMANCE:
- Slow burn is a pressure system, not a confession schedule.
- Build attraction through proximity, restraint, body language, bad timing, withheld softness and emotional cost.
- After a charged moment, add distance, embarrassment, misunderstanding, avoidance or practical consequence.
- Do not make the love interest emotionally fluent too early. Chemistry comes before confession.
- Preserve craving: micro reward -> distance -> new obstacle -> almost payoff -> frustration -> earned payoff later.`);
  }

  if (/thriller|crime|horror|mystery|noir/.test(g)) {
    rules.push(`THRILLER / CRIME / HORROR:
- Before payoff, make the reader wait: sound, absence, wrong detail, delayed reveal, dread, physical consequence.
- Every chapter must add pressure: clue, threat, false lead, deadline, suspicion, reversal or consequence.
- Do not compress phone call -> attack -> blood -> confession unless the outline explicitly demands a shock cut.
- Keep introspection short and weaponized by danger.`);
  }

  if (/fantasy|sci|science|dystop|speculative/.test(g)) {
    rules.push(`FANTASY / SCI-FI:
- Reveal world rules through cost, action, temptation, danger and consequence.
- No lore dump that pauses the story.
- Magic, technology, places, factions and limits must stay canon-consistent.
- The reader should feel the world because it pressures the character, not because it is explained.`);
  }

  return rules.join("\n\n");
}

function buildPracticalGenreRules(family: BookFamily): string {
  if (family === "educational") {
    return `STUDY / EDUCATIONAL:
- Teach like a human tutor: clear definition, plain explanation, example, application, recap, check question.
- Use analogies when they reduce friction.
- Keep difficulty progressive and level-aware.
- Do not turn educational content into romance, thriller or dramatic fiction unless explicitly requested.`;
  }

  if (family === "manual") {
    return `MANUAL / HOW-TO:
- Every section must make the reader more capable.
- Use steps, examples, warnings, troubleshooting, checklists and practical next actions.
- Avoid motivational fog and generic authority.`;
  }

  if (family === "poetry") {
    return `POETRY:
- Protect rhythm, image logic, silence, line tension and emotional coherence.
- Avoid generic AI abstractions.
- One concrete image should carry more weight than five explanations.`;
  }

  return `SELF-HELP / NONFICTION / BUSINESS:
- Sound human, not guru-perfect.
- Use concrete stories, frameworks, exercises and decision paths.
- Every chapter must add usable value; no repeated motivational fog.`;
}

export function buildHumanBestsellerModeV11Block(config: BookConfig, opts: BestsellerModeOptions = {}): string {
  const family = resolveFamily(config);
  const chapterLabel = typeof opts.chapterIndex === "number" ? `Chapter ${opts.chapterIndex + 1}` : "This section";
  const mode = opts.mode || "generation";

  if (family !== "narrative") {
    return `
HUMAN BESTSELLER MODE V11 — PRACTICAL READABILITY (${family}, ${mode}):
- Priority: compulsive clarity, practical value, reader trust and forward motion.
- If a sentence sounds impressive but does not help the reader, cut or simplify it.
- Use human examples, useful structure, concrete steps and honest limitations.
- Avoid hype, empty motivation, poetic overreach and generic AI advice.
- ${chapterLabel} must leave the reader with a clearer next step than they had before.

${buildPracticalGenreRules(family)}

FINAL CHECK:
- Would a real editor say this is clear, useful and worth continuing?
- If not, make it more specific, more concrete and easier to act on.`;
  }

  return `
HUMAN BESTSELLER MODE V11 — HUMAN BESTSELLER WRITING LAW (${mode}):
Scriptora must not sound like an AI writer that writes well. It must sound like a human bestselling author with taste, restraint and story instinct.

ABSOLUTE PRIORITY:
- Compulsive readability beats beautiful prose.
- Emotional pull beats elegant explanation.
- Character obsession beats perfect maturity.
- Page-turning tension beats polished introspection.
- If a sentence is beautiful but slows the reader, compress it.
- If a scene is elegant but does not push the story forward, sharpen or cut it.

HUMANITY ENGINE:
- Real people do not explain their trauma neatly.
- Real people avoid, lie, deflect, joke badly, interrupt, contradict themselves and say the wrong thing.
- Use silence, awkwardness, defensive sarcasm, unfinished sentences, physical gesture, withheld truth and micro-conflict.
- Dialogue should hide as much as it reveals.
- Gesture > thought. Silence > monologue. Behavior > explanation. Tension > clarity. Subtext > truth spoken too early.

ANTI-AI DETECTOR:
- Beautiful sentence overload: after one lyrical sentence, ground the scene with action, object, body, choice or interruption.
- Therapy dialogue filter: if characters name their feelings too perfectly, make them evade, misfire, understate or contradict.
- Emotional repetition detector: if a fear/confession/promise already appeared, create a new consequence instead of repeating it.
- Perfect character filter: if someone sounds too mature, add defense, mistake, ambiguity, anger, denial or self-sabotage.
- Scene purpose engine: every scene needs at least one reveal, tension increase, attraction, mystery, conflict, consequence or decision.

COMMERCIAL BESTSELLER MODE:
- Write for "one more chapter" momentum.
- Each chapter ending should open a question, threat, romantic tension, secret, reversal, difficult choice or memorable image.
- No flat endings. No complete emotional resolution unless it is the earned late-book payoff.

PROSE CONTROL:
- Maximum one highlight-worthy beautiful sentence every 5-8 sentences.
- Alternate short, medium and long sentences.
- Reduce adjectives, adverbs and abstract psychology.
- Prefer strong verbs, concrete details, sensory pressure and micro-actions.

${buildNarrativeGenreRules(config)}

FINAL GOLD STANDARD:
- Before returning text, silently ask: does this feel written by a human author who could sell thousands of copies?
- If no, make it less perfect, more tense, more concrete and harder to stop reading.
- Return only clean manuscript prose in ${config.language}.`;
}

const V11_LEAKAGE_PATTERNS: RegExp[] = [
  /^(HUMAN BESTSELLER MODE V11|HUMANITY ENGINE|ANTI-AI DETECTOR|COMMERCIAL BESTSELLER MODE|PROSE CONTROL|FINAL GOLD STANDARD|CORE WRITING LAW)[:\s—-].*$/gim,
  /\b(HUMAN BESTSELLER MODE V11|ANTI-AI DETECTOR|THERAPY DIALOGUE FILTER|BEAUTIFUL SENTENCE OVERLOAD|SCRIPTORA GOLD STANDARD)\b/gi,
  /^(Gesture > thought|Silence > monologue|Behavior > explanation|Tension > clarity|Subtext > truth).*$/gim,
];

const ITALIAN_THERAPY_PHRASES: RegExp[] = [
  /«?\s*devo spiegarti (?:bene\s+)?il mio trauma[^».\n]*(?:[.»])?/gi,
  /«?\s*ho bisogno di elaborare (?:il|questo) trauma[^».\n]*(?:[.»])?/gi,
  /«?\s*mi sento finalmente al sicuro con te[^».\n]*(?:[.»])?/gi,
  /«?\s*possiamo guarire insieme[^».\n]*(?:[.»])?/gi,
  /«?\s*ora capisco perfettamente quello che provo[^».\n]*(?:[.»])?/gi,
  /«?\s*il mio trauma mi ha insegnato[^».\n]*(?:[.»])?/gi,
];

const ENGLISH_THERAPY_PHRASES: RegExp[] = [
  /"?\s*i need to explain my trauma[^".\n]*(?:[."])?/gi,
  /"?\s*i finally feel safe with you[^".\n]*(?:[."])?/gi,
  /"?\s*we can heal together[^".\n]*(?:[."])?/gi,
  /"?\s*i understand my feelings perfectly now[^".\n]*(?:[."])?/gi,
];

function stripV11Leakage(text: string): string {
  let result = text;
  for (const pattern of V11_LEAKAGE_PATTERNS) result = result.replace(pattern, "");
  return result;
}

function reduceTherapyDialogue(text: string, language: string): string {
  let result = text;
  const phrases = isItalian(language) ? ITALIAN_THERAPY_PHRASES : ENGLISH_THERAPY_PHRASES;
  for (const pattern of phrases) result = result.replace(pattern, "");

  if (isItalian(language)) {
    result = result.replace(
      /[«"]Ho paura di soffrire ancora[.»"]?/gi,
      "«Non faccio più quella cosa.»\n\n«Quale cosa?»\n\n«Fidarmi.»",
    );
  } else {
    result = result.replace(
      /["“]I am afraid of getting hurt again[.”"]?/gi,
      "\"I don't do that anymore.\"\n\n\"Do what?\"\n\n\"Trust people.\"",
    );
  }

  return result;
}

function removeRepeatedTherapyBeats(text: string, priorText = ""): string {
  const lowerPrior = lower(priorText);
  const repeatedSignals = [
    "un giorno alla volta",
    "ho paura",
    "fidarmi",
    "non scappo piu",
    "non scappo più",
    "i am afraid",
    "one day at a time",
    "trust people",
  ];

  const activeSignals = repeatedSignals.filter((signal) => lowerPrior.includes(signal));
  if (!activeSignals.length) return text;

  return text
    .split(/\n{2,}/)
    .filter((para) => {
      const normalized = lower(para);
      const hasSignal = activeSignals.some((signal) => normalized.includes(signal));
      if (!hasSignal) return true;
      const hasNewAction = /\b(chiam|apr|chius|prese|lasci|usc|entr|firm|mand|telefon|corse|torn|guard|call|opened|closed|left|signed|sent|ran)\w*/i.test(para);
      return hasNewAction;
    })
    .join("\n\n");
}

function normalizeSpacing(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

export function applyHumanBestsellerModeV11Postprocess(
  text: string,
  opts: BestsellerPostprocessOptions = {},
): string {
  if (!text?.trim()) return text || "";

  const language = opts.language || opts.config?.language || "Italian";
  const family = resolveFamily(opts.config);
  let result = stripV11Leakage(text);

  if (family === "narrative") {
    result = reduceTherapyDialogue(result, language);
    result = removeRepeatedTherapyBeats(result, opts.priorText || "");
  }

  return normalizeSpacing(result);
}
