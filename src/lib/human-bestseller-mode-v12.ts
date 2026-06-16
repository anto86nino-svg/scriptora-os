import type { BookConfig, Chapter } from "@/types/book";
import { resolveBookTypeContext } from "@/lib/book-type-engine";
import { applyStoryBibleLock } from "@/lib/StoryBibleLock";

type V12Mode = "generation" | "rewrite" | "final-pass";
type BookFamily = "narrative" | "nonfiction" | "manual" | "educational" | "poetry" | "cookbook";

interface V12Options {
  chapterIndex?: number;
  mode?: V12Mode;
}

interface V12PostprocessOptions extends V12Options {
  language?: string;
  priorText?: string;
  config?: BookConfig;
  previousChapters?: Array<Pick<Chapter, "title" | "content">>;
  outlineSummary?: string;
}

function lower(value: unknown): string {
  return String(value || "").toLowerCase();
}

function resolveFamily(config?: BookConfig): BookFamily {
  if (!config) return "narrative";
  try {
    return resolveBookTypeContext(config).definition.family as BookFamily;
  } catch {
    return "narrative";
  }
}

function isItalian(language?: string): boolean {
  return /ital/i.test(language || "");
}

function genreBundle(config: BookConfig): string {
  return [config.genre, config.subgenre, config.subcategory, config.category, config.bookTypeId]
    .map(lower)
    .filter(Boolean)
    .join(" ");
}

function characterObsessionLines(config: BookConfig): string {
  const characters = Array.isArray(config.characters) ? config.characters : [];
  if (!characters.length) {
    return "- No full cast bible is available: infer behavior from established chapters, but never rename existing characters.";
  }

  return characters.slice(0, 8).map((character) => {
    const name = [character.name, character.surname].filter(Boolean).join(" ").trim();
    return [
      `- ${name || "Character"}`,
      character.role ? `role=${character.role}` : "",
      character.wound ? `wound=${character.wound}` : "",
      character.personality ? `contradiction/personality=${character.personality}` : "",
      character.externalDesire ? `obsession trigger=${character.externalDesire}` : "",
      character.internalNeed ? `blind spot/need=${character.internalNeed}` : "",
      character.relationships ? `relationship pressure=${character.relationships}` : "",
      character.strictRules ? `hard rule=${character.strictRules}` : "hard rule=do not rename or emotionally reset",
    ].filter(Boolean).join("; ");
  }).join("\n");
}

function genreV12Rules(config: BookConfig): string {
  const g = genreBundle(config);
  const rules: string[] = [];

  if (/romance/.test(g)) {
    rules.push(`ROMANCE / DARK ROMANCE V12:
- Protect emotional starvation: tension -> micro reward -> distance -> craving -> new obstacle -> almost payoff -> frustration -> earned payoff.
- After intimacy or vulnerability, add cost: silence, avoidance, bad timing, jealousy, danger, misunderstanding or self-protection.
- Chemistry must precede confession. Do not give full trauma exposition early.`);
  }

  if (/thriller|crime|horror|mystery|noir/.test(g)) {
    rules.push(`SUSPENSE / THRILLER V12:
- Suspense breathes before it strikes: wait, sound, wrong detail, absence, body reaction, delayed reveal.
- End with pressure: new clue, threat, contradiction, deadline, false lead or choice.`);
  }

  if (/fantasy|sci|science|dystop|speculative/.test(g)) {
    rules.push(`FANTASY / SCI-FI V12:
- Worldbuilding must be experienced through cost, desire, danger, limitation and consequence.
- Do not pause the scene to explain the world. Make the world pressure the character.`);
  }

  return rules.join("\n\n");
}

function practicalV12Rules(family: BookFamily): string {
  if (family === "educational") {
    return `EDUCATIONAL V12:
- Explain like a patient human tutor: definition -> plain explanation -> example -> practice -> recap.
- Make difficulty progressive. Never dramatize educational content as fiction unless requested.`;
  }
  if (family === "manual") {
    return `MANUAL V12:
- Every section must make the reader more capable.
- Include steps, warnings, examples, troubleshooting and decision checkpoints.`;
  }
  if (family === "poetry") {
    return `POETRY V12:
- Protect image logic, silence, line tension and musicality.
- Concrete image over abstract explanation. No novel structure imposed on poems.`;
  }
  return `NONFICTION V12:
- Authority must sound human, concrete and useful.
- Add framework, example, exercise or decision path. Cut motivational fog.`;
}

