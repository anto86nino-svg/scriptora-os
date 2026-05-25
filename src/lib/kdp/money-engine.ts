/**
 * KDP Money Engine — backend client.
 *
 * Talks to /functions/v1/kdp-money-engine which routes to DeepSeek (and, when
 * the Perplexity connector is linked server-side, augments with web grounding).
 *
 * UX framing: this module powers "creating a product that sells", not "writing".
 */

import { supabase } from "@/integrations/supabase/client";
import type { PlanTier } from "@/lib/plan";
import { getCurrentUserId } from "@/services/storageService";

/* ============ Types ============ */

export type Level = "low" | "medium" | "high";

/** Web grounding metadata, attached to handlers that consult Brave Search. */
export interface GroundingMeta {
  groundingUsed?: boolean;
  groundingProvider?: "brave" | null;
  groundingResultsCount?: number;
  groundingQuery?: string | null;
  analyzedAt?: string;
  fallbackReason?: string;
}

export interface MarketAnalysis extends GroundingMeta {
  nicheScore: number;            // 0-10
  demandLevel: Level;
  competitionLevel: Level;
  profitabilityScore: number;    // 0-10
  recommendedAngle: string;
  subNiche?: string;
  reasoning?: string;
}

export interface BookData {
  title: string;
  subtitle?: string;
  promise?: string;
  genre?: string;
  language?: string;
  outline?: { title: string; summary?: string }[];
}

