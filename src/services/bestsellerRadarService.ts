import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/storageService";
import { requireCredits } from "@/lib/billing";

export type RadarResult = {
  title: string;
  author: string;
  category: string;
  price: string;
  rating: string;
  reviews: string;
  demand: "Alta" | "Media" | "Bassa";
  competition: "Alta" | "Media" | "Bassa";
  potential: number;
  insight: string;
  sourceUrl?: string;
  coverUrl?: string;
};

export type BestsellerRadarResponse = {
  ok: boolean;
  query?: string;
  marketScore?: number | null;
  summary?: string;
  results?: RadarResult[];
  disclaimer?: string;
  error?: string;
};

export async function runBestsellerRadar(payload: {
  genre: string;
  keyword?: string;
  marketplace?: string;
}): Promise<BestsellerRadarResponse> {
  requireCredits("market_intelligence", { source: "bestseller_radar", genre: payload.genre });
  const { data, error } = await supabase.functions.invoke("bestseller-radar", {
    body: { ...payload, userId: getCurrentUserId() },
  });

  if (error) {
    throw new Error(error.message || "Bestseller Radar non disponibile");
  }

  return data as BestsellerRadarResponse;
}