export function buildHumanBestsellerModeV12Block(config: BookConfig, opts: V12Options = {}): string {
  const family = resolveFamily(config);
  const mode = opts.mode || "generation";
  const chapterLabel = typeof opts.chapterIndex === "number" ? `Chapter ${opts.chapterIndex + 1}` : "This section";

  if (family !== "narrative") {
    return `
HUMAN BESTSELLER MODE V12 — PRACTICAL PAGE-TURNING (${family}, ${mode}):
- The reader must feel: "this is useful, clear, and I want the next section."
- Each section needs a value loop: problem -> insight -> example -> action -> next reason to continue.
- Cut impressive sentences that do not increase clarity, trust or action.

${practicalV12Rules(family)}

${chapterLabel} FINAL CHECK:
- Did the reader gain a concrete capability or clearer understanding?
- If not, make it more specific, useful and structured.`;
  }

  return `
HUMAN BESTSELLER MODE V12 — HUMAN PAGE-TURN ENGINE (${mode}):
Mission: sound like a human bestseller author, not a good AI writer.

CHARACTER OBSESSION ENGINE:
Each main character needs wound, contradiction, obsession trigger, emotional blind spot and behavioral signature.
Canonical cast law:
${characterObsessionLines(config)}

PAGE TURN ENGINE:
- Every scene/chapter must leave a micro open loop: question, threat, attraction, secret, friction, promise, reversal or hard choice.
- A beautiful sentence is allowed only when it increases pull. If it slows reading, compress it.
- Endings should not feel fully emotionally solved unless this is an earned late-book payoff.
- The final 10% of the chapter must introduce pressure: a consequence, withheld answer, new risk, intimate distance, contradiction, clue, deadline or irreversible choice.

SCENE TURN MATRIX:
- Every scene must change at least one thing: power, desire, danger, trust, knowledge, intimacy, status, plan or moral cost.
- If the scene begins and ends with the same emotional information, transform it into action, revelation, decision or consequence.
- No decorative scene: every beat must either reveal, escalate, complicate, tempt, wound, force a choice or make the next page necessary.

VOICE FRICTION ENGINE:
- Dialogue must contain resistance. Characters should dodge, interrupt, under-answer, overreact, joke badly, contradict themselves or say the almost-right thing.
- Avoid perfect therapeutic clarity. Let characters protect themselves, misunderstand, lie by omission or change the subject.
- Make subtext audible through what is avoided, not explained.

CONCRETE SPECIFICITY ENGINE:
- Replace abstract emotion with object, body, setting pressure, gesture, silence, interruption or physical choice.
- Prefer one specific detail that carries meaning over three generic emotional sentences.
- If a paragraph explains a feeling, ground it with visible behavior before it ends.

BESTSELLER RHYTHM ENGINE:
- Balance dialogue, gesture, silence, tension, mystery, introspection and consequence.
- If introspection lasts too long, interrupt with object, body, decision or external pressure.
- If dialogue sounds perfect, break it with avoidance, misfire, contradiction or a wrong joke.
- Alternate compression and release: short pressure beats, then one breath, then a sharper turn.

CANON LOCK V2:
- Before writing, verify blueprint, character memory, active project canon, chapter continuity and protagonist truth.
- Never rename characters. Never replace Nora/Damian with Flora/Nathan or any similar drift.
- Never change setting, relationship state, trauma history, world rules or timeline for convenience.

ANTI-REPETITION V2:
- Do not repeat the same fear, confession, wound or promise in new wording.
- If the beat already appeared, turn it into a consequence, decision, obstacle, cost or changed dynamic.
- Distinguish real evolution from repetition disguised as depth.

${genreV12Rules(config)}

FINAL V12 CHECK:
- Does this scene increase emotional pull, character obsession, tension, realism or commercial momentum?
- If not, rewrite silently with more conflict, subtext, concrete behavior and an open loop.
- Return only clean manuscript prose in ${config.language}.`;
}

const V12_LEAKAGE_PATTERNS: RegExp[] = [
  /^(HUMAN BESTSELLER MODE V12|CHARACTER OBSESSION ENGINE|PAGE TURN ENGINE|SCENE TURN MATRIX|VOICE FRICTION ENGINE|CONCRETE SPECIFICITY ENGINE|BESTSELLER RHYTHM ENGINE|CANON LOCK V2|ANTI-REPETITION V2|FINAL V12 CHECK)[:\s—-].*$/gim,
  /\b(HUMAN BESTSELLER MODE V12|CHARACTER OBSESSION ENGINE|PAGE TURN ENGINE|SCENE TURN MATRIX|VOICE FRICTION ENGINE|CONCRETE SPECIFICITY ENGINE|BESTSELLER RHYTHM ENGINE|CANON LOCK V2|ANTI-REPETITION V2)\b/gi,
];

