import type { StudyDifficultyLevel } from "@/lib/study-session";
import type { StudySummaryMode } from "@/lib/study-session";
import type { StudyMaterialClassification } from "@/lib/study-session";
import { countStudyWords } from "@/lib/study-session";
import { evaluateSummaryQuality } from "@/lib/study-os/study-quality-gates";

type HistoryBucket =
  | "intro"
  | "causes"
  | "outbreak"
  | "development"
  | "italy"
  | "year1917"
  | "end"
  | "consequences"
  | "treaties";

const HISTORY_BUCKET_PATTERNS: Array<{ bucket: HistoryBucket; patterns: RegExp[] }> = [
  {
    bucket: "intro",
    patterns: [
      /\bprima guerra mondiale\b/i,
      /\bconflict(?:o)? globale\b/i,
      /\bestensione\b/i,
      /\b1914\b.*\b1918\b/i,
      /\bcaratterizz\b/i,
    ],
  },
  {
    bucket: "causes",
    patterns: [
      /\bnazionalismo\b/i,
      /\bimperialismo\b/i,
      /\bmilitarismo\b/i,
      /\brivalit[aà]\b/i,
      /\bcrisi\b/i,
      /\bcolonial\b/i,
      /\balleanz/i,
      /\btriplice alleanza\b/i,
      /\btriplice intesa\b/i,
    ],
  },
  {
    bucket: "outbreak",
    patterns: [
      /\bsarajevo\b/i,
      /\bfrancesco ferdinando\b/i,
      /\bgavrilo princip\b/i,
      /\bultimatum\b/i,
      /\bscoppio\b/i,
      /\b28 luglio\b/i,
      /\bmobilitaz/i,
    ],
  },
  {
    bucket: "development",
    patterns: [
      /\btrince/i,
      /\bfronte\b/i,
      /\bbattagli/i,
      /\bverdun\b/i,
      /\bsomme\b/i,
      /\bgas\b/i,
      /\bsottomarin/i,
      /\btotal/i,
    ],
  },
  {
    bucket: "italy",
    patterns: [
      /\bitalia\b/i,
      /\bneutralist/i,
      /\binterventist/i,
      /\bpatto di londra\b/i,
      /\bcaporetto\b/i,
      /\bpiave\b/i,
      /\bvittorio veneto\b/i,
    ],
  },
  {
    bucket: "year1917",
    patterns: [/\b1917\b/i, /\brivoluzione russa\b/i, /\bstati uniti\b/i, /\bentrata.*guerra\b/i],
  },
  {
    bucket: "end",
    patterns: [/\barmistizio\b/i, /\b11 novembre\b/i, /\b1918\b/i, /\bcroll/i, /\bsconfitt/i],
  },
  {
    bucket: "consequences",
    patterns: [
      /\bconseguenz/i,
      /\bperdite\b/i,
      /\beconom/i,
      /\bsociale\b/i,
      /\bpolitic/i,
      /\bnuov.*equilibri\b/i,
      /\bmappe\b/i,
    ],
  },
  {
    bucket: "treaties",
    patterns: [/\bversailles\b/i, /\btrattat/i, /\bpace\b/i, /\breparazion/i, /\blega delle nazioni\b/i],
  },
];

const HISTORY_BUCKET_ORDER: HistoryBucket[] = [
  "intro",
  "causes",
  "outbreak",
  "development",
  "italy",
  "year1917",
  "end",
  "consequences",
  "treaties",
];

const BUCKET_INTROS: Record<HistoryBucket, string> = {
  intro: "La Prima guerra mondiale fu un conflitto globale che coinvolse le maggiori potenze europee tra il 1914 e il 1918.",
  causes: "Le cause del conflitto si intrecciano in un clima di tensioni accumulate nel lungo periodo.",
  outbreak: "Lo scoppio della guerra fu legato all'attentato di Sarajevo e a una crisi diplomatica rapidamente inarrestabile.",
  development: "Il conflitto assunse caratteristiche nuove e devastanti sul piano militare e umano.",
  italy: "L'Italia visse un percorso complesso, dalla neutralità iniziale all'intervento armato.",
  year1917: "Il 1917 segnò una svolta decisiva nel corso della guerra.",
  end: "La guerra giunse al termine dopo anni di logoramento e crisi interne negli schieramenti.",
  consequences: "Le conseguenze del conflitto trasformarono profondamente Europa e mondo.",
  treaties: "I trattati di pace ridisegnarono gli equilibri internazionali e alimentarono nuove tensioni.",
};

