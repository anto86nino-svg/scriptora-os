import type { ExtractedBookIntent, InterviewGenre } from "./types";
import { sanitizeDnaText } from "./dna-cleaner";
import { humanizeMissingField } from "./interview-ui-copy";

export type InferredBookProfile = {
  bookType?: string;
  genre?: InterviewGenre;
  subgenre?: string;
  tone?: string;
  targetReader?: string;
  promise?: string;
  pacing?: string;
  atmosphere?: string;
  structureHint?: string;
  positioning?: string;
  antiDriftHint?: string;
  confidence: number;
};

type GenreSignal = {
  genre: InterviewGenre;
  bookType: string;
  subgenre?: string;
  keywords: RegExp;
  weight: number;
};

const GENRE_SIGNALS: GenreSignal[] = [
  { genre: "romance", bookType: "Romanzo", subgenre: "Romance", keywords: /\b(romance|amore|relazione|cuore|passione|slow burn|enemies to lovers)\b/i, weight: 1 },
  { genre: "dark-romance", bookType: "Romanzo", subgenre: "Dark Romance", keywords: /\b(dark romance|ossessione|proibito|mora|possessiv)\b/i, weight: 1.1 },
  { genre: "thriller", bookType: "Thriller", subgenre: "Suspense", keywords: /\b(thriller|omicidio|mistero|suspense|assassino|indagine|psicologico)\b/i, weight: 1 },
  { genre: "fantasy", bookType: "Fantasy", subgenre: "Epic Fantasy", keywords: /\b(fantasy|magia|regno|elfi|draghi|epico|mondo immaginario)\b/i, weight: 1 },
  { genre: "poetry", bookType: "Poesia", subgenre: "Raccolta poetica", keywords: /\b(poesia|poetico|versi|raccolta poetica|lirica|sonetto)\b/i, weight: 1.2 },
  { genre: "self-help", bookType: "Saggio", subgenre: "Self-help", keywords: /\b(self[- ]?help|crescita|abitudini|benessere|motivaz|trasformazione personale|mindset)\b/i, weight: 1 },
  { genre: "business", bookType: "Saggio", subgenre: "Business", keywords: /\b(business|imprenditor|startup|vendite|leadership|produttivit|carriera)\b/i, weight: 1 },
  { genre: "manual", bookType: "Manuale", subgenre: "Guida pratica", keywords: /\b(manuale|guida pratica|tutorial|how[- ]?to|passo per passo|istruzioni)\b/i, weight: 1 },
  { genre: "literary-fiction", bookType: "Romanzo", subgenre: "Narrativa letteraria", keywords: /\b(romanzo|narrativa|storia|memoria|identit|famiglia|biograf)\b/i, weight: 0.7 },
];

const PACING_SIGNALS: { label: string; pattern: RegExp }[] = [
  { label: "Slow burn — tensione che cresce lentamente", pattern: /\b(slow burn|lento|gradual|silenzi|intimo)\b/i },
  { label: "Payoff rapido — ritmo sostenuto e payoff frequenti", pattern: /\b(rapido|veloce|adrenalina|page turner|incalzante)\b/i },
  { label: "Psicologico — tensione interiore e sospeso", pattern: /\b(psicologico|interiore|inquietante|parano)\b/i },
  { label: "Trasformazione dura — confronto diretto col lettore", pattern: /\b(diretto|duro|sfida|senza filtri|schiaffo)\b/i },
  { label: "Guida morbida — tono accogliente e progressivo", pattern: /\b(morbido|accogliente|gentile|compassionevole|guida)\b/i },
];

function scoreGenre(text: string): { signal: GenreSignal; score: number } | null {
  let best: { signal: GenreSignal; score: number } | null = null;
  for (const signal of GENRE_SIGNALS) {
    const matches = text.match(signal.keywords);
    if (!matches) continue;
    const score = matches.length * signal.weight;
    if (!best || score > best.score) best = { signal, score };
  }
  return best;
}

function inferTone(text: string): string | undefined {
  const tones = [
    { label: "Caldo e umano", pattern: /\b(caldo|umano|intimo|empat|compassionevole)\b/i },
    { label: "Teso e inquietante", pattern: /\b(teso|inquiet|dark|oscuro|angosc)\b/i },
    { label: "Diretto e pratico", pattern: /\b(diretto|pratico|concreto|operativo)\b/i },
    { label: "Lirico e sensoriale", pattern: /\b(lirico|poetico|sensoriale|evocativ)\b/i },
    { label: "Ispirazionale", pattern: /\b(ispiraz|motivaz|speranz|rinascita)\b/i },
  ];
  for (const t of tones) {
    if (t.pattern.test(text)) return t.label;
  }
  return undefined;
}

function inferTarget(text: string): string | undefined {
  const targets = [
    { label: "Professionisti under pressure", pattern: /\b(professionist|manager|imprenditor|carriera)\b/i },
    { label: "Creativi e maker", pattern: /\b(creativ|artist|scritt|maker|designer)\b/i },
    { label: "Lettori di romance", pattern: /\b(donne|lettoric|fan del genere|romantic)\b/i },
    { label: "Persone in crisi o transizione", pattern: /\b(crisi|transizione|blocc|perdita|lutto)\b/i },
    { label: "Giovani adulti", pattern: /\b(young adult|giovani|ventenn|student)\b/i },
  ];
  for (const t of targets) {
    if (t.pattern.test(text)) return t.label;
  }
  return undefined;
}

function inferPromise(text: string, genre?: InterviewGenre): string | undefined {
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim();
  if (firstSentence && firstSentence.length >= 24) return sanitizeDnaText(firstSentence);
  if (genre === "self-help") return "Un percorso concreto di trasformazione personale.";
  if (genre === "romance") return "Un payoff emotivo che resta addosso al lettore.";
  if (genre === "thriller") return "Tensione crescente fino a una rivelazione inevitabile.";
  return undefined;
}

