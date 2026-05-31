import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/storageService";
import { t } from "@/lib/i18n";
import type { MarketDataStatus } from "@/lib/market-intelligence/marketDataStatus";

export type Level = "low" | "medium" | "high";

export interface TitleCard {
  title: string;
  subtitle: string;
  subNiche?: string;
  conversionScore: number;
  opportunityScore: number;
  demandLevel: Level;
  competitionLevel: Level;
  rationale: string;
}

export interface SubNiche {
  name: string;
  demandLevel: Level;
  competitionLevel: Level;
  opportunityScore: number;
  rationale: string;
}

export interface KeywordIntel {
  keyword: string;
  demand: Level;
  competition: Level;
}

export interface MarketSnapshot {
  platformsAnalyzed: string[];
  topSubNiches: SubNiche[];
  marketInsight: string;
}

export interface TitleIntelligenceResult {
  marketSnapshot: MarketSnapshot;
  topTitles: TitleCard[];
  shadowTitles: TitleCard[];
  coreKeywords: KeywordIntel[];
  /** Present when editorial fallback was used instead of live edge analysis. */
  fallbackReason?: string;
  dataStatus?: MarketDataStatus;
}

export interface TitleIntelligenceInput {
  bookTitle?: string;
  bookGenre: string;
  targetAudience: string;
  bookPromise: string;
  tone?: "professionale" | "emotivo" | "aggressivo";
  language?: string;
  genreProfile?: any;
}

function isItalian(language?: string): boolean {
  const normalized = String(language || "").trim().toLowerCase();
  return normalized.startsWith("it") || normalized.includes("ital");
}

function titleCard(
  title: string,
  subtitle: string,
  subNiche: string,
  conversionScore: number,
  opportunityScore: number,
  demandLevel: Level,
  competitionLevel: Level,
  rationale: string,
): TitleCard {
  return { title, subtitle, subNiche, conversionScore, opportunityScore, demandLevel, competitionLevel, rationale };
}

