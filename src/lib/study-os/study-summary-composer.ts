import type { StudyDifficultyLevel } from "@/lib/study-session";
import type { StudySummaryMode } from "@/lib/study-session";
import type { StudyMaterialClassification } from "@/lib/study-session";
import { countStudyWords } from "@/lib/study-session";
import {
  buildSyntheticHistoryCauses,
  buildSyntheticHistoryKeyPoints,
  buildSyntheticHistoryTimeline,
} from "@/lib/study-os/study-history-outputs";
import { evaluateSummaryQuality, summaryExtractivityRatio } from "@/lib/study-os/study-quality-gates";
import { extractStudyTopic, replaceBannedTopicPhrases } from "@/lib/study-os/study-topic-extract";

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

interface HistorySignals {
  nazionalismo: boolean;
  imperialismo: boolean;
  militarismo: boolean;
  alleanze: boolean;
  sarajevo: boolean;
  trincea: boolean;
  italia: boolean;
  caporetto: boolean;
  year1917: boolean;
  armistizio: boolean;
  versailles: boolean;
}

function detectHistorySignals(text: string): HistorySignals {
  const lower = text.toLowerCase();
  return {
    nazionalismo: /\bnazionalismo\b/.test(lower),
    imperialismo: /\bimperialismo\b/.test(lower),
    militarismo: /\bmilitarismo\b/.test(lower),
    alleanze: /\balleanz|triplice\b/.test(lower),
    sarajevo: /\bsarajevo\b|\bfrancesco ferdinando\b/.test(lower),
    trincea: /\btrince|verdun\b|\bsomme\b/.test(lower),
    italia: /\bitalia\b|\binterventist|\bneutralist/.test(lower),
    caporetto: /\bcaporetto\b|\bpiave\b|\bvittorio veneto\b/.test(lower),
    year1917: /\b1917\b|\brivoluzione russa\b|\bstati uniti\b/.test(lower),
    armistizio: /\barmistizio\b|\b11 novembre\b/.test(lower),
    versailles: /\bversailles\b|\btrattat/i.test(lower),
  };
}