export interface SuccessPrediction {
  successScore: number;           // 0-100
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface TitleVariants extends GroundingMeta {
  titles: string[];               // 15
  subtitles: string[];            // 15
  topPicks: { title: string; subtitle: string; reason: string }[]; // 3
}

export interface CoverIntelligence {
  visualStyle: string;
  palette: string[];              // hex codes
  fonts: { heading: string; body: string };
  mood: string;
  composition: string;
}

export interface KDPPackaging extends GroundingMeta {
  amazonDescription: string;      // HTML-light, conversion-optimised
  backendKeywords: string[];      // 7 max, KDP rules
  categories: string[];           // 2-3 KDP browse paths
  bulletPoints: string[];         // 5 sales bullets
}

/* ============ Keyword Gold ============ */

export interface KeywordGoldInput {
  title: string;
  subtitle?: string;
  genre?: string;
  language?: string;
  marketplace?: "amazon.com" | "amazon.it" | "amazon.co.uk" | string;
}

export interface KeywordGoldResult extends GroundingMeta {
  marketplace: string;
  title: string;
  subtitle?: string;
  bisacCategories: Array<{
    path: string;
    confidence: number;
    reason: string;
  }>;
  kdpBrowseCategories: Array<{
    path: string;
    confidence: number;
    reason: string;
  }>;
  backendKeywords: string[];
  goldKeywords: Array<{
    keyword: string;
    intent: "buyer" | "problem" | "genre" | "audience" | "benefit" | "competitor-gap";
    strength: number;
    competitionRisk: "low" | "medium" | "high";
    why: string;
  }>;
  negativeKeywords: string[];
  positioning: {
    mainAudience: string;
    commercialPromise: string;
    strongestAngle: string;
    saturationWarning: string;
  };
  finalChecklist: string[];
}

/* ============ Title Domination ============ */

export interface DominateTitlesInput {
  idea: string;
  genre?: string;
  language?: string;
  marketplace?: "amazon.com" | "amazon.it" | "amazon.co.uk" | string;
  bookType?: string;
  targetReader?: string;
  mainProblem?: string;
  desiredPromise?: string;
  titleTone?: "emotional" | "premium" | "direct" | "provocative" | "elegant" | "viral" | "practical" | string;
}

export interface TitleCandidate {
  title: string;
  subtitle: string;
  positioning: string;
  targetReader: string;
  mainKeyword: string;
  secondaryKeywords: string[];
  emotionalHook: string;
  commercialPromise: string;
  differentiationAngle: string;
  kdpScore: number;
  clarityScore: number;
  emotionScore: number;
  keywordScore: number;
  originalityScore: number;
  saturationRisk: "low" | "medium" | "high";
  whyItCanSell: string;
  weakness: string;
  improvementSuggestion: string;
}

export interface TitleDominationResult extends GroundingMeta {
  groundingQueries?: string[];
  marketSignals: {
    dominantKeywords: string[];
    recurringPromises: string[];
    competitorPatterns: string[];
    saturatedAngles: string[];
    openAngles: string[];
    readerPainPoints: string[];
    emotionalTriggers: string[];
  };
  competitorInsights: Array<{
    titleSignal: string;
    source: string;
    whyItMatters: string;
    riskLevel: "low" | "medium" | "high";
  }>;
  titleCandidates: TitleCandidate[];
  winner: {
    title: string;
    subtitle: string;
    reason: string;
    bestMarketplace: string;
    finalScore: number;
  };
  nextActions: string[];
}

/* ============ Trending Niches (multi-market playlist) ============ */

export interface TrendingNiche {
  name: string;
  parentGenre: string;
  marketplace: "amazon.com" | "amazon.it" | "apple-books" | "cross-market";
  demandLevel: Level;
  competitionLevel: Level;
  opportunityScore: number; // 0-100
  trendDirection: "rising" | "stable" | "declining";
  dominantPromise: string;
  targetReader: string;
  suggestedAngle: string;
  dominantKeywords: string[];
  whyItMatters: string;
  saturationRisk: "low" | "medium" | "high";
}

export interface TrendingNichesResult extends GroundingMeta {
  groundingQueries?: string[];
  marketplaces: string[];
  marketOverview: string;
  niches: TrendingNiche[];
}

export interface TrendingNichesInput {
  language?: string;
  focus?: string;
  marketplaces?: Array<"amazon.com" | "amazon.it" | "apple-books">;
  seed?: number;
}

/* ============ Action union ============ */

type Action =
  | { kind: "analyzeMarket"; idea: string; genre?: string; language?: string }
  | { kind: "predictSuccess"; book: BookData }
  | {
      kind: "generateTitleVariants";
      idea: string;
      genre?: string;
      language?: string;
      subNiche?: string;
      recommendedAngle?: string;
      keywords?: string[];
    }
  | { kind: "coverIntelligence"; genre: string; mood?: string; language?: string }
  | { kind: "kdpPackaging"; book: BookData }
  | ({ kind: "dominateTitles" } & DominateTitlesInput)
  | ({ kind: "keywordGold" } & KeywordGoldInput)
  | ({ kind: "trendingNiches" } & TrendingNichesInput);

async function invoke<T>(action: Action, plan: PlanTier): Promise<T> {
  const { data, error } = await supabase.functions.invoke("kdp-money-engine", {
    body: { action: action.kind, payload: action, plan, userId: getCurrentUserId() },
  });
  if (error) {
    const detail = (data as any)?.error || error.message;
    throw new Error(detail);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

type KeywordGoldItem = KeywordGoldResult["goldKeywords"][number];
type KeywordIntent = KeywordGoldItem["intent"];
type KeywordRisk = KeywordGoldItem["competitionRisk"];

const KEYWORD_FALLBACK_TIMEOUT_MS = 30_000;

const KEYWORD_STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "you",
  "una", "uno", "del", "della", "delle", "degli", "dei", "che", "con",
  "per", "non", "mai", "piu", "più", "come", "nel", "nella", "alla",
  "allo", "alle", "gli", "le", "la", "il", "lo", "un", "di", "da",
]);

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isItalianLanguage(language?: string): boolean {
  const normalized = String(language || "").trim().toLowerCase();
  return normalized.startsWith("it") || normalized.includes("ital");
}

function normalizePhrase(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\wÀ-ÿ'-]+/g, "")
    .replace(/^[-']+|[-']+$/g, "");
}

function uniqueKeywords(items: string[], max = items.length): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const value = normalizePhrase(item);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function extractSignalWords(input: KeywordGoldInput): string[] {
  const raw = [input.title, input.subtitle, input.genre].filter(Boolean).join(" ");
  const words = raw
    .split(/\s+/)
    .map(normalizeWord)
    .filter((word) => word.length > 2 && !KEYWORD_STOP_WORDS.has(word));
  return Array.from(new Set(words)).slice(0, 6);
}

function categoryPack(genre: string, italian: boolean) {
  const g = genre.toLowerCase();
  const reason = (it: string, en: string) => (italian ? it : en);

  if (g.includes("self") || g.includes("help") || g.includes("crescita") || g.includes("motiv")) {
    return {
      bisac: [
        ["SELF-HELP / Personal Growth / General", 88, reason("Coerente con promessa di trasformazione personale.", "Matches a personal transformation promise.")],
        ["SELF-HELP / Motivational & Inspirational", 82, reason("Intercetta lettori che cercano motivazione e miglioramento.", "Targets readers looking for motivation and improvement.")],
        ["BODY, MIND & SPIRIT / Inspiration & Personal Growth", 72, reason("Buona categoria secondaria per tono emozionale.", "Useful secondary category for an emotional angle.")],
      ],
      kdp: [
        ["Kindle Store > Libri > Salute, famiglia e benessere > Self-help", 86, reason("Browse path naturale per manuali pratici di crescita.", "Natural browse path for practical growth books.")],
        ["Libri > Famiglia, salute e benessere > Motivazione", 78, reason("Adatta a promessa aspirazionale e pubblico ampio.", "Good fit for aspirational positioning.")],
        ["Kindle Store > Libri > Religione e spiritualita > Ispirazione", 66, reason("Da usare solo se il tono e' introspettivo o spirituale.", "Use only when the tone is reflective or spiritual.")],
      ],
    };
  }

  if (g.includes("business") || g.includes("marketing") || g.includes("success") || g.includes("lavor")) {
    return {
      bisac: [
        ["BUSINESS & ECONOMICS / Personal Success", 86, reason("Posiziona il libro su risultati professionali e metodo.", "Positions the book around professional results and method.")],
        ["BUSINESS & ECONOMICS / Entrepreneurship", 76, reason("Utile se il lettore target e' creator, freelance o founder.", "Useful if the target reader is a creator, freelancer, or founder.")],
        ["BUSINESS & ECONOMICS / Marketing / General", 70, reason("Categoria secondaria se il sottotitolo promette crescita commerciale.", "Secondary category when the subtitle promises commercial growth.")],
      ],
      kdp: [
        ["Kindle Store > Libri > Economia, affari e finanza > Successo personale", 84, reason("Chiara per pubblico orientato al risultato.", "Clear fit for outcome-oriented readers.")],
        ["Libri > Economia, affari e finanza > Imprenditoria", 75, reason("Buona se il libro parla a professionisti indipendenti.", "Good if the book speaks to independent professionals.")],
        ["Kindle Store > Libri > Economia, affari e finanza > Marketing", 68, reason("Da usare se le keyword confermano focus marketing.", "Use if keywords confirm a marketing focus.")],
      ],
    };
  }

  if (g.includes("thriller") || g.includes("crime") || g.includes("giallo")) {
    return {
      bisac: [
        ["FICTION / Thrillers / Suspense", 86, reason("Categoria principale per tensione e ritmo narrativo.", "Primary category for suspense-driven fiction.")],
        ["FICTION / Mystery & Detective / General", 76, reason("Secondaria se c'e' indagine o mistero centrale.", "Secondary fit when an investigation drives the story.")],
        ["FICTION / Crime", 70, reason("Valida se il conflitto ruota intorno a un crimine.", "Valid when the conflict centers on a crime.")],
      ],
      kdp: [
        ["Kindle Store > Libri > Thriller e suspense", 86, reason("Path KDP piu' coerente per lettori del genere.", "Most coherent KDP path for genre readers.")],
        ["Libri > Gialli e thriller > Suspense", 78, reason("Rafforza il posizionamento suspense.", "Strengthens suspense positioning.")],
        ["Kindle Store > Libri > Gialli e thriller > Investigatori", 66, reason("Usare se il protagonista indaga attivamente.", "Use if the protagonist actively investigates.")],
      ],
    };
  }

  if (g.includes("romance") || g.includes("romanz") || g.includes("love")) {
    return {
      bisac: [
        ["FICTION / Romance / Contemporary", 84, reason("Buona base per romance moderno.", "Good base for modern romance.")],
        ["FICTION / Romance / General", 78, reason("Categoria ampia da affiancare a una nicchia.", "Broad category to pair with a niche.")],
        ["FICTION / Women", 66, reason("Da valutare se tono e pubblico sono coerenti.", "Use when tone and audience fit.")],
      ],
      kdp: [
        ["Kindle Store > Libri > Romanzi rosa", 84, reason("Categoria naturale per romance.", "Natural category for romance.")],
        ["Libri > Letteratura e narrativa > Narrativa di genere", 72, reason("Aiuta se il libro ha forte impianto narrativo.", "Helps when the book has a strong fiction frame.")],
        ["Kindle Store > Libri > Romanzi rosa > Contemporanei", 70, reason("Preferibile per ambientazione moderna.", "Preferable for a modern setting.")],
      ],
    };
  }

  return {
    bisac: [
      ["NON-CLASSIFIABLE / General", 62, reason("Categoria provvisoria: rifinire quando genere e promessa sono piu' specifici.", "Temporary category: refine when genre and promise are clearer.")],
      ["LITERARY COLLECTIONS / General", 58, reason("Opzione ampia se il libro non e' manualistica pura.", "Broad option when the book is not purely practical nonfiction.")],
      ["LANGUAGE ARTS & DISCIPLINES / Writing / Authorship", 52, reason("Utile solo se il libro parla di scrittura o autorialita'.", "Useful only if the book is about writing or authorship.")],
    ],
    kdp: [
      ["Kindle Store > Libri > Letteratura e narrativa", 62, reason("Path generale da sostituire con una nicchia precisa.", "General path to replace with a precise niche.")],
      ["Libri > Letteratura e narrativa > Narrativa contemporanea", 58, reason("Valida se il libro e' narrativo e contemporaneo.", "Valid if the book is contemporary fiction.")],
      ["Kindle Store > Libri > Consultazione", 50, reason("Usare solo se il contenuto e' manualistico o guida.", "Use only if the content is a guide or reference book.")],
    ],
  };
}

function keywordItem(
  keyword: string,
  intent: KeywordIntent,
  strength: number,
  competitionRisk: KeywordRisk,
  why: string,
): KeywordGoldItem {
  return { keyword: normalizePhrase(keyword), intent, strength, competitionRisk, why };
}

function buildKeywordGoldFallback(input: KeywordGoldInput): KeywordGoldResult {
  const italian = isItalianLanguage(input.language);
  const title = normalizePhrase(input.title);
  const subtitle = normalizePhrase(input.subtitle || "");
  const genre = normalizePhrase(input.genre || (italian ? "Libro" : "Book"));
  const marketplace = normalizePhrase(input.marketplace || (italian ? "amazon.it" : "amazon.com"));
  const signals = extractSignalWords(input);
  const anchor = signals.slice(0, 2).join(" ") || genre.toLowerCase();
  const pack = categoryPack(genre, italian);
  const text = {
    whyBuyer: italian ? "Keyword orientata a lettori gia' vicini all'acquisto." : "Keyword aimed at readers already close to buying.",
    whyProblem: italian ? "Intercetta il problema/promessa dichiarata dal libro." : "Captures the book's stated problem or promise.",
    whyGenre: italian ? "Rende chiaro il genere per ricerca e browse." : "Clarifies genre for search and browse.",
    whyAudience: italian ? "Aiuta a qualificare il pubblico prima del click." : "Helps qualify the audience before the click.",
    whyBenefit: italian ? "Trasforma il tema in beneficio leggibile." : "Turns the theme into a reader-facing benefit.",
    fallback: italian
      ? "Analisi base locale: il motore cloud non ha risposto, quindi Scriptora ha generato una base sicura da rifinire."
      : "Local base analysis: the cloud engine did not respond, so Scriptora generated a safe draft to refine.",
  };

  const backendCandidates = italian
    ? [
        `${genre} pratico`,
        `${genre} kindle`,
        "trasformazione personale",
        "lettura motivazionale",
        "abitudini consapevoli",
        "guida pratica",
        "metodo passo passo",
        "crescita interiore",
      ]
    : [
        `practical ${genre}`,
        `${genre} kindle`,
        "personal transformation",
        "motivational reading",
        "mindful habits",
        "practical guide",
        "step by step method",
        "inner growth",
      ];

  const backendKeywords = uniqueKeywords(backendCandidates, 7);
  const goldSeeds = italian
    ? [
        keywordItem(`${anchor} libro`, "buyer", 82, "medium", text.whyBuyer),
        keywordItem(`${genre} kindle`, "genre", 78, "medium", text.whyGenre),
        keywordItem(`${anchor} guida pratica`, "benefit", 76, "medium", text.whyBenefit),
        keywordItem(`${anchor} metodo`, "benefit", 74, "medium", text.whyBenefit),
        keywordItem(`${anchor} per principianti`, "audience", 71, "low", text.whyAudience),
        keywordItem(`libro ${genre.toLowerCase()}`, "buyer", 70, "high", text.whyBuyer),
        keywordItem(`${anchor} esercizi`, "problem", 68, "low", text.whyProblem),
        keywordItem(`${anchor} trasformazione`, "benefit", 67, "medium", text.whyBenefit),
        keywordItem(`${genre} italiano`, "genre", 65, "medium", text.whyGenre),
        keywordItem(`${anchor} workbook`, "competitor-gap", 61, "low", text.whyBenefit),
      ]
    : [
        keywordItem(`${anchor} book`, "buyer", 82, "medium", text.whyBuyer),
        keywordItem(`${genre} kindle`, "genre", 78, "medium", text.whyGenre),
        keywordItem(`${anchor} practical guide`, "benefit", 76, "medium", text.whyBenefit),
        keywordItem(`${anchor} method`, "benefit", 74, "medium", text.whyBenefit),
        keywordItem(`${anchor} for beginners`, "audience", 71, "low", text.whyAudience),
        keywordItem(`${genre} book`, "buyer", 70, "high", text.whyBuyer),
        keywordItem(`${anchor} exercises`, "problem", 68, "low", text.whyProblem),
        keywordItem(`${anchor} transformation`, "benefit", 67, "medium", text.whyBenefit),
        keywordItem(`${genre} guide`, "genre", 65, "medium", text.whyGenre),
        keywordItem(`${anchor} workbook`, "competitor-gap", 61, "low", text.whyBenefit),
      ];

  return {
    marketplace,
    title,
    subtitle,
    bisacCategories: pack.bisac.map(([path, confidence, reason]) => ({
      path: String(path),
      confidence: Number(confidence),
      reason: String(reason),
    })),
    kdpBrowseCategories: pack.kdp.map(([path, confidence, reason]) => ({
      path: String(path),
      confidence: Number(confidence),
      reason: String(reason),
    })),
    backendKeywords,
    goldKeywords: uniqueKeywords(goldSeeds.map((item) => item.keyword), 10).map((keyword) => {
      return goldSeeds.find((item) => item.keyword.toLowerCase() === keyword.toLowerCase()) || keywordItem(keyword, "benefit", 60, "medium", text.whyBenefit);
    }),
    negativeKeywords: italian
      ? ["gratis", "pdf pirata", "riassunto", "usato", "download illegale", "soluzione miracolosa"]
      : ["free", "pirated pdf", "summary", "used", "illegal download", "miracle cure"],
    positioning: italian
      ? {
          mainAudience: `Lettori interessati a ${genre.toLowerCase()} che cercano un risultato concreto e leggibile.`,
          commercialPromise: subtitle || `Una guida chiara per trasformare il tema "${anchor}" in un percorso pratico.`,
          strongestAngle: `Posizionare il libro come metodo pratico, non come promessa generica.`,
          saturationWarning: `Evita keyword troppo larghe: aggiungi benefici specifici, pubblico e formato.`,
        }
      : {
          mainAudience: `Readers interested in ${genre.toLowerCase()} who want a concrete, readable outcome.`,
          commercialPromise: subtitle || `A clear guide that turns "${anchor}" into a practical path.`,
          strongestAngle: `Position the book as a practical method, not a generic promise.`,
          saturationWarning: `Avoid overly broad keywords: add specific benefits, audience, and format.`,
        },
    finalChecklist: italian
      ? [
          "Controlla che le backend keyword non ripetano titolo o sottotitolo.",
          "Scegli 2 categorie finali e tieni le altre come alternative per test futuri.",
          "Inserisci le keyword principali in descrizione e sottotitolo solo se naturali.",
          "Evita claim medici, promesse garantite o nomi di autori concorrenti.",
          "Dopo pubblicazione, misura impression, click e conversione prima di cambiare tutto.",
        ]
      : [
          "Check that backend keywords do not repeat title or subtitle.",
          "Pick 2 final categories and keep the others as future test alternatives.",
          "Use main keywords in description and subtitle only when natural.",
          "Avoid medical claims, guaranteed promises, or competitor author names.",
          "After publishing, measure impressions, clicks, and conversion before changing everything.",
        ],
    groundingUsed: false,
    groundingProvider: null,
    groundingResultsCount: 0,
    groundingQuery: null,
    analyzedAt: new Date().toISOString(),
    fallbackReason: text.fallback,
  };
}

/* ============ Public API ============ */

export async function analyzeMarket(
  idea: string,
  opts: { genre?: string; language?: string; plan: PlanTier },
): Promise<MarketAnalysis> {
  return invoke<MarketAnalysis>(
    { kind: "analyzeMarket", idea, genre: opts.genre, language: opts.language },
    opts.plan,
  );
}

export async function predictSuccess(book: BookData, plan: PlanTier): Promise<SuccessPrediction> {
  return invoke<SuccessPrediction>({ kind: "predictSuccess", book }, plan);
}

export async function generateTitleVariants(
  idea: string,
  opts: {
    genre?: string;
    language?: string;
    plan: PlanTier;
    subNiche?: string;
    recommendedAngle?: string;
    keywords?: string[];
  },
): Promise<TitleVariants> {
  return invoke<TitleVariants>(
    {
      kind: "generateTitleVariants",
      idea,
      genre: opts.genre,
      language: opts.language,
      subNiche: opts.subNiche,
      recommendedAngle: opts.recommendedAngle,
      keywords: opts.keywords,
    },
    opts.plan,
  );
}

export async function coverIntelligence(
  opts: { genre: string; mood?: string; language?: string; plan: PlanTier },
): Promise<CoverIntelligence> {
  return invoke<CoverIntelligence>(
    { kind: "coverIntelligence", genre: opts.genre, mood: opts.mood, language: opts.language },
    opts.plan,
  );
}

export async function kdpPackaging(book: BookData, plan: PlanTier): Promise<KDPPackaging> {
  return invoke<KDPPackaging>({ kind: "kdpPackaging", book }, plan);
}

export async function dominateTitles(
  input: DominateTitlesInput,
  plan: PlanTier,
): Promise<TitleDominationResult> {
  return invoke<TitleDominationResult>({ kind: "dominateTitles", ...input }, plan);
}

export async function keywordGold(
  input: KeywordGoldInput,
  plan: PlanTier,
): Promise<KeywordGoldResult> {
  try {
    return await withTimeout(
      invoke<KeywordGoldResult>({ kind: "keywordGold", ...input }, plan),
      KEYWORD_FALLBACK_TIMEOUT_MS,
      "Keyword Gold cloud timeout",
    );
  } catch (error) {
    console.warn("[keyword-gold] cloud analysis unavailable; using local base analysis", error);
    return buildKeywordGoldFallback(input);
  }
}

export async function fetchTrendingNiches(
  input: TrendingNichesInput,
  plan: PlanTier,
): Promise<TrendingNichesResult> {
  return invoke<TrendingNichesResult>({ kind: "trendingNiches", ...input }, plan);
}

/* ============ UX score helpers ============ */

export function bestsellerProbabilityLabel(score: number): { label: string; tone: "low" | "mid" | "high" } {
  if (score >= 80) return { label: "Bestseller potential 🔥", tone: "high" };
  if (score >= 60) return { label: "Solid product", tone: "mid" };
  return { label: "Needs sharpening", tone: "low" };
}

export function profitabilityLabel(score: number): { label: string; tone: "low" | "mid" | "high" } {
  if (score >= 8) return { label: "High profitability", tone: "high" };
  if (score >= 5.5) return { label: "Decent margin", tone: "mid" };
  return { label: "Low margin niche", tone: "low" };
}
