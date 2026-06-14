import { getGenreBlueprint, getGenreProfile } from "@/lib/genre-intelligence";
import type { MarketAnalysis, KDPPackaging } from "@/lib/kdp/money-engine";

export interface KdpNarrativeFlow {
  initialHook: string;
  centralPromise: string;
  chapterProgression: string[];
  emotionalPeaks: string[];
  finalePayoff: string;
  strengthenBeforePublish: string[];
  positioningAngle: string;
  targetReader: string;
  commercialTone: string;
  generatedAt: string;
  source: "local-intelligence";
}

export interface KdpNarrativeFlowInput {
  idea: string;
  genre: string;
  language: string;
  title?: string;
  subtitle?: string;
  market?: MarketAnalysis | null;
  packaging?: KDPPackaging | null;
  targetReader?: string;
}

function isItalian(language: string): boolean {
  return String(language || "").toLowerCase().includes("ital");
}

function clean(value?: string, fallback = ""): string {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function chapterCount(genre: string): number {
  const g = genre.toLowerCase();
  if (/romance|thriller|fiction|fantasy|horror/.test(g)) return 12;
  if (/memoir|biography/.test(g)) return 10;
  return 8;
}

function buildChapterProgression(
  input: KdpNarrativeFlowInput,
  italian: boolean,
): string[] {
  const blueprint = getGenreBlueprint(input.genre, input.market?.subNiche);
  const profile = getGenreProfile(input.genre, input.market?.subNiche);
  const total = chapterCount(input.genre);
  const beats = profile.chapterBeats?.length
    ? profile.chapterBeats
    : (Array.isArray(blueprint.structure) ? blueprint.structure : [String(blueprint.structure)]);

  const angle = clean(input.market?.recommendedAngle, input.idea);
  const promise = clean(input.subtitle || input.market?.recommendedAngle, input.idea);

  const labels = italian
    ? ["Apertura magnetica", "Problema reale", "Svolta credibile", "Metodo/pratica", "Prova sociale", "Accelerazione", "Resistenza del lettore", "Trasformazione", "Payoff emotivo", "Chiusura commerciale"]
    : ["Magnetic opening", "Real problem", "Credible turn", "Method/practice", "Social proof", "Acceleration", "Reader resistance", "Transformation", "Emotional payoff", "Commercial close"];

  return Array.from({ length: Math.min(total, 10) }, (_, i) => {
    const beat = beats[i % beats.length] || labels[i % labels.length];
    const label = labels[i] || (italian ? `Capitolo ${i + 1}` : `Chapter ${i + 1}`);
    return italian
      ? `${i + 1}. ${label} — ${beat}. Collega a: "${angle.slice(0, 80)}${angle.length > 80 ? "…" : ""}"`
      : `${i + 1}. ${label} — ${beat}. Tied to: "${promise.slice(0, 80)}${promise.length > 80 ? "…" : ""}"`;
  });
}

function buildEmotionalPeaks(input: KdpNarrativeFlowInput, italian: boolean): string[] {
  const niche = clean(input.market?.subNiche, input.genre);
  if (italian) {
    return [
      `Riconoscimento immediato del problema (${niche})`,
      `Speranza concreta tramite promessa: ${clean(input.subtitle || input.market?.recommendedAngle, input.idea).slice(0, 60)}`,
      `Momento "finalmente capisco" a metà libro`,
      `Prova che il metodo/storia funziona davvero`,
      `Payoff finale che giustifica l'acquisto su Amazon`,
    ];
  }
  return [
    `Immediate problem recognition (${niche})`,
    `Concrete hope via promise: ${clean(input.subtitle || input.market?.recommendedAngle, input.idea).slice(0, 60)}`,
    `Mid-book "finally I get it" moment`,
    `Proof the method/story actually works`,
    `Final payoff that justifies the Amazon purchase`,
  ];
}

function buildStrengthenPoints(input: KdpNarrativeFlowInput, italian: boolean): string[] {
  const keywords = input.packaging?.backendKeywords?.slice(0, 3) || [];
  const categories = input.packaging?.categories?.slice(0, 2) || [];
  const competition = input.market?.competitionLevel;

  const base = italian
    ? [
        "Rafforza l'hook dei primi 2 capitoli con una scena o esempio specifico",
        "Rendi la promessa centrale visibile nel titolo e nel sottotitolo",
        "Aggiungi micro-payoff ogni 1-2 capitoli per retention KDP",
        competition === "high"
          ? "Differenzia l'angolo: evita formule generiche già saturate"
          : "Consolida l'autorità con prove, casi o esperienza diretta",
      ]
    : [
        "Strengthen the hook in the first 2 chapters with a specific scene or example",
        "Make the central promise visible in title and subtitle",
        "Add micro-payoffs every 1-2 chapters for KDP retention",
        competition === "high"
          ? "Differentiate the angle: avoid generic saturated formulas"
          : "Consolidate authority with proof, cases, or direct experience",
      ];

  if (keywords.length) {
    base.push(italian
      ? `Integra keyword backend in modo naturale: ${keywords.join(", ")}`
      : `Weave backend keywords naturally: ${keywords.join(", ")}`);
  }
  if (categories.length) {
    base.push(italian
      ? `Allinea struttura alle categorie KDP: ${categories.join(" · ")}`
      : `Align structure to KDP categories: ${categories.join(" · ")}`);
  }
  return base;
}

export function validateNarrativeFlowInput(input: KdpNarrativeFlowInput): string | null {
  if (!clean(input.idea)) return "Configurazione mancante: inserisci idea/promessa.";
  if (!input.market) return "Analisi mercato mancante: completa prima l'analisi.";
  if (!clean(input.genre)) return "Genere mancante.";
  return null;
}

/**
 * Local narrative-flow builder — uses KDP session data + genre intelligence.
 * No remote generation engine; safe for recovery and offline replay.
 */
export function generateKdpNarrativeFlow(input: KdpNarrativeFlowInput): KdpNarrativeFlow {
  const validation = validateNarrativeFlowInput(input);
  if (validation) throw new Error(validation);

  const italian = isItalian(input.language);
  const title = clean(input.title);
  const subtitle = clean(input.subtitle);
  const angle = clean(input.market?.recommendedAngle, input.idea);
  const niche = clean(input.market?.subNiche, input.genre);
  const blueprint = getGenreBlueprint(input.genre, niche);

  const initialHook = title
    ? (italian
      ? `Apri con "${title}" come promessa visibile: ${subtitle || angle}. Primo capitolo = riconoscimento immediato del problema (${niche}).`
      : `Open with "${title}" as the visible promise: ${subtitle || angle}. Chapter 1 = immediate problem recognition (${niche}).`)
    : (italian
      ? `Hook iniziale su ${niche}: mostra il costo del problema e la via d'uscita in 2-3 pagine. Angolo: ${angle}.`
      : `Opening hook on ${niche}: show the cost of the problem and the way out in 2-3 pages. Angle: ${angle}.`);

  const centralPromise = subtitle || angle || input.idea;

  return {
    initialHook,
    centralPromise,
    chapterProgression: buildChapterProgression(input, italian),
    emotionalPeaks: buildEmotionalPeaks(input, italian),
    finalePayoff: italian
      ? `Finale: il lettore ottiene ${centralPromise.slice(0, 100)} con payoff chiaro e invito all'azione (recensione, serie, workbook).`
      : `Finale: reader achieves ${centralPromise.slice(0, 100)} with clear payoff and call to action (review, series, workbook).`,
    strengthenBeforePublish: buildStrengthenPoints(input, italian),
    positioningAngle: angle,
    targetReader: clean(input.targetReader, italian ? "Lettore target da definire nel progetto" : "Target reader to define in project"),
    commercialTone: blueprint.tone || (italian ? "Diretto, vendibile, credibile" : "Direct, sellable, credible"),
    generatedAt: new Date().toISOString(),
    source: "local-intelligence",
  };
}

/** Simulated async wrapper for visible loading state (no API). */
export function generateKdpNarrativeFlowAsync(
  input: KdpNarrativeFlowInput,
  minMs = 1200,
): Promise<KdpNarrativeFlow> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    try {
      const result = generateKdpNarrativeFlow(input);
      const elapsed = Date.now() - started;
      const wait = Math.max(0, minMs - elapsed);
      setTimeout(() => resolve(result), wait);
    } catch (e) {
      reject(e);
    }
  });
}