const ITALIAN_OVEREXPLAINED_TRAUMA: RegExp[] = [
  /«?\s*devo raccontarti tutto il mio trauma[^».\n]*(?:[.»])?/gi,
  /«?\s*questa è la mia ferita emotiva[^».\n]*(?:[.»])?/gi,
  /«?\s*il mio punto cieco emotivo[^».\n]*(?:[.»])?/gi,
  /«?\s*ora sono finalmente guarita[^».\n]*(?:[.»])?/gi,
  /«?\s*sto elaborando il mio dolore[^».\n]*(?:[.»])?/gi,
  /«?\s*devo imparare ad amare me stessa[^».\n]*(?:[.»])?/gi,
  /\bera come se il suo cuore (?:si spezzasse|avesse capito tutto)[^.\n]*(?:\.)?/gi,
];

const ENGLISH_OVEREXPLAINED_TRAUMA: RegExp[] = [
  /"?\s*i need to tell you all my trauma[^".\n]*(?:[."])?/gi,
  /"?\s*this is my emotional wound[^".\n]*(?:[."])?/gi,
  /"?\s*my emotional blind spot is[^".\n]*(?:[."])?/gi,
  /"?\s*i am finally healed now[^".\n]*(?:[."])?/gi,
  /"?\s*i am processing my pain[^".\n]*(?:[."])?/gi,
  /"?\s*i need to learn to love myself[^".\n]*(?:[."])?/gi,
  /\bit was as if her heart (?:broke|understood everything)[^.\n]*(?:\.)?/gi,
];

function stripV12Leakage(text: string): string {
  let next = text;
  for (const pattern of V12_LEAKAGE_PATTERNS) next = next.replace(pattern, "");
  return next;
}

function reduceOverexplainedTrauma(text: string, language: string): string {
  let next = text;
  const patterns = isItalian(language) ? ITALIAN_OVEREXPLAINED_TRAUMA : ENGLISH_OVEREXPLAINED_TRAUMA;
  for (const pattern of patterns) next = next.replace(pattern, "");
  return next;
}

function hardenFlatClosedEnding(text: string, language: string): string {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length < 3) return text;

  const last = paragraphs[paragraphs.length - 1] || "";
  const closedItalian = /\b(finalmente|per sempre|tutto era chiaro|era finita|non aveva più paura|andrà tutto bene)\b/i.test(last);
  const closedEnglish = /\b(finally|forever|everything was clear|it was over|she was no longer afraid|everything would be fine)\b/i.test(last);

  if (isItalian(language) && closedItalian) {
    paragraphs[paragraphs.length - 1] = last.replace(/\s*$/, " Ma qualcosa, nel silenzio dopo, non tornava.");
    return paragraphs.join("\n\n");
  }

  if (!isItalian(language) && closedEnglish) {
    paragraphs[paragraphs.length - 1] = last.replace(/\s*$/, " But something in the silence after it did not fit.");
    return paragraphs.join("\n\n");
  }

  return text;
}

function removeBeatEchoes(text: string, priorText = ""): string {
  const prior = lower(priorText);
  const signals = [
    "ho paura", "fidarmi", "trauma", "guarire", "un giorno alla volta",
    "i am afraid", "trust", "trauma", "heal", "one day at a time",
  ].filter((signal) => prior.includes(signal));

  if (!signals.length) return text;

  return text.split(/\n{2,}/).filter((paragraph) => {
    const normalized = lower(paragraph);
    const repeats = signals.filter((signal) => normalized.includes(signal)).length;
    if (repeats === 0) return true;
    const hasNewConsequence = /\b(decis|scelse|firm|telefon|apr|chius|lasci|entr|usc|mentì|nascos|confessò|decided|chose|signed|called|opened|closed|left|entered|lied|hid)\w*/i.test(paragraph);
    return hasNewConsequence || repeats < 2;
  }).join("\n\n");
}

function normalizeSpacing(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

export function applyHumanBestsellerModeV12Postprocess(
  text: string,
  opts: V12PostprocessOptions = {},
): string {
  if (!text?.trim()) return text || "";

  const language = opts.language || opts.config?.language || "Italian";
  const family = resolveFamily(opts.config);
  let next = stripV12Leakage(text);

  if (family === "narrative") {
    next = reduceOverexplainedTrauma(next, language);
    next = removeBeatEchoes(next, opts.priorText || "");
    next = hardenFlatClosedEnding(next, language);
    if (opts.config) {
      const previousChapters = opts.previousChapters || (opts.priorText ? [{ title: "Prior text", content: opts.priorText }] : []);
      next = applyStoryBibleLock(next, {
        config: opts.config,
        previousChapters,
        chapterIndex: opts.chapterIndex,
        outlineSummary: opts.outlineSummary,
        storyBibleLockEnabled: true,
        storyEngineV11Enabled: true,
      });
    }
  }

  return normalizeSpacing(next);
}