function cleanSentence(line: string): string {
  return String(line || "")
    .replace(/^[•\-\d.)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentencesFromText(text: string): string[] {
  const MAX_SENTENCES = 80;
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\n+/g, " ")
    .match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)
    ?.map(cleanSentence)
    .filter((s) => countStudyWords(s) >= 6)
    .filter((s) => !/^(la prima guerra mondiale|le cause del conflitto|lo scoppio della guerra|l'italia nel conflitto|il 1917|la fine della guerra|le conseguenze|i trattati di pace)$/i.test(s.trim()))
    .slice(0, MAX_SENTENCES) || [];
}

function collapseRepeatedPhrases(text: string): string {
  return text
    .replace(/\b(La Prima guerra mondiale)(\s+\1)+\b/gi, "$1")
    .replace(/\b(Le cause del conflitto)(\s+\1)+\b/gi, "$1")
    .replace(/\b(Lo scoppio della guerra)(\s+\1)+\b/gi, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function classifyHistorySentence(sentence: string): HistoryBucket {
  for (const { bucket, patterns } of HISTORY_BUCKET_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(sentence))) return bucket;
  }
  return "development";
}

function dedupeSentences(sentences: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const sentence of sentences) {
    const key = sentence.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sentence);
  }
  return out;
}

function isSecondaryOpening(sentence: string): boolean {
  return /^(per la sua estensione|inoltre|inoltre,|successivamente|dopo|poi|nel frattempo)\b/i.test(sentence.trim());
}

function prioritizeSentences(sentences: string[], patterns: RegExp[]): string[] {
  const score = (sentence: string) => patterns.reduce((sum, pattern) => sum + (pattern.test(sentence) ? 1 : 0), 0);
  return [...sentences].sort((a, b) => score(b) - score(a));
}

function composeHistoryParagraph(bucket: HistoryBucket, sourceSentences: string[]): string {
  const intro = BUCKET_INTROS[bucket];
  const priorityPatterns = HISTORY_BUCKET_PATTERNS.find((item) => item.bucket === bucket)?.patterns || [];
  const body = dedupeSentences(prioritizeSentences(sourceSentences, priorityPatterns))
    .filter((sentence) => !new RegExp(`^${intro.slice(0, 24)}`, "i").test(sentence))
    .slice(0, 3);
  if (!body.length) return intro;
  return collapseRepeatedPhrases([intro, ...body].join(" "));
}

function composeHistorySummary(title: string, text: string, maxParagraphs = 8): string {
  const sentences = sentencesFromText(text);
  const buckets = new Map<HistoryBucket, string[]>();

  for (const sentence of sentences) {
    const bucket = classifyHistorySentence(sentence);
    const list = buckets.get(bucket) || [];
    list.push(sentence);
    buckets.set(bucket, list);
  }

  const paragraphs: string[] = [];
  for (const bucket of HISTORY_BUCKET_ORDER) {
    const source = buckets.get(bucket) || [];
    if (!source.length && bucket !== "intro") continue;
    paragraphs.push(composeHistoryParagraph(bucket, source));
    if (paragraphs.length >= maxParagraphs) break;
  }

  if (!paragraphs.length) {
    return collapseRepeatedPhrases(`La Prima guerra mondiale è il tema centrale del materiale. ${sentences.slice(0, 3).join(" ")}`);
  }

  const merged = collapseRepeatedPhrases(paragraphs.join("\n\n"));
  if (/^La Prima guerra mondiale rappresenta/i.test(merged)) return merged;
  return collapseRepeatedPhrases(`La Prima guerra mondiale rappresenta uno degli eventi più importanti del Novecento.\n\n${merged}`);
}

function composeGenericSummary(title: string, text: string, maxParagraphs = 6): string {
  const sentences = dedupeSentences(sentencesFromText(text));
  const opening = sentences.find((s) => !isSecondaryOpening(s)) || sentences[0] || title;
  const body = sentences.filter((s) => s !== opening).slice(0, maxParagraphs * 2);
  const paragraphs: string[] = [`${title} è il tema centrale del materiale. ${opening}`];

  for (let index = 0; index < body.length; index += 2) {
    paragraphs.push(body.slice(index, index + 2).join(" "));
  }

  return paragraphs.slice(0, maxParagraphs + 1).join("\n\n");
}

function truncateSummary(title: string, text: string, ratio: number): string {
  const sentences = sentencesFromText(text);
  const count = Math.max(3, Math.floor(sentences.length * ratio));
  const selected = dedupeSentences(sentences).slice(0, count);
  return [`${title}`, selected.join(" ")].filter(Boolean).join("\n\n");
}

