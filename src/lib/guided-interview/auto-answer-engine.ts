import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { sanitizeDnaText } from "./dna-cleaner";
import { getForgeMemory } from "./interview-memory";
import { supabase } from "@/integrations/supabase/client";

export type ForgeAutoAnswerToneBias =
  | "più oscuro"
  | "più commerciale"
  | "più poetico"
  | "più diretto"
  | "più psicologico"
  | null;

export const FORGE_AUTO_ANSWER_TONE_CHIPS: Array<{ id: ForgeAutoAnswerToneBias; label: string }> = [
  { id: "più oscuro", label: "Più oscuro" },
  { id: "più commerciale", label: "Più commerciale" },
  { id: "più poetico", label: "Più poetico" },
  { id: "più diretto", label: "Più diretto" },
  { id: "più psicologico", label: "Più psicologico" },
];

export type ForgeAutoAnswerInput = {
  state: GuidedInterviewState;
  question: InterviewQuestion;
  language?: string;
  variantIndex?: number;
  toneBias?: ForgeAutoAnswerToneBias;
};

export interface ForgeSuggestedAnswer {
  id: string;
  text: string;
  strategy: "safe" | "commercial" | "bold";
}

export interface ForgeAutoAnswerResult {
  answers: ForgeSuggestedAnswer[];
  source: "ai" | "local";
}

export const FORGE_AUTO_ANSWER_STRATEGIES: ForgeSuggestedAnswer["strategy"][] = [
  "safe",
  "commercial",
  "bold",
];

export const FORGE_AUTO_ANSWER_MAX_WORDS = 50;
export const FORGE_AUTO_ANSWER_LONG_MAX_WORDS = 90;

const FORBIDDEN_ANSWER_PATTERN = /\?|potresti|forse|would you|could you|maybe\b|perhaps\b/i;

const STYLE_RULES_IT = `- Esattamente 1–3 frasi per opzione, massimo 50 parole.
- Risposta diretta, utilizzabile subito — nessun contesto inutile.
- Vietato: domande, "potresti", "forse", spiegazioni meta, commenti al lettore.`;

const STYLE_RULES_EN = `- Exactly 1–3 sentences per option, max 50 words.
- Direct answer, ready to use — no filler context.
- Forbidden: questions, "could you", "maybe", meta commentary.`;

type ForgeAutoAnswerContext = {
  state: GuidedInterviewState;
  question: InterviewQuestion;
  lang: "it" | "en";
  variantIndex: number;
  toneBias: ForgeAutoAnswerToneBias;
  genre: string;
  genreProfile: GenreProfile;
  tone: string;
  promise: string;
  setting: string;
  protagonist: string;
  antagonist: string;
  stakes: string;
  targetReader: string;
  structure: string;
  previousAnswers: string[];
};

type GenreProfile =
  | "romance"
  | "dark-romance"
  | "thriller"
  | "fantasy"
  | "self-help"
  | "business"
  | "poetry"
  | "general";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function resolveLanguageCode(language?: string, state?: GuidedInterviewState): "it" | "en" {
  const blob = [language, state?.extracted?.language, state?.selectedGenre]
    .map(clean)
    .join(" ")
    .toLowerCase();
  if (/italian|italiano|it\b/.test(blob)) return "it";
  if (/english|inglese|en\b/.test(blob)) return "en";
  return "it";
}

function resolveGenreProfile(ctx: Omit<ForgeAutoAnswerContext, "genreProfile">): GenreProfile {
  const bag = [ctx.genre, ctx.tone, ctx.promise, ctx.setting, ctx.protagonist]
    .join(" ")
    .toLowerCase();
  if (/dark romance|dark-romance/.test(bag)) return "dark-romance";
  if (/romance|slow burn|amore/.test(bag)) return "romance";
  if (/thriller|mistero|noir|giallo|horror/.test(bag)) return "thriller";
  if (/fantasy|magia|epic/.test(bag)) return "fantasy";
  if (/self-help|bloccato|metodo|trasformazione/.test(bag)) return "self-help";
  if (/business|imprend|founder|manager/.test(bag)) return "business";
  if (/poesia|poetry|verso|liric/.test(bag)) return "poetry";
  return "general";
}

