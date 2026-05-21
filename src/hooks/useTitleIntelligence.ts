import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/storageService";

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
      setData(res as TitleIntelligenceResult);
      setLastInput(input);
      return res as TitleIntelligenceResult;
    } catch (e: any) {
      const msg = e?.message || "Generation failed";
      setError(msg);
      throw e;
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