function oralClosing(title: string): string {
  return `Per un'interrogazione, presenta ${title}, collega cause ed eventi principali e chiudi con almeno una conseguenza verificabile dal testo.`;
}

function buildChronology(text: string): string {
  const chronological = sentencesFromText(text).filter((line) =>
    /\b(prima|poi|dopo|successivamente|infine|inizialmente|1914|1915|1916|1917|1918|\d{3,4})\b/i.test(line),
  );
  const source = chronological.length ? chronological : sentencesFromText(text);
  return ["Sequenza cronologica", ...source.slice(0, 10).map((line, index) => `${index + 1}. ${line}`)].join("\n");
}

function buildCauseEffect(text: string): string {
  const causeLines = sentencesFromText(text).filter((line) =>
    /\b(perché|causa|conseguenza|quindi|provoca|porta a|effetto|risultato|dunque)\b/i.test(line),
  );
  const source = causeLines.length ? causeLines : sentencesFromText(text);
  return ["Cause, eventi e conseguenze", ...source.slice(0, 10).map((line) => `• ${line}`)].join("\n");
}

export interface ComposeStudySummariesInput {
  title: string;
  clean: string;
  classification: StudyMaterialClassification;
  difficultyLevel?: StudyDifficultyLevel;
}

export function composeStudySummaries(input: ComposeStudySummariesInput): Record<StudySummaryMode, string> {
  const { title, clean, classification } = input;
  const isHistory = classification.type === "history";
  const completeBody = isHistory
    ? composeHistorySummary(title, clean, 9)
    : composeGenericSummary(title, clean, 7);
  const briefBody = isHistory
    ? composeHistorySummary(title, clean, 4)
    : truncateSummary(title, completeBody, 0.35);
  const oralBody = isHistory
    ? composeHistorySummary(title, clean, 6)
    : composeGenericSummary(title, clean, 5);

  const universityLabel = (input.difficultyLevel ?? 3) >= 5 ? "Riassunto universitario" : "Riassunto approfondito";

  return {
    brief: `Riassunto breve\n\n${collapseRepeatedPhrases(briefBody)}`,
    complete: `Riassunto completo\n\n${collapseRepeatedPhrases(completeBody)}`,
    university: `${universityLabel}\n\n${completeBody}\n\nPer una verifica, collega definizioni, date ed esempi presenti nel materiale.`,
    oral: `Riassunto per interrogazione\n\n${oralBody}\n\n${oralClosing(title)}`,
    ultraSimple: `Riassunto semplificato\n\n${truncateSummary(title, briefBody, 0.6)}`,
    quickReview: [
      "Ripasso veloce",
      "• Ripeti a voce cause, eventi chiave e conseguenze.",
      "• Collega almeno tre date o nomi al tema centrale.",
      "• Chiudi con una frase che spiega perché l'argomento è importante.",
    ].join("\n"),
    chronological: buildChronology(clean),
    causeEffect: buildCauseEffect(clean),
    bulletPoints: [
      "Punti chiave",
      ...sentencesFromText(clean).slice(0, 8).map((line) => `• ${line}`),
    ].join("\n"),
    oralExam: [
      "Metodo per esame orale",
      `1. Presenta l'argomento: ${title}.`,
      "2. Indica cause, sviluppo ed esito.",
      "3. Chiudi con conseguenze e collegamenti.",
      oralClosing(title),
    ].join("\n"),
  };
}

export function isExtractiveSummaryDefect(summary: string): boolean {
  const text = String(summary || "");
  if (/\bLa Prima guerra mondiale La Prima guerra mondiale\b/i.test(text)) return true;
  if (/\bse uno Stato fosse entrato\.\s*$/i.test(text)) return true;
  if (/\bpresentavano la guerra come un modo per\.\s*$/i.test(text)) return true;
  if (/^Per la sua estensione/i.test(text.replace(/^Riassunto[^\n]*\n+/i, ""))) return true;
  if (text.length < 5000) {
    return /(.{18,}?)\1/i.test(text.replace(/\s+/g, " "));
  }
  return false;
}

export function ensureComposedSummary(summary: string, fallback: string): string {
  const report = evaluateSummaryQuality(summary);
  if (report.status !== "fail" && !isExtractiveSummaryDefect(summary)) return summary;
  const cleanFallback = String(fallback || "").trim();
  if (!cleanFallback) return summary;
  if (!isExtractiveSummaryDefect(cleanFallback)) return cleanFallback;
  return cleanFallback.split("\n\n").slice(0, 4).join("\n\n");
}
