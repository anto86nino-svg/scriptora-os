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

export type ForgeAutoAnswerResult = {
  answer: string;
  source: "ai" | "local";
};

type ForgeAutoAnswerContext = {
  state: GuidedInterviewState;
  question: InterviewQuestion;
  lang: "it" | "en";
  variantIndex: number;
  toneBias: ForgeAutoAnswerToneBias;
  genre: string;
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

  return {
    state,
    question,
    lang: resolveLanguageCode(input.language, state),
    variantIndex: Math.max(0, input.variantIndex ?? 0),
    toneBias: input.toneBias ?? null,
    genre: clean(
      ex.genre ?? ex.genreDNA ?? state.inferredProfile?.genre ?? state.selectedGenre ?? memory.slotValues.genre,
    ),
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
}

function applyToneBias(text: string, ctx: ForgeAutoAnswerContext): string {
  if (!ctx.toneBias) return text;
  const it: Record<NonNullable<ForgeAutoAnswerToneBias>, string> = {
    "più oscuro": "Tono più oscuro e inquietante, senza moralizzare.",
    "più commerciale": "Risposta più commerciale, leggibile e orientata al lettore.",
    "più poetico": "Linguaggio più poetico, sensoriale e evocativo.",
    "più diretto": "Risposta più diretta, concreta e senza giri di parole.",
    "più psicologico": "Focus più psicologico, sulle ferite e sulle scelte interiori.",
  };
  const en: Record<NonNullable<ForgeAutoAnswerToneBias>, string> = {
    "più oscuro": "Darker, more unsettling tone without moralizing.",
    "più commerciale": "More commercial, reader-facing and market-clear.",
    "più poetico": "More poetic, sensory and evocative language.",
    "più diretto": "More direct, concrete and plain-spoken.",
    "più psicologico": "More psychological focus on wounds and inner choices.",
  };
  const hint = ctx.lang === "it" ? it[ctx.toneBias] : en[ctx.toneBias];
  return `${text} ${hint}`.trim();
}

export function sanitizeAutoAnswer(raw: string, input: ForgeAutoAnswerInput): string {
  const ctx = buildContext(input);
  let text = clean(raw)
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(risposta|answer|suggerimento)\s*:\s*/i, "")
    .trim();

  if (text.length > 900) {
    const cut = text.lastIndexOf(".", 880);
    text = cut > 200 ? text.slice(0, cut + 1) : text.slice(0, 880).trim();
  }

  const prev = new Set(ctx.previousAnswers.map((a) => a.toLowerCase()));
  if (prev.has(text.toLowerCase()) && ctx.variantIndex > 0) {
    return generateLocalForgeAutoAnswer({ ...input, variantIndex: ctx.variantIndex + 1 });
  }

  return applyToneBias(text, ctx);
}

export function buildForgeAutoAnswerPrompt(input: ForgeAutoAnswerInput): string {
  const ctx = buildContext(input);
  const prev = ctx.previousAnswers.slice(-6).join("\n- ");
  const bias = ctx.toneBias ? `\nTone bias: ${ctx.toneBias}` : "";

  if (ctx.lang === "it") {
    return `Sei un editor senior di Scriptora Book Forge. Scrivi UNA sola risposta forte alla domanda corrente dell'intervista.

DOMANDA CORRENTE (rispondi solo a questa, non andare avanti):
${ctx.question.question}

KEY: ${ctx.question.key}
CONTESTO LIBRO:
- Genere: ${ctx.genre || "da definire"}
- Tono: ${ctx.tone || "da definire"}
- Promessa: ${ctx.promise || "—"}
- Ambientazione: ${ctx.setting || "—"}
- Protagonista: ${ctx.protagonist || "—"}
- Antagonista/forza opposta: ${ctx.antagonist || "—"}
- Posta in gioco: ${ctx.stakes || "—"}
- Lettore ideale: ${ctx.targetReader || "—"}
- Struttura: ${ctx.structure || "—"}

RISPOSTE GIÀ CONFERMATE (non ripetere, non contraddire):
${prev ? `- ${prev}` : "—"}

REGOLE:
- Rispondi nella lingua del libro (italiano).
- Una risposta editoriale vivida, decisiva, 2-5 frasi.
- Non inventare un blueprint completo.
- Non fare domande al lettore.
- Se la domanda chiede una scelta, scegli una direzione chiara.
- Variante #${ctx.variantIndex + 1}: offri un'angolazione diversa dalle risposte precedenti.${bias}

Restituisci SOLO il testo della risposta, senza prefissi.`;
  }

  return `You are a senior Scriptora Book Forge editor. Write ONE strong editorial answer to the current interview question.

CURRENT QUESTION (answer only this — do not jump ahead):
${ctx.question.question}

KEY: ${ctx.question.key}
BOOK CONTEXT:
- Genre: ${ctx.genre || "TBD"}
- Tone: ${ctx.tone || "TBD"}
- Promise: ${ctx.promise || "—"}
- Setting: ${ctx.setting || "—"}
- Protagonist: ${ctx.protagonist || "—"}
- Opposing force: ${ctx.antagonist || "—"}
- Stakes: ${ctx.stakes || "—"}
- Target reader: ${ctx.targetReader || "—"}
- Structure: ${ctx.structure || "—"}

CONFIRMED ANSWERS (do not repeat or contradict):
${prev ? `- ${prev}` : "—"}

RULES:
- Answer in the book language (English).
- Vivid, decisive editorial answer, 2-5 sentences.
- Do not invent a full blueprint.
- Do not ask the user questions.
- If the question asks for a choice, pick a clear direction.
- Variant #${ctx.variantIndex + 1}: a fresh angle from prior answers.${bias}

Return ONLY the answer text, no prefixes.`;
}