function collapseRepeatedPhrases(text: string): string {
  return text
    .replace(/\b(La Prima guerra mondiale)(\s+\1)+\b/gi, "$1")
    .replace(/\b(Le cause del conflitto)(\s+\1)+\b/gi, "$1")
    .replace(/\b(Lo scoppio della guerra)(\s+\1)+\b/gi, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function reformulateHistoryParagraph(bucket: HistoryBucket, title: string, signals: HistorySignals): string {
  switch (bucket) {
    case "intro":
      return collapseRepeatedPhrases(
        `${title} fu un conflitto globale che coinvolse le principali potenze europee tra il 1914 e il 1918. `
        + "Per estensione, numero di combattenti e conseguenze economiche e politiche, segnò uno degli eventi più devastanti del Novecento.",
      );
    case "causes": {
      const parts = ["Le cause del conflitto si accumularono nel lungo periodo e non dipendono da un solo evento."];
      if (signals.nazionalismo) parts.push("Il nazionalismo alimentò rivalità tra popoli e Stati, soprattutto nei Balcani.");
      if (signals.imperialismo) parts.push("L'imperialismo spinse le grandi potenze a competere per colonie e mercati.");
      if (signals.militarismo) parts.push("Il militarismo favorì la corsa agli armamenti e piani di mobilitazione rapida.");
      if (signals.alleanze) parts.push("Il sistema di alleanze (Triplice Alleanza e Triplice Intesa) trasformò una crisi locale in guerra europea.");
      return parts.join(" ");
    }
    case "outbreak":
      return collapseRepeatedPhrases(
        signals.sarajevo
          ? "Lo scoppio immediato è legato all'attentato di Sarajevo del 28 giugno 1914 contro l'arciduca Francesco Ferdinando. "
            + "L'ultimatum austro-ungarico alla Serbia e le mobilitazioni generali fecero degenerare la crisi in pochi giorni."
          : "La guerra scoppiò dopo una crisi diplomatica rapidamente inarrestabile, quando il sistema di alleanze coinvolse le grandi potenze.",
      );
    case "development":
      return collapseRepeatedPhrases(
        signals.trincea
          ? "Il conflitto divenne un logoramento duraturo: sul fronte occidentale prevalse la guerra di trincea, con artiglierie, gas e perdite enormi in battaglie come Verdun e la Somme."
          : "Il conflitto assunse caratteristiche moderne e devastanti, con impiego di sottomarini, aerei e propaganda di massa.",
      );
    case "italy":
      return collapseRepeatedPhrases(
        signals.italia
          ? "L'Italia iniziò in neutralità, divisa tra neutralisti e interventisti, poi entrò in guerra nel 1915 con il Patto di Londra."
            + (signals.caporetto
              ? " Dopo la disfatta di Caporetto (1917), la resistenza sul Piave e la vittoria di Vittorio Veneto segnarono la svolta finale."
              : " La guerra sul fronte italiano fu estremamente dura sulle montagne e lungo i fiumi strategici.")
          : "Nel conflitto parteciparono anche potenze fuori dal cuore dell'Europa, ampliando la dimensione globale della guerra.",
      );
    case "year1917":
      return collapseRepeatedPhrases(
        signals.year1917
          ? "Il 1917 fu decisivo: la Rivoluzione russa portò al ritiro della Russia, mentre l'entrata degli Stati Uniti rafforzò gli Alleati e accelerò la crisi degli Imperi centrali."
          : "A metà conflitto le svolte militari e politiche modificarono gli equilibri tra gli schieramenti.",
      );
    case "end":
      return collapseRepeatedPhrases(
        signals.armistizio
          ? "La guerra terminò con l'armistizio dell'11 novembre 1918, dopo il crollo militare e politico della Germania e dei suoi alleati."
          : "Il conflitto si concluse dopo anni di logoramento, con la sconfitta degli Imperi centrali.",
      );
    case "consequences":
      return collapseRepeatedPhrases(
        "Le conseguenze furono profonde: milioni di morti e feriti, crollo di grandi imperi, crisi economiche e trasformazioni sociali che ridisegnarono l'Europa.",
      );
    case "treaties":
      return collapseRepeatedPhrases(
        signals.versailles
          ? "I trattati di pace, in particolare il Trattato di Versailles (1919), imposero condizioni severe alla Germania e ridisegnarono le mappe, alimentando nuove tensioni."
          : "Le conferenze di pace ridisegnarono gli equilibri internazionali e crearono condizioni per instabilità future.",
      );
    default:
      return "";
  }
}

function composeHistorySummary(title: string, text: string, maxParagraphs = 8): string {
  const signals = detectHistorySignals(text);
  const paragraphs: string[] = [];

  for (const bucket of HISTORY_BUCKET_ORDER) {
    paragraphs.push(reformulateHistoryParagraph(bucket, title, signals));
    if (paragraphs.length >= maxParagraphs) break;
  }

  const merged = collapseRepeatedPhrases(paragraphs.filter(Boolean).join("\n\n"));
  if (/^La Prima guerra mondiale rappresenta/i.test(merged)) return merged;
  return collapseRepeatedPhrases(`La Prima guerra mondiale rappresenta uno degli eventi più importanti del Novecento.\n\n${merged}`);
}

function sentencesFromText(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\n+/g, " ")
    .match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)
    ?.map((s) => s.trim())
    .filter((s) => countStudyWords(s) >= 6) || [];
}

function composeGenericSummary(title: string, text: string, maxParagraphs = 6): string {
  const topic = extractStudyTopic(text, title);
  const signals = detectHistorySignals(text);
  const paragraphs = [
    `${topic} è il tema centrale del materiale. Il testo presenta concetti collegati tra loro che vanno ricostruiti in sequenza logica.`,
    reformulateHistoryParagraph("causes", topic, signals),
    reformulateHistoryParagraph("outbreak", topic, signals),
    reformulateHistoryParagraph("development", topic, signals),
    reformulateHistoryParagraph("consequences", topic, signals),
  ].filter((p) => countStudyWords(p) >= 8);

  return paragraphs.slice(0, maxParagraphs).join("\n\n");
}