function pickVariant<T>(items: T[], variantIndex: number): T {
  if (!items.length) return items[0];
  return items[variantIndex % items.length];
}

function collectPreviousAnswers(state: GuidedInterviewState): string[] {
  return state.messages
    .filter((m) => m.role === "user")
    .map((m) => clean(m.content))
    .filter((t) => t.length >= 2);
}

function buildContext(input: ForgeAutoAnswerInput): ForgeAutoAnswerContext {
  const { state, question } = input;
  const ex = state.extracted ?? {};
  const memory = getForgeMemory(state);
  const lead = state.characters?.find((c) => c.role === "protagonist");
  const villain = state.characters?.find((c) => c.role === "antagonist");
  const genre = clean(
    ex.genre ?? ex.genreDNA ?? state.inferredProfile?.genre ?? state.selectedGenre ?? memory.slotValues.genre,
  );
  const base = {
    state,
    question,
    lang: resolveLanguageCode(input.language, state),
    variantIndex: Math.max(0, input.variantIndex ?? 0),
    toneBias: input.toneBias ?? null,
    genre,
    tone: clean(ex.emotionalTone ?? state.inferredProfile?.tone ?? memory.slotValues.tone),
    promise: clean(ex.promise ?? state.dnaLock?.promiseLock ?? memory.slotValues.promise),
    setting: clean(ex.setting ?? memory.slotValues.setting),
    protagonist: clean(lead?.name ?? ex.protagonistWound ?? memory.slotValues.protagonist),
    antagonist: clean(villain?.name ?? ex.centralConflict),
    stakes: clean(ex.readerTransformation ?? ex.centralConflict ?? memory.slotValues.stakes),
    targetReader: clean(ex.targetReader ?? state.dnaLock?.targetReader ?? memory.slotValues.audience),
    structure: clean(
      ex.structurePreference ?? ex.chapterCount ?? ex.subchaptersPreference ?? memory.slotValues.structure,
    ),
    previousAnswers: collectPreviousAnswers(state),
  };
  return { ...base, genreProfile: resolveGenreProfile(base) };
}

export function questionAllowsLongAutoAnswer(question: InterviewQuestion): boolean {
  const blob = `${question.question} ${question.helper ?? ""} ${question.placeholder ?? ""}`.toLowerCase();
  return /lungo|long|dettagliat|approfond|racconta tutto|liberamente|elenca|più possibile|in dettaglio|descrivi a fondo|explain in detail|write at length/.test(
    blob,
  );
}

export function countAutoAnswerWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function answerContainsForbiddenPhrasing(text: string): boolean {
  return FORBIDDEN_ANSWER_PATTERN.test(text);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function sentenceSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  if (!wa.size || !wb.size) return 0;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.max(wa.size, wb.size);
}

function dedupeSentences(sentences: string[]): string[] {
  const out: string[] = [];
  for (const sentence of sentences) {
    const duplicate = out.some((prev) => sentenceSimilarity(prev, sentence) > 0.55);
    if (!duplicate) out.push(sentence);
  }
  return out;
}

function trimRedundantClosing(sentences: string[]): string[] {
  if (sentences.length < 2) return sentences;
  const first = sentences[0];
  const last = sentences[sentences.length - 1];
  const summaryLead = /^(in sintesi|in conclusione|insomma|quindi|per riassumere|in short|to sum up|overall|in summary)/i;
  if (summaryLead.test(last) || sentenceSimilarity(first, last) > 0.42) {
    return sentences.slice(0, -1);
  }
  return sentences;
}

function clampWordCount(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  const truncated = words.slice(0, maxWords).join(" ");
  const cut = truncated.lastIndexOf(".");
  if (cut > truncated.length * 0.45) return truncated.slice(0, cut + 1).trim();
  return `${truncated.trim()}…`;
}