type TemplateFn = (ctx: ForgeAutoAnswerContext) => string;

const TEMPLATES_BY_KEY: Record<string, TemplateFn[]> = {
  openingSpark: [
    (ctx) =>
      ctx.lang === "it"
        ? `Parto da un'immagine che non mi lascia: ${ctx.protagonist || "un protagonista ferito"} in ${ctx.setting || "un luogo che respira tensione"}, con la sensazione che qualcosa di irreversibile stia per rompersi.`
        : `I start from an image that won't let go: ${ctx.protagonist || "a wounded lead"} in ${ctx.setting || "a place thick with tension"}, with the sense that something irreversible is about to break.`,
  ],
  promise: [
    (ctx) =>
      ctx.lang === "it"
        ? `La promessa del libro è questa: il lettore deve uscire con ${ctx.stakes || "una verità che costa"} — non consolazione facile, ma ${ctx.tone || "un'emozione che resta addosso"}.`
        : `The book's promise: the reader leaves with ${ctx.stakes || "a costly truth"} — not easy comfort, but ${ctx.tone || "an emotion that lingers"}.`,
    (ctx) =>
      ctx.lang === "it"
        ? `Non tradiremo questa promessa: ogni capitolo deve avvicinare il lettore a ${ctx.genre || "il cuore del genere"} senza spiegazioni premature.`
        : `We won't betray this promise: every chapter must pull the reader toward ${ctx.genre || "the genre's core"} without premature explanation.`,
  ],
  setting: [
    (ctx) =>
      ctx.lang === "it"
        ? `L'ambientazione deve respirare ${ctx.tone || "tensione"}: luoghi concreti, dettagli sensoriali, e la sensazione che ${ctx.stakes || "il passato"} non sia mai davvero chiuso.`
        : `The setting should breathe ${ctx.tone || "tension"}: concrete places, sensory detail, and the feeling that ${ctx.stakes || "the past"} was never truly closed.`,
  ],
  protagonistWound: [
    (ctx) =>
      ctx.lang === "it"
        ? `${ctx.protagonist || "Il protagonista"} porta una ferita precisa: crede di ${pickVariant(["dover controllare tutto", "non meritare ciò che desidera", "poter salvare tutti"], ctx.variantIndex)}, e questa convinzione lo guida verso scelte pericolose.`
        : `${ctx.protagonist || "The protagonist"} carries a precise wound: they believe ${pickVariant(["they must control everything", "they don't deserve what they want", "they can save everyone"], ctx.variantIndex)}, and that belief drives dangerous choices.`,
  ],
  centralConflict: [
    (ctx) =>
      ctx.lang === "it"
        ? `Il conflitto centrale nasce quando ${ctx.protagonist || "il protagonista"} deve scegliere tra ciò che vuole e ciò che teme — mentre ${ctx.antagonist || "una forza opposta"} alza la posta.`
        : `The central conflict ignites when ${ctx.protagonist || "the lead"} must choose between what they want and what they fear — while ${ctx.antagonist || "an opposing force"} raises the stakes.`,
  ],
  emotionalTone: [
    (ctx) =>
      ctx.lang === "it"
        ? `Il tono dominante è ${ctx.tone || pickVariant(["cinematico e viscerale", "intimo e psicologico", "elegante e inquietante"], ctx.variantIndex)}: ogni scena deve lasciare un'emozione netta, mai vaga.`
        : `The dominant tone is ${ctx.tone || pickVariant(["cinematic and visceral", "intimate and psychological", "elegant and unsettling"], ctx.variantIndex)}: every scene should leave a sharp emotion, never vague.`,
  ],
  targetReader: [
    (ctx) =>
      ctx.lang === "it"
        ? `Parlo a ${ctx.targetReader || "lettori affamati di storie vere"}: persone che vogliono ${ctx.promise || "sentirsi trasformate"}, non solo intrattenute.`
        : `I'm speaking to ${ctx.targetReader || "readers hungry for real stories"}: people who want ${ctx.promise || "to feel transformed"}, not merely entertained.`,
  ],
  readerTransformation: [
    (ctx) =>
      ctx.lang === "it"
        ? `Alla fine il lettore deve sentire ${ctx.stakes || "che qualcosa è cambiato davvero"} — non una lezione, ma un'emozione che non può più ignorare.`
        : `By the end the reader should feel ${ctx.stakes || "that something truly changed"} — not a lesson, but an emotion they can no longer ignore.`,
  ],
  genre: [
    (ctx) =>
      ctx.lang === "it"
        ? `La direzione più forte ora è ${ctx.genre || "romanzi ad alta tensione emotiva"}: commerciale ma autoriale, con identità chiara fin dalla prima pagina.`
        : `The strongest direction now is ${ctx.genre || "emotionally high-tension fiction"}: commercial yet authorial, with a clear identity from page one.`,
  ],
  genreDNA: [
    (ctx) =>
      ctx.lang === "it"
        ? `Il DNA narrativo punta su ${ctx.genre || "tensione e trasformazione"} con ritmo ${pickVariant(["sostenuto", "progressivo", "a ondate"], ctx.variantIndex)} e payoff emotivo meritato.`
        : `The narrative DNA leans on ${ctx.genre || "tension and transformation"} with a ${pickVariant(["sustained", "progressive", "wave-like"], ctx.variantIndex)} rhythm and earned emotional payoff.`,
  ],
  language: [
    (ctx) =>
      ctx.lang === "it"
        ? "Italiano — voce calda, contemporanea, pronta per mercato editoriale e KDP."
        : "English — warm, contemporary voice, ready for trade and self-publishing markets.",
  ],
  authorName: [
    (ctx) =>
      ctx.lang === "it"
        ? `Pubblico con un'identità autore coerente al genere ${ctx.genre || "del libro"}: autorevole ma vicina, mai distante dal lettore.`
        : `I'll publish under an author identity aligned with ${ctx.genre || "the book's genre"}: authoritative yet close, never distant from the reader.`,
  ],
  bookTitle: [
    (ctx) =>
      ctx.lang === "it"
        ? `Titolo provvisorio forte: qualcosa che promette ${ctx.promise || "trasformazione"} in due parole memorabili — poi lo affiniamo insieme.`
        : `Strong working title: something that promises ${ctx.promise || "transformation"} in two memorable words — we'll refine it together.`,
  ],
  chapterCount: [
    (ctx) =>
      ctx.lang === "it"
        ? `${pickVariant(["12 capitoli", "18 capitoli", "14 capitoli"], ctx.variantIndex)} — abbastanza respiro per ${ctx.genre || "la storia"}, senza cuscinetti inutili.`
        : `${pickVariant(["12 chapters", "18 chapters", "14 chapters"], ctx.variantIndex)} — enough room for ${ctx.genre || "the story"} without filler.`,
  ],
  structurePreference: [
    (ctx) =>
      ctx.lang === "it"
        ? "Capitoli autonomi ma concatenati: ogni fine capitolo apre una domanda che costringe a continuare."
        : "Self-contained yet chained chapters: each ending opens a question that forces the reader onward.",
  ],
  frontMatter: [
    (ctx) =>
      ctx.lang === "it"
        ? "Front matter essenziale: dedica breve, nota d'autore che prepara il tono, niente prefazioni lunghe che frenano l'ingresso nella storia."
        : "Essential front matter: a short dedication, an author note that sets tone — no long prefaces that slow entry into the story.",
  ],
  commercialGoal: [
    (ctx) =>
      ctx.lang === "it"
        ? `Obiettivo commerciale: ${ctx.genre || "posizionamento chiaro"} su Amazon, hook forte nei primi capitoli, titolo e promessa allineati al lettore ${ctx.targetReader || "ideale"}.`
        : `Commercial goal: clear ${ctx.genre || "positioning"} on Amazon, strong early hook, title and promise aligned with the ${ctx.targetReader || "ideal"} reader.`,
  ],
};