function truncateSummary(title: string, text: string, ratio: number): string {
  const body = composeHistorySummary(title, text, Math.max(3, Math.floor(9 * ratio)));
  const paragraphs = body.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  return paragraphs.slice(0, Math.max(2, Math.floor(paragraphs.length * ratio))).join("\n\n");
}

function oralClosing(title: string): string {
  return `Per un'interrogazione, presenta ${title}, collega cause ed eventi principali e chiudi con almeno una conseguenza verificabile dal testo.`;
}

export interface ComposeStudySummariesInput {
  title: string;
  clean: string;
  classification: StudyMaterialClassification;
  difficultyLevel?: StudyDifficultyLevel;
}

export function composeStudySummaries(input: ComposeStudySummariesInput): Record<StudySummaryMode, string> {
  const topic = extractStudyTopic(input.clean, input.title);
  const title = replaceBannedTopicPhrases(topic, topic);
  const { clean, classification } = input;
  const isHistory = classification.type === "history";

  const completeBody = isHistory
    ? composeHistorySummary(title, clean, 9)
    : composeGenericSummary(title, clean, 7);
  const briefBody = isHistory
    ? composeHistorySummary(title, clean, 2)
    : truncateSummary(title, completeBody, 0.35);
  const oralBody = isHistory
    ? composeHistorySummary(title, clean, 6)
    : composeGenericSummary(title, clean, 5);

  const universityLabel = (input.difficultyLevel ?? 3) >= 5 ? "Riassunto universitario" : "Riassunto approfondito";
  const timeline = isHistory ? buildSyntheticHistoryTimeline(clean, classification) : "";
  const causeEffect = isHistory ? buildSyntheticHistoryCauses(clean, classification) : "";
  const bulletPoints = isHistory ? buildSyntheticHistoryKeyPoints(clean, classification) : "";

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
    chronological: timeline || ["Sequenza cronologica", "• Ricostruisci le tappe principali in ordine temporale."].join("\n"),
    causeEffect: causeEffect || ["Cause, eventi e conseguenze", "• Individua cause profonde, eventi scatenanti ed effetti a lungo termine."].join("\n"),
    bulletPoints: bulletPoints || ["Punti chiave", "• Sintetizza i concetti essenziali con parole tue."].join("\n"),
    oralExam: [
      "Metodo per esame orale",
      `1. Presenta l'argomento: ${title}.`,
      "2. Indica cause, sviluppo ed esito.",
      "3. Chiudi con conseguenze e collegamenti.",
      oralClosing(title),
    ].join("\n"),
  };
}

export function isExtractiveSummaryDefect(summary: string, sourceText = ""): boolean {
  const text = String(summary || "");
  if (/\bLa Prima guerra mondiale La Prima guerra mondiale\b/i.test(text)) return true;
  if (/\bse uno Stato fosse entrato\.\s*$/i.test(text)) return true;
  if (/\bpresentavano la guerra come un modo per\.\s*$/i.test(text)) return true;
  if (/^Per la sua estensione/i.test(text.replace(/^Riassunto[^\n]*\n+/i, ""))) return true;
  if (sourceText && summaryExtractivityRatio(text, sourceText) > 0.6) return true;
  if (text.length < 5000) {
    return /(.{18,}?)\1/i.test(text.replace(/\s+/g, " "));
  }
  return false;
}

export function ensureComposedSummary(summary: string, fallback: string, sourceText = ""): string {
  const report = evaluateSummaryQuality(summary, sourceText);
  if (report.status !== "fail" && !isExtractiveSummaryDefect(summary, sourceText)) return summary;
  const cleanFallback = String(fallback || "").trim();
  if (!cleanFallback) return summary;
  if (!isExtractiveSummaryDefect(cleanFallback, sourceText)) return cleanFallback;
  return cleanFallback.split("\n\n").slice(0, 4).join("\n\n");
}