export function inferBookProfileFromText(
  text: string,
  existing?: Partial<ExtractedBookIntent>,
): InferredBookProfile {
  const blob = sanitizeDnaText(text);
  if (blob.length < 8) return { confidence: 0.05 };

  const genreHit = scoreGenre(blob);
  const genre = genreHit?.signal.genre;
  const tone = inferTone(blob) ?? (existing?.emotionalTone ? sanitizeDnaText(existing.emotionalTone) : undefined);
  const targetReader = inferTarget(blob) ?? (existing?.targetReader ? sanitizeDnaText(existing.targetReader) : undefined);
  const promise = inferPromise(blob, genre) ?? (existing?.promise ? sanitizeDnaText(existing.promise) : undefined);

  let pacing: string | undefined;
  for (const p of PACING_SIGNALS) {
    if (p.pattern.test(blob)) {
      pacing = p.label;
      break;
    }
  }

  const atmosphere =
    tone ||
    (/\b(notte|pioggia|nebbia|luce|silenzio)\b/i.test(blob) ? "Atmosfera sensoriale e immersiva" : undefined);

  let confidence = 0.18;
  if (genreHit) confidence += Math.min(0.35, genreHit.score * 0.12);
  if (tone) confidence += 0.08;
  if (targetReader) confidence += 0.08;
  if (promise) confidence += 0.08;
  if (pacing) confidence += 0.06;
  if (blob.length > 80) confidence += 0.08;
  if (blob.length > 180) confidence += 0.06;

  return {
    bookType: genreHit?.signal.bookType,
    genre,
    subgenre: genreHit?.signal.subgenre,
    tone,
    targetReader,
    promise,
    pacing,
    atmosphere,
    structureHint: genre === "poetry" ? "Sezioni poetiche tematiche" : genre === "manual" ? "Capitoli operativi progressivi" : undefined,
    positioning: genreHit?.signal.subgenre,
    antiDriftHint: genre ? `Non deviare dal DNA ${genreHit?.signal.subgenre ?? genre}.` : undefined,
    confidence: Math.min(0.92, confidence),
  };
}

export function mergeInferenceIntoExtracted(
  extracted: ExtractedBookIntent,
  inference: InferredBookProfile,
  latestAnswer: string,
): ExtractedBookIntent {
  const answer = sanitizeDnaText(latestAnswer);
  const merged: ExtractedBookIntent = { ...extracted };

  const fillIfWeak = (key: keyof ExtractedBookIntent, value?: string) => {
    const current = sanitizeDnaText(merged[key]);
    if (current.length >= 12) return;
    if (value && value.length >= 8) merged[key] = value;
  };

  if (answer.length >= 12) {
    const keys = [
      "readerTransformation",
      "centralConflict",
      "emotionalTone",
      "genreDNA",
      "promise",
      "setting",
      "targetReader",
    ] as const;
    const emptyKey = keys.find((k) => sanitizeDnaText(merged[k]).length < 12);
    if (emptyKey) merged[emptyKey] = answer;
  }

  fillIfWeak("emotionalTone", inference.tone);
  fillIfWeak("targetReader", inference.targetReader);
  fillIfWeak("promise", inference.promise);
  fillIfWeak("genreDNA", inference.subgenre ? `${inference.subgenre}. ${inference.pacing ?? ""}`.trim() : inference.pacing);
  fillIfWeak("setting", inference.atmosphere);
  fillIfWeak("readerTransformation", inference.promise);
  fillIfWeak("centralConflict", inference.antiDriftHint);

  return merged;
}

export function getAdaptiveQuestion(
  genre: InterviewGenre | undefined,
  weakField: string,
): { question: string; helper?: string; quickSuggestions?: { label: string; value: string }[] } {
  const g = genre ?? "general";

  const byGenreField: Record<string, Partial<Record<InterviewGenre, string>>> = {
    emotionalTone: {
      romance: "Vuoi un romance slow burn o payoff emotivo più rapido?",
      thriller: "Che atmosfera immagini: claustrofobica, investigativa, disturbante, gotica, realistica?",
      "self-help": "Guida morbida e compassionevole, o trasformazione più dura e diretta?",
      fantasy: "Che atmosfera emotiva deve dominare il mondo?",
    },
    centralConflict: {
      romance: "Cosa rende questa storia d'amore difficile o impossibile?",
      thriller: "Quale evento rompe l'equilibrio della storia?",
      "self-help": "Qual è il blocco principale del lettore oggi?",
      fantasy: "Quale forza minaccia il mondo o il protagonista?",
    },
    genreDNA: {
      romance: "Che sensazione di lettura vuoi — intima, proibita, lenta, appassionata?",
      thriller: "Il pericolo è umano, soprannaturale, psicologico o ambiguo?",
      poetry: "Che immagini, simboli o ritmo poetico ti stanno a cuore?",
    },
    setting: {
      thriller: "Dove si svolge la storia e che sensazione deve dare quel luogo?",
      fantasy: "Che mondo o atmosfera vuoi far respirare al lettore?",
    },
    promise: {
      thriller: "Cosa il lettore deve scoprire poco alla volta?",
      romance: "Quale segreto emotivo non deve essere rivelato troppo presto?",
    },
    targetReader: {
      general: "A chi stai parlando, come a una persona reale che conosci?",
    },
    readerTransformation: {
      general: "Che emozione vuoi lasciare nel lettore quando chiude il libro?",
    },
  };

  const question =
    byGenreField[weakField]?.[g] ??
    byGenreField[weakField]?.general ??
    humanizeMissingField(weakField);

  return { question };
}