function buildTitleIntelligenceFallback(input: TitleIntelligenceInput): TitleIntelligenceResult {
  const italian = isItalian(input.language);
  const genre = input.bookGenre?.trim() || (italian ? "Self-help" : "Self-help");
  const audience = input.targetAudience?.trim() || (italian ? "lettori motivati ma bloccati" : "motivated but stuck readers");
  const promise = input.bookPromise?.trim() || (italian ? "ottenere un risultato concreto con un metodo semplice" : "get a concrete result with a simple method");
  const baseNiche = italian ? `${genre} pratico` : `practical ${genre}`;

  const topTitles = italian
    ? [
        titleCard("Il Metodo dei 30 Giorni", `Una guida pratica per ${promise}`, baseNiche, 88, 86, "high", "medium", "Titolo chiaro, promessa misurabile e sottotitolo orientato al risultato."),
        titleCard("Basta Rimandare", `Piccole azioni quotidiane per passare dal blocco al progresso`, "anti-procrastinazione", 86, 84, "high", "medium", "Aggancia un problema forte e lo trasforma in percorso operativo."),
        titleCard("Focus Senza Burnout", `Ritrova energia e controllo con un sistema sostenibile`, "anti-burnout", 84, 83, "high", "low", "Unisce beneficio emotivo e posizionamento moderno."),
        titleCard("Meno Caos, Piu' Azione", `Il percorso semplice per decidere cosa conta e farlo davvero`, "produttivita' essenziale", 82, 80, "medium", "low", "Promessa concreta e differenziante rispetto ai titoli motivazionali generici."),
        titleCard("Piccoli Passi, Risultati Veri", `Workbook guidato per trasformare intenzioni in progressi misurabili`, "workbook guidato", 80, 78, "medium", "medium", "Formato workbook utile per conversione e aspettativa pratica."),
      ]
    : [
        titleCard("The 30-Day Method", `A practical guide to ${promise}`, baseNiche, 88, 86, "high", "medium", "Clear title, measurable promise and result-oriented subtitle."),
        titleCard("Stop Putting It Off", `Daily micro-actions to move from stuck to steady progress`, "anti-procrastination", 86, 84, "high", "medium", "Hooks a strong problem and turns it into an operational path."),
        titleCard("Focus Without Burnout", `Regain energy and control with a sustainable system`, "anti-burnout", 84, 83, "high", "low", "Combines emotional benefit with modern positioning."),
        titleCard("Less Chaos, More Action", `A simple path to decide what matters and actually do it`, "essential productivity", 82, 80, "medium", "low", "Concrete promise, more differentiated than generic motivational titles."),
        titleCard("Small Steps, Real Results", `A guided workbook to turn intention into measurable progress`, "guided workbook", 80, 78, "medium", "medium", "Workbook framing helps conversion and practical expectation."),
      ];

  const shadowTitles = italian
    ? [
        titleCard("Zero Scuse Pratiche", `Taglia distrazioni e autosabotaggio con un metodo quotidiano`, "azione diretta", 79, 75, "medium", "high", "Variante commerciale piu' aggressiva: funziona se il tono del libro la sostiene."),
        titleCard("Smetti di Trattarti da Nemico", `Una strategia gentile per ritrovare disciplina, focus e fiducia`, "disciplina gentile", 81, 77, "medium", "medium", "Piu' emotivo, utile se il pubblico risponde a un hook personale."),
      ]
    : [
        titleCard("Practical Zero Excuses", `Cut distraction and self-sabotage with a daily method`, "direct action", 79, 75, "medium", "high", "More aggressive commercial variant; works if the book tone supports it."),
        titleCard("Stop Fighting Yourself", `A gentle strategy to regain discipline, focus and trust`, "gentle discipline", 81, 77, "medium", "medium", "More emotional angle for readers who respond to a personal hook."),
      ];

  return {
    fallbackReason: t("title_intel_estimated_microcopy"),
    dataStatus: "estimated",
    marketSnapshot: {
      platformsAnalyzed: ["Amazon KDP", "Apple Books"],
      topSubNiches: [
        {
          name: baseNiche,
          demandLevel: "high",
          competitionLevel: "medium",
          opportunityScore: 84,
          rationale: italian
            ? `Buona aderenza tra promessa, pubblico (${audience}) e bisogno pratico.`
            : `Good fit between promise, audience (${audience}) and practical need.`,
        },
        {
          name: italian ? "workbook guidato" : "guided workbook",
          demandLevel: "medium",
          competitionLevel: "low",
          opportunityScore: 80,
          rationale: italian
            ? "Formato operativo meno generico e piu' facile da posizionare."
            : "Operational format is less generic and easier to position.",
        },
        {
          name: italian ? "anti-burnout pratico" : "practical anti-burnout",
          demandLevel: "high",
          competitionLevel: "medium",
          opportunityScore: 78,
          rationale: italian
            ? "Intercetta un dolore attuale con promessa concreta."
            : "Targets a timely pain point with a concrete promise.",
        },
      ],
      marketInsight: italian
        ? "I titoli piu' forti comunicano metodo, pubblico e risultato. Evita promesse generiche e porta la promessa dentro un meccanismo leggibile."
        : "The strongest titles communicate method, audience and outcome. Avoid generic promises and make the mechanism readable.",
    },
    topTitles,
    shadowTitles,
    coreKeywords: [
      { keyword: genre.toLowerCase(), demand: "high", competition: "medium" },
      { keyword: italian ? "metodo pratico" : "practical method", demand: "high", competition: "medium" },
      { keyword: italian ? "30 giorni" : "30 days", demand: "medium", competition: "medium" },
      { keyword: italian ? "workbook" : "workbook", demand: "medium", competition: "low" },
      { keyword: italian ? "focus" : "focus", demand: "high", competition: "high" },
      { keyword: italian ? "anti burnout" : "anti burnout", demand: "medium", competition: "low" },
    ],
  };
}

export function useTitleIntelligence() {
  const [data, setData] = useState<TitleIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<TitleIntelligenceInput | null>(null);

  const generate = useCallback(async (input: TitleIntelligenceInput, regenerate = false) => {
    setLoading(true);
    setError(null);
    if (!regenerate) setData(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("title-intelligence", {
        body: { ...input, regenerate, userId: getCurrentUserId() },
      });
      if (err) throw new Error(err.message);
      if ((res as any)?.error) throw new Error((res as any).error);
      const live = { ...(res as TitleIntelligenceResult), dataStatus: "live" as const };
      setData(live);
      setLastInput(input);
      return live;
    } catch (e: any) {
      console.warn("[title-intelligence] cloud analysis unavailable; using local base analysis", e);
      const fallback = buildTitleIntelligenceFallback(input);
      setData(fallback);
      setLastInput(input);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  const regenerate = useCallback(async () => {
    if (!lastInput) return null;
    return generate(lastInput, true);
  }, [lastInput, generate]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLastInput(null);
  }, []);

  return { data, loading, error, generate, regenerate, reset, hasInput: !!lastInput };
}