export function compactAutoAnswer(text: string, input: ForgeAutoAnswerInput): string {
  const allowLong = questionAllowsLongAutoAnswer(input.question);
  const maxWords = allowLong ? FORGE_AUTO_ANSWER_LONG_MAX_WORDS : FORGE_AUTO_ANSWER_MAX_WORDS;
  const maxSentences = allowLong ? 5 : 3;

  let sentences = dedupeSentences(splitSentences(text));
  sentences = trimRedundantClosing(sentences);
  if (sentences.length > maxSentences) {
    sentences = sentences.slice(0, maxSentences);
  }

  return clampWordCount(sentences.join(" "), maxWords);
}

export function polishAnswerText(raw: string): string {
  return raw
    .replace(/\?/g, ".")
    .replace(/\b(potresti|forse|magari|eventualmente)\b/gi, "")
    .replace(/\b(maybe|perhaps|could you|would you)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function sanitizeAutoAnswer(raw: string, input: ForgeAutoAnswerInput): string {
  let text = polishAnswerText(
    clean(raw)
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/^(risposta|answer|suggerimento)\s*:\s*/i, "")
      .trim(),
  );
  return compactAutoAnswer(text, input);
}

export function buildForgeAutoAnswerPrompt(input: ForgeAutoAnswerInput): string {
  const ctx = buildContext(input);
  const prev = ctx.previousAnswers.slice(-6).join("\n- ");
  const bias = ctx.toneBias ? `\nTone bias: ${ctx.toneBias}` : "";
  const jsonShape = `{
  "answers":[
    { "strategy":"safe", "text":"..." },
    { "strategy":"commercial", "text":"..." },
    { "strategy":"bold", "text":"..." }
  ]
}`;

  if (ctx.lang === "it") {
    return `Sei un editor senior di Scriptora Book Forge.

DOMANDA CORRENTE (rispondi SOLO a questa):
${ctx.question.question}

KEY: ${ctx.question.key}
CONTESTO:
- Genere: ${ctx.genre || "da definire"} (${ctx.genreProfile})
- Tono: ${ctx.tone || "da definire"}
- Promessa: ${ctx.promise || "—"}
- Ambientazione: ${ctx.setting || "—"}
- Protagonista: ${ctx.protagonist || "—"}
- Forza opposta: ${ctx.antagonist || "—"}
- Posta in gioco: ${ctx.stakes || "—"}
- Lettore: ${ctx.targetReader || "—"}
- Struttura: ${ctx.structure || "—"}

RISPOSTE GIÀ CONFERMATE (non ripetere, non contraddire):
${prev ? `- ${prev}` : "—"}

REGOLE FERREE:
- NON fare domande.
- NON spiegare, NON commentare, NON analizzare.
- Rispondi SOLO alla domanda corrente.
- Genera ESATTAMENTE 3 opzioni distinte.
- safe = direzione chiara e accessibile.
- commercial = angolo mercato, hook, retention.
- bold = scelta autoriale più rischiosa e memorabile.
- Variante batch #${ctx.variantIndex + 1}: angolazioni fresche.${bias}

STILE (per ogni text):
${STYLE_RULES_IT}

Output SOLO JSON valido, senza markdown:
${jsonShape}`;
  }

  return `You are a senior Scriptora Book Forge editor.

CURRENT QUESTION (answer ONLY this):
${ctx.question.question}

KEY: ${ctx.question.key}
CONTEXT:
- Genre: ${ctx.genre || "TBD"} (${ctx.genreProfile})
- Tone: ${ctx.tone || "TBD"}
- Promise: ${ctx.promise || "—"}
- Setting: ${ctx.setting || "—"}
- Protagonist: ${ctx.protagonist || "—"}
- Opposing force: ${ctx.antagonist || "—"}
- Stakes: ${ctx.stakes || "—"}
- Reader: ${ctx.targetReader || "—"}
- Structure: ${ctx.structure || "—"}

CONFIRMED ANSWERS (do not repeat or contradict):
${prev ? `- ${prev}` : "—"}

MANDATORY RULES:
- NO questions.
- NO explaining, commenting, or analyzing.
- Answer ONLY the current question.
- Generate EXACTLY 3 distinct options.
- safe = clear, accessible direction.
- commercial = market angle, hook, retention.
- bold = riskier, memorable authorial choice.
- Batch variant #${ctx.variantIndex + 1}: fresh angles.${bias}

STYLE (each text):
${STYLE_RULES_EN}

Return ONLY valid JSON, no markdown:
${jsonShape}`;
}

type StrategyBuilder = (ctx: ForgeAutoAnswerContext) => string;

const GENRE_STRATEGY: Record<GenreProfile, Record<ForgeSuggestedAnswer["strategy"], StrategyBuilder>> = {
  romance: {
    safe: (ctx) =>
      ctx.lang === "it"
        ? `Romance emotivo con slow burn controllato: ${ctx.protagonist || "due protagonisti"} si avvicinano per ferite complementari, payoff catartico nel finale.`
        : `Emotional romance with controlled slow burn: ${ctx.protagonist || "two leads"} drawn together by complementary wounds, cathartic payoff at the end.`,
    commercial: (ctx) =>
      ctx.lang === "it"
        ? `Romance ad alta retention: tensione romantica ogni capitolo, sottotesto forte, finale che lascia desiderio di rileggere la scena chiave.`
        : `High-retention romance: romantic tension every chapter, strong subtext, ending that makes readers replay the key scene.`,
    bold: (ctx) =>
      ctx.lang === "it"
        ? `Romance proibito e vulnerabile: desiderio che costa reputazione o sicurezza, scelta finale senza redenzione facile.`
        : `Forbidden, vulnerable romance: desire that costs reputation or safety, final choice without easy redemption.`,
  },
  "dark-romance": {
    safe: (ctx) =>
      ctx.lang === "it"
        ? `Dark romance psicologica: attrazione magnetica tra ${ctx.protagonist || "protagonista"} e pericolo controllato, confini chiari, conseguenze reali.`
        : `Psychological dark romance: magnetic pull between ${ctx.protagonist || "the lead"} and controlled danger, clear boundaries, real consequences.`,
    commercial: (ctx) =>
      ctx.lang === "it"
        ? `Posizionamento BookTok: ossessione, tabù morali, capitoli brevi con cliffhanger emotivi, promessa di resa devastante.`
        : `BookTok positioning: obsession, moral taboo, short chapters with emotional cliffhangers, promise of devastating surrender.`,
    bold: (ctx) =>
      ctx.lang === "it"
        ? `Dark romance estrema: il desiderio distrugge l'identità del protagonista prima di ricostruirla, tono crudo senza moralizzare.`
        : `Extreme dark romance: desire dismantles the lead's identity before rebuilding it, raw tone without moralizing.`,
  },
  thriller: {
    safe: (ctx) =>
      ctx.lang === "it"
        ? `Thriller psicologico: verità sepolta, pressione crescente, ${ctx.protagonist || "protagonista"} insegue risposte con costo crescente.`
        : `Psychological thriller: buried truth, rising pressure, ${ctx.protagonist || "the lead"} chasing answers at escalating cost.`,
    commercial: (ctx) =>
      ctx.lang === "it"
        ? `Thriller page-turner: hook nei primi 10%, rivelazioni a scaglioni, finale che ribalta la promessa iniziale.`
        : `Page-turner thriller: hook in the first 10%, layered reveals, ending that flips the opening promise.`,
    bold: (ctx) =>
      ctx.lang === "it"
        ? `Thriller disturbante: il narratore o il sistema sono inaffidabili, la verità ferisce più del colpevole.`
        : `Unsettling thriller: narrator or system is unreliable, truth hurts more than the culprit.`,
  },
  fantasy: {
    safe: (ctx) =>
      ctx.lang === "it"
        ? `Fantasy coerente: mondo con regole chiare, ${ctx.protagonist || "eroe"} con missione e costo del potere definito.`
        : `Coherent fantasy: world with clear rules, ${ctx.protagonist || "hero"} with a mission and defined cost of power.`,
    commercial: (ctx) =>
      ctx.lang === "it"
        ? `Fantasy commerciale: worldbuilding in azione, alleanze e tradimenti, arco a tre atti con payoff epico.`
        : `Commercial fantasy: worldbuilding through action, alliances and betrayals, three-act arc with epic payoff.`,
    bold: (ctx) =>
      ctx.lang === "it"
        ? `Fantasy coraggiosa: magia che contamina il quotidiano, mitologia personale, finale che rompe il trope dell'eroe.`
        : `Bold fantasy: magic infects the everyday, personal mythology, ending that breaks the hero trope.`,
  },
  "self-help": {
    safe: (ctx) =>
      ctx.lang === "it"
        ? `Self-help concreto: problema ${ctx.stakes || "reale"}, metodo in step, risultato misurabile entro 30 giorni.`
        : `Concrete self-help: ${ctx.stakes || "real"} problem, step method, measurable result within 30 days.`,
    commercial: (ctx) =>
      ctx.lang === "it"
        ? `Self-help bestseller: promessa chiara in copertina, esercizi rapidi, storie brevi, CTA finale memorabile.`
        : `Bestseller self-help: clear cover promise, quick exercises, short stories, memorable closing CTA.`,
    bold: (ctx) =>
      ctx.lang === "it"
        ? `Self-help senza fuffa: tono diretto, verità scomode, framework che obbliga a scegliere, niente motivazione vuota.`
        : `No-fluff self-help: direct tone, uncomfortable truths, framework that forces a choice, no empty motivation.`,
  },
  business: {
    safe: (ctx) =>
      ctx.lang === "it"
        ? `Business pratico: framework applicabile, casi reali, outcome per ${ctx.targetReader || "professionisti"} in 90 giorni.`
        : `Practical business: applicable framework, real cases, outcomes for ${ctx.targetReader || "professionals"} in 90 days.`,
    commercial: (ctx) =>
      ctx.lang === "it"
        ? `Business commerciale: posizionamento nicchia, titolo con beneficio, capitoli con checklist e metriche.`
        : `Commercial business: niche positioning, benefit-driven title, chapters with checklists and metrics.`,
    bold: (ctx) =>
      ctx.lang === "it"
        ? `Business provocatorio: tesi controcorrente sul mercato, tono assertivo, scelta netta su chi è il lettore ideale.`
        : `Provocative business: contrarian market thesis, assertive tone, sharp choice of ideal reader.`,
  },
  poetry: {
    safe: (ctx) =>
      ctx.lang === "it"
        ? `Raccolta poetica coerente: tema ${ctx.stakes || "emotivo"} dominante, voce intima, ritmo leggibile.`
        : `Coherent poetry collection: dominant ${ctx.stakes || "emotional"} theme, intimate voice, readable rhythm.`,
    commercial: (ctx) =>
      ctx.lang === "it"
        ? `Poesia commerciale: sezioni tematiche forti, copertina evocativa, versi brevi ad alta condivisibilità.`
        : `Commercial poetry: strong thematic sections, evocative cover, short highly shareable verses.`,
    bold: (ctx) =>
      ctx.lang === "it"
        ? `Poesia audace: frammenti crudi, simboli ricorrenti, silenzi che tagliano, niente lirismo decorativo.`
        : `Bold poetry: raw fragments, recurring symbols, cutting silences, no decorative lyricism.`,
  },
  general: {
    safe: (ctx) =>
      ctx.lang === "it"
        ? `Direzione chiara su ${ctx.promise || ctx.genre || "il cuore del libro"}: tono ${ctx.tone || "definito"}, struttura leggibile.`
        : `Clear direction on ${ctx.promise || ctx.genre || "the book's core"}: ${ctx.tone || "defined"} tone, readable structure.`,
    commercial: (ctx) =>
      ctx.lang === "it"
        ? `Angolo commerciale: promessa ${ctx.stakes || "forte"}, hook iniziale, target ${ctx.targetReader || "preciso"}.`
        : `Commercial angle: ${ctx.stakes || "strong"} promise, opening hook, precise ${ctx.targetReader || "target"}.`,
    bold: (ctx) =>
      ctx.lang === "it"
        ? `Scelta autoriale rischiosa: voce distintiva, immagine centrale memorabile, finale che divide ma resta.`
        : `Risky authorial choice: distinctive voice, memorable central image, divisive but lasting ending.`,
  },
};

function buildStrategyAnswer(
  strategy: ForgeSuggestedAnswer["strategy"],
  input: ForgeAutoAnswerInput,
): string {
  const ctx = buildContext(input);
  const builder = GENRE_STRATEGY[ctx.genreProfile][strategy];
  const variantShift =
    ctx.variantIndex > 0
      ? pickVariant(
          ctx.lang === "it"
            ? ["Angolo alternativo:", "Nuova variante:", "Rotazione editoriale:"]
            : ["Alternative angle:", "New variant:", "Editorial rotation:"],
          ctx.variantIndex,
        )
      : "";
  const core = builder(ctx);
  return variantShift ? `${variantShift} ${core}` : core;
}

function toSuggestedAnswer(
  strategy: ForgeSuggestedAnswer["strategy"],
  text: string,
  input: ForgeAutoAnswerInput,
  index: number,
): ForgeSuggestedAnswer {
  return {
    id: `${strategy}-${input.variantIndex ?? 0}-${index}`,
    strategy,
    text: sanitizeAutoAnswer(text, input),
  };
}

export function generateThreeForgeAnswers(input: ForgeAutoAnswerInput): ForgeSuggestedAnswer[] {
  return FORGE_AUTO_ANSWER_STRATEGIES.map((strategy, index) =>
    toSuggestedAnswer(strategy, buildStrategyAnswer(strategy, input), input, index),
  );
}

/** @deprecated Use generateThreeForgeAnswers — returns safe option text only. */
export function generateLocalForgeAutoAnswer(input: ForgeAutoAnswerInput): string {
  return generateThreeForgeAnswers(input).find((a) => a.strategy === "safe")?.text ?? "";
}

function parseAiAnswerPayload(
  message: string,
  input: ForgeAutoAnswerInput,
): ForgeSuggestedAnswer[] | null {
  try {
    const cleaned = message.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      answers?: Array<{ strategy?: string; text?: string }>;
    };
    if (!Array.isArray(parsed.answers) || parsed.answers.length === 0) return null;

    const byStrategy = new Map<ForgeSuggestedAnswer["strategy"], string>();
    for (const row of parsed.answers) {
      const strategy = row.strategy as ForgeSuggestedAnswer["strategy"];
      const text = clean(row.text);
      if (!text || !FORGE_AUTO_ANSWER_STRATEGIES.includes(strategy)) continue;
      if (answerContainsForbiddenPhrasing(text)) continue;
      byStrategy.set(strategy, text);
    }

    const answers = FORGE_AUTO_ANSWER_STRATEGIES.map((strategy, index) => {
      const text = byStrategy.get(strategy) ?? buildStrategyAnswer(strategy, input);
      return toSuggestedAnswer(strategy, text, input, index);
    });

    return answers.length === 3 ? answers : null;
  } catch {
    return null;
  }
}

export async function generateForgeAutoAnswer(
  input: ForgeAutoAnswerInput,
): Promise<ForgeAutoAnswerResult> {
  const local = generateThreeForgeAnswers(input);

  try {
    const ctx = buildContext(input);
    const langLabel = ctx.lang === "it" ? "Italian" : "English";
    const { data, error } = await supabase.functions.invoke("live-coach", {
      body: {
        mode: "chat",
        language: langLabel,
        genre: ctx.genre || "general",
        tone: ctx.tone || "editorial",
        question: buildForgeAutoAnswerPrompt(input),
      },
    });

    if (error || data?.error || data?.fallback) {
      return { answers: local, source: "local" };
    }

    const parsed = parseAiAnswerPayload(String(data?.message ?? ""), input);
    if (parsed?.length === 3) {
      return { answers: parsed, source: "ai" };
    }
  } catch {
    /* local fallback */
  }

  return { answers: local, source: "local" };
}