function templateForKey(ctx: ForgeAutoAnswerContext): string {
  const fns = TEMPLATES_BY_KEY[ctx.question.key];
  if (fns?.length) {
    return applyToneBias(pickVariant(fns, ctx.variantIndex)(ctx), ctx);
  }

  const fallbackIt = `Per questa domanda la direzione più forte è costruire su ${ctx.promise || ctx.genre || "ciò che abbiamo già detto"}: risposta concreta, editoriale, senza anticipare il resto del blueprint.`;
  const fallbackEn = `For this question the strongest move is to build on ${ctx.promise || ctx.genre || "what we've already established"}: concrete, editorial, without jumping ahead in the blueprint.`;
  return applyToneBias(ctx.lang === "it" ? fallbackIt : fallbackEn, ctx);
}

export function generateLocalForgeAutoAnswer(input: ForgeAutoAnswerInput): string {
  const ctx = buildContext(input);
  const local = templateForKey(ctx);
  return sanitizeAutoAnswer(local, input);
}

export async function generateForgeAutoAnswer(
  input: ForgeAutoAnswerInput,
): Promise<ForgeAutoAnswerResult> {
  const local = generateLocalForgeAutoAnswer(input);

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
      return { answer: local, source: "local" };
    }

    const aiText = sanitizeAutoAnswer(String(data?.message ?? ""), input);
    if (aiText.length >= 24) {
      return { answer: aiText, source: "ai" };
    }
  } catch {
    /* local fallback */
  }

  return { answer: local, source: "local" };
}
