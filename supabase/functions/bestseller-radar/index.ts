import { estimateTokens, logAIUsage } from "../_shared/ai-tracking.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RadarBook = {
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

function safeJsonParse(text: string) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

async function searchBrave(apiKey: string, query: string) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("country", "IT");
  url.searchParams.set("search_lang", "it");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Brave error ${res.status}: ${txt.slice(0, 300)}`);
  }

  return await res.json();
}

async function callDeepSeek(apiKey: string, payload: unknown) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`DeepSeek error ${res.status}: ${text.slice(0, 300)}`);
  }

  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    const BRAVE_SEARCH_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");

    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");
    if (!BRAVE_SEARCH_API_KEY) throw new Error("BRAVE_SEARCH_API_KEY not configured");

    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["bestseller-radar"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody);
    const genre = String(body.genre || "romance");
    const keyword = String(body.keyword || "").trim();
    const marketplace = String(body.marketplace || "Amazon.it");
    const userId = guard.userId;
    const projectId = body.projectId ? String(body.projectId) : null;

    const query = `${marketplace} bestseller libri ${genre} ${keyword}`.trim();
    const brave = await searchBrave(BRAVE_SEARCH_API_KEY, query);

    const webResults = (brave?.web?.results || []).slice(0, 8).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));

    const system = `
Sei Bestseller Radar di Scriptora.
Analizzi segnali pubblici di mercato editoriale.
Non inventare dati ufficiali Amazon.
Non dichiarare vendite certe.
Restituisci SOLO JSON valido.
`;

    const user = `
Genere: ${genre}
Keyword: ${keyword || "nessuna"}
Marketplace: ${marketplace}

Risultati web pubblici:
${JSON.stringify(webResults, null, 2)}

Crea una lista di 4-6 libri/competitor o titoli plausibilmente rilevanti dai risultati.
Per ogni item restituisci:
title, author, category, price, rating, reviews, demand, competition, potential, insight, sourceUrl, coverUrl.

Regole:
- demand: Alta/Media/Bassa
- competition: Alta/Media/Bassa
- potential: numero 1-10
- price/rating/reviews possono essere "Non rilevato" se non presenti
- insight in italiano, breve, utile e commerciale
- sourceUrl se disponibile
- coverUrl solo se dai risultati pubblici emerge una thumbnail o immagine affidabile, altrimenti stringa vuota
- Non dire mai che sono dati ufficiali Amazon.
Formato:
{
  "marketScore": 7.4,
  "summary": "stringa breve",
  "results": []
}
`;

    const ai = await callDeepSeek(DEEPSEEK_API_KEY, {
      model: "deepseek-chat",
      temperature: 0.25,
      max_tokens: 2200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = ai?.choices?.[0]?.message?.content || "{}";
    const usage = ai?.usage || {};
    const promptText = `${system}\n${user}`;
    const promptTokens = typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : estimateTokens(promptText);
    const completionTokens = typeof usage.completion_tokens === "number" ? usage.completion_tokens : estimateTokens(content);
    logAIUsage({
      provider: "deepseek",
      model: "deepseek-chat",
      taskType: "bestseller_radar",
      promptTokens,
      completionTokens,
      promptCacheHitTokens: typeof usage.prompt_cache_hit_tokens === "number" ? usage.prompt_cache_hit_tokens : 0,
      promptCacheMissTokens: typeof usage.prompt_cache_miss_tokens === "number" ? usage.prompt_cache_miss_tokens : promptTokens,
      projectId,
      userId,
      metadata: { genre, keyword, marketplace },
    });
    const parsed = safeJsonParse(content);

    const results: RadarBook[] = Array.isArray(parsed.results) ? parsed.results : [];

    return new Response(JSON.stringify({
      ok: true,
      query,
      marketScore: parsed.marketScore ?? null,
      summary: parsed.summary ?? "",
      results,
      disclaimer:
        "I dati mostrati sono elaborazioni generate da Scriptora AI su segnali pubblici e non rappresentano dati ufficiali né verificabili provenienti da Amazon.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[bestseller-radar]", error);
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "Errore sconosciuto",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
