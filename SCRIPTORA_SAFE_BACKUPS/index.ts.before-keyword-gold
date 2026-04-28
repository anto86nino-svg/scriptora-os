import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Plan = "free" | "beta" | "pro" | "premium";

interface ToolCallPayload {
  action: string;
  payload: Record<string, unknown>;
  plan?: Plan;
}

// ============ AI helpers (DeepSeek) ============

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const BRAVE_SEARCH_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY"); // optional web grounding

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

/**
 * Call DeepSeek with strict JSON output via OpenAI-compatible tool calling.
 * Forces a single tool call matching `schema` so the model returns structured data.
 */
async function callAIJson(systemPrompt: string, userPrompt: string, schemaName: string, schema: any): Promise<any> {
  if (!DEEPSEEK_API_KEY) throw new Error("DeepSeek API key missing");

  console.log(`[deepseek] request started — schema="${schemaName}"`);
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: schemaName,
          description: "Return structured KDP analysis",
          parameters: schema,
        },
      }],
      tool_choice: { type: "function", function: { name: schemaName } },
      temperature: 0.4,
      max_tokens: 8000,
    }),
  });

  console.log(`[deepseek] status ${res.status}`);
  if (res.status === 429) throw new Error("DeepSeek rate limited. Please retry shortly.");
  if (res.status === 401) throw new Error("DeepSeek authentication failed (check DEEPSEEK_API_KEY).");
  if (res.status === 402) throw new Error("DeepSeek credits exhausted.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`DeepSeek error ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  const finishReason = data?.choices?.[0]?.finish_reason;
  const args = msg?.tool_calls?.[0]?.function?.arguments;
  if (args) {
    if (typeof args !== "string") return args;
    try {
      return JSON.parse(args);
    } catch (e) {
      console.warn(`[deepseek] JSON parse failed (finish=${finishReason}, len=${args.length}). Attempting repair…`);
      const repaired = tryRepairJson(args);
      if (repaired) return repaired;
      throw new Error(`DeepSeek returned truncated/invalid JSON (finish_reason=${finishReason})`);
    }
  }
  if (typeof msg?.content === "string") {
    try { return JSON.parse(msg.content); } catch { /* fallthrough */ }
  }
  throw new Error("DeepSeek returned no structured output");
}

/** Best-effort repair of a truncated JSON string from a tool call. */
function tryRepairJson(s: string): any | null {
  // Strip everything after the last balanced closing brace.
  // First, naive attempt: try cumulative parse from the end going back.
  for (let i = s.length; i > 100; i--) {
    const slice = s.slice(0, i);
    // Try closing open arrays/objects.
    const opens = (slice.match(/[{[]/g) || []).length;
    const closes = (slice.match(/[}\]]/g) || []).length;
    const diff = opens - closes;
    if (diff < 0) continue;
    let candidate = slice;
    // Trim trailing comma + incomplete key/value.
    candidate = candidate.replace(/,\s*"[^"]*"?\s*:?\s*[^,{}\[\]]*$/, "");
    candidate = candidate.replace(/,\s*$/, "");
    // Append needed closers (assume arrays when last open was '[' else object).
    const stack: string[] = [];
    for (const ch of candidate) {
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    candidate += stack.reverse().join("");
    try { return JSON.parse(candidate); } catch { /* keep trying shorter */ }
    if (i % 200 !== 0) i -= 50; // skip ahead
  }
  return null;
}

/**
 * Brave Search grounding — fetches top web results to inform the AI about
 * real-world demand/competition signals. Falls back to null silently.
 */
async function braveGrounding(query: string): Promise<string | null> {
  if (!BRAVE_SEARCH_API_KEY) {
    console.log("[brave] skipped — BRAVE_SEARCH_API_KEY not configured");
    return null;
  }
  const safeQuery = query.slice(0, 120);
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "8");
    url.searchParams.set("safesearch", "moderate");
    console.log(`[brave] → request q="${safeQuery}"`);
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_SEARCH_API_KEY,
      },
    });
    console.log(`[brave] ← status ${res.status}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[brave] failed ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const results: any[] = data?.web?.results ?? [];
    console.log(`[brave] ✓ ${results.length} results for "${safeQuery}"`);
    if (!results.length) return null;
    const lines = results.slice(0, 8).map((r, i) => {
      const title = (r.title ?? "").trim();
      const desc = (r.description ?? "").replace(/<[^>]+>/g, "").trim();
      const u = r.url ?? "";
      return `${i + 1}. ${title} — ${desc} (${u})`;
    });
    return lines.join("\n");
  } catch (e) {
    console.warn("[brave] error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ============ Schemas ============

const MARKET_SCHEMA = {
  type: "object",
  properties: {
    nicheScore: { type: "number", minimum: 0, maximum: 10 },
    demandLevel: { type: "string", enum: ["low", "medium", "high"] },
    competitionLevel: { type: "string", enum: ["low", "medium", "high"] },
    profitabilityScore: { type: "number", minimum: 0, maximum: 10 },
    recommendedAngle: { type: "string" },
    subNiche: { type: "string" },
    reasoning: { type: "string" },
  },
  required: ["nicheScore", "demandLevel", "competitionLevel", "profitabilityScore", "recommendedAngle"],
  additionalProperties: false,
};

const SUCCESS_SCHEMA = {
  type: "object",
  properties: {
    successScore: { type: "number", minimum: 0, maximum: 100 },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
  },
  required: ["successScore", "strengths", "weaknesses", "improvements"],
  additionalProperties: false,
};

const TITLE_SCHEMA = {
  type: "object",
  properties: {
    titles: { type: "array", items: { type: "string" }, minItems: 10, maxItems: 20 },
    subtitles: { type: "array", items: { type: "string" }, minItems: 10, maxItems: 20 },
    topPicks: {
      type: "array",
      minItems: 3, maxItems: 3,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          reason: { type: "string" },
        },
        required: ["title", "subtitle", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["titles", "subtitles", "topPicks"],
  additionalProperties: false,
};

const COVER_SCHEMA = {
  type: "object",
  properties: {
    visualStyle: { type: "string" },
    palette: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    fonts: {
      type: "object",
      properties: { heading: { type: "string" }, body: { type: "string" } },
      required: ["heading", "body"],
      additionalProperties: false,
    },
    mood: { type: "string" },
    composition: { type: "string" },
  },
  required: ["visualStyle", "palette", "fonts", "mood", "composition"],
  additionalProperties: false,
};

const PACKAGING_SCHEMA = {
  type: "object",
  properties: {
    amazonDescription: { type: "string" },
    backendKeywords: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 7 },
    categories: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
    bulletPoints: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
  },
  required: ["amazonDescription", "backendKeywords", "categories", "bulletPoints"],
  additionalProperties: false,
};

const TRENDING_NICHES_SCHEMA = {
  type: "object",
  properties: {
    marketOverview: { type: "string" },
    niches: {
      type: "array",
      minItems: 8, maxItems: 12,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          parentGenre: { type: "string" },
          marketplace: { type: "string", enum: ["amazon.com", "amazon.it", "apple-books", "cross-market"] },
          demandLevel: { type: "string", enum: ["low", "medium", "high"] },
          competitionLevel: { type: "string", enum: ["low", "medium", "high"] },
          opportunityScore: { type: "number", minimum: 0, maximum: 100 },
          trendDirection: { type: "string", enum: ["rising", "stable", "declining"] },
          dominantPromise: { type: "string" },
          targetReader: { type: "string" },
          suggestedAngle: { type: "string" },
          dominantKeywords: { type: "array", items: { type: "string" }, maxItems: 6 },
          whyItMatters: { type: "string" },
          saturationRisk: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["name", "parentGenre", "marketplace", "demandLevel", "competitionLevel", "opportunityScore", "trendDirection", "dominantPromise", "targetReader", "suggestedAngle", "dominantKeywords", "whyItMatters", "saturationRisk"],
        additionalProperties: false,
      },
    },
  },
  required: ["marketOverview", "niches"],
  additionalProperties: false,
};

const TITLE_DOMINATION_SCHEMA = {
  type: "object",
  properties: {
    marketSignals: {
      type: "object",
      properties: {
        dominantKeywords:   { type: "array", items: { type: "string" } },
        recurringPromises:  { type: "array", items: { type: "string" } },
        competitorPatterns: { type: "array", items: { type: "string" } },
        saturatedAngles:    { type: "array", items: { type: "string" } },
        openAngles:         { type: "array", items: { type: "string" } },
        readerPainPoints:   { type: "array", items: { type: "string" } },
        emotionalTriggers:  { type: "array", items: { type: "string" } },
      },
      required: ["dominantKeywords","recurringPromises","competitorPatterns","saturatedAngles","openAngles","readerPainPoints","emotionalTriggers"],
      additionalProperties: false,
    },
    competitorInsights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titleSignal:  { type: "string" },
          source:       { type: "string" },
          whyItMatters: { type: "string" },
          riskLevel:    { type: "string", enum: ["low","medium","high"] },
        },
        required: ["titleSignal","source","whyItMatters","riskLevel"],
        additionalProperties: false,
      },
    },
    titleCandidates: {
      type: "array",
      minItems: 10,
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          title:                 { type: "string" },
          subtitle:              { type: "string" },
          positioning:           { type: "string" },
          targetReader:          { type: "string" },
          mainKeyword:           { type: "string" },
          secondaryKeywords:     { type: "array", items: { type: "string" } },
          emotionalHook:         { type: "string" },
          commercialPromise:     { type: "string" },
          differentiationAngle:  { type: "string" },
          kdpScore:              { type: "number", minimum: 0, maximum: 100 },
          clarityScore:          { type: "number", minimum: 0, maximum: 100 },
          emotionScore:          { type: "number", minimum: 0, maximum: 100 },
          keywordScore:          { type: "number", minimum: 0, maximum: 100 },
          originalityScore:      { type: "number", minimum: 0, maximum: 100 },
          saturationRisk:        { type: "string", enum: ["low","medium","high"] },
          whyItCanSell:          { type: "string" },
          weakness:              { type: "string" },
          improvementSuggestion: { type: "string" },
        },
        required: ["title","subtitle","positioning","targetReader","mainKeyword","secondaryKeywords","emotionalHook","commercialPromise","differentiationAngle","kdpScore","clarityScore","emotionScore","keywordScore","originalityScore","saturationRisk","whyItCanSell","weakness","improvementSuggestion"],
        additionalProperties: false,
      },
    },
    winner: {
      type: "object",
      properties: {
        title:            { type: "string" },
        subtitle:         { type: "string" },
        reason:           { type: "string" },
        bestMarketplace:  { type: "string" },
        finalScore:       { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["title","subtitle","reason","bestMarketplace","finalScore"],
      additionalProperties: false,
    },
    nextActions: { type: "array", items: { type: "string" } },
  },
  required: ["marketSignals","competitorInsights","titleCandidates","winner","nextActions"],
  additionalProperties: false,
};

// ============ Handlers ============

/** Build a grounding meta object consistently across handlers. */
function groundingMeta(query: string | null, raw: string | null) {
  const count = raw ? raw.split("\n").filter((l) => l.trim().length > 0).length : 0;
  return {
    groundingUsed: Boolean(raw),
    groundingProvider: raw ? ("brave" as const) : null,
    groundingResultsCount: count,
    groundingQuery: raw ? query : null,
    analyzedAt: new Date().toISOString(),
  };
}

async function handleAnalyzeMarket(p: any) {
  const { idea, genre, language } = p;
  const primary = [idea, genre, "amazon kdp bestsellers"].filter(Boolean).join(" ");
  let grounding = await braveGrounding(primary);
  let usedQuery = primary;
  if (!grounding) {
    const fallback = [idea, "best selling books"].filter(Boolean).join(" ");
    if (fallback !== primary) {
      grounding = await braveGrounding(fallback);
      if (grounding) usedQuery = fallback;
    }
  }
  console.log(`[brave] action="analyzeMarket" used=${Boolean(grounding)}`);
  const sys = `You are a senior Amazon KDP market analyst. Score honestly. Penalize overcrowded niches.`;
  const usr =
    `Idea: ${idea}\nGenre: ${genre || "any"}\nLanguage: ${language || "English"}\n` +
    (grounding ? `\nLive web search results (Brave):\n${grounding}\n` : "") +
    `\nReturn nicheScore, demand/competition levels, profitabilityScore, recommendedAngle (1 sentence) and subNiche.`;
  const out = await callAIJson(sys, usr, "market_analysis", MARKET_SCHEMA);
  return { ...out, ...groundingMeta(usedQuery, grounding) };
}

async function handlePredictSuccess(p: any) {
  const { book } = p;
  const sys = `You are a KDP bestseller prediction engine. Be brutally honest. successScore = realistic launch potential 0-100.`;
  const usr = `Book data:\n${JSON.stringify(book, null, 2)}\n\nReturn successScore + concrete strengths/weaknesses/improvements (3-5 each).`;
  return await callAIJson(sys, usr, "success_prediction", SUCCESS_SCHEMA);
}

async function handleTitleVariants(p: any) {
  const { idea, genre, language, subNiche, recommendedAngle, keywords } = p;
  // Build a Brave query enriched with niche signals.
  const queryParts = [
    idea,
    subNiche,
    recommendedAngle,
    genre,
    Array.isArray(keywords) ? keywords.slice(0, 3).join(" ") : "",
    "amazon bestseller book title",
  ].filter(Boolean);
  const primary = queryParts.join(" ");
  let grounding = await braveGrounding(primary);
  let usedQuery = primary;
  if (!grounding) {
    const fallback = [idea, genre, "best selling book"].filter(Boolean).join(" ");
    if (fallback !== primary) {
      grounding = await braveGrounding(fallback);
      if (grounding) usedQuery = fallback;
    }
  }
  console.log(`[brave] action="generateTitleVariants" used=${Boolean(grounding)}`);

  const sys = `You generate sellable Amazon KDP titles. Concrete, benefit-driven, scannable. Avoid poetic. Use real-market signals when provided to differentiate from saturated patterns.`;
  const usr =
    `Idea: ${idea}\nGenre: ${genre || "any"}\nLanguage: ${language || "English"}\n` +
    (subNiche ? `Sub-niche: ${subNiche}\n` : "") +
    (recommendedAngle ? `Recommended angle: ${recommendedAngle}\n` : "") +
    (grounding ? `\nReal Amazon/web competitor signals (Brave):\n${grounding}\n` : "") +
    `\nReturn 15 title candidates (3-8 words), 15 subtitle candidates (8-15 words, concrete benefit + timeframe/mechanism), ` +
    `and the 3 top combinations with one-sentence reasoning. Differentiate from saturated competitor patterns above.`;
  const out = await callAIJson(sys, usr, "title_variants", TITLE_SCHEMA);
  return { ...out, ...groundingMeta(usedQuery, grounding) };
}

async function handleCoverIntelligence(p: any) {
  const { genre, mood, language } = p;
  const sys = `You are a KDP cover art director. Recommend palette/fonts/mood proven to sell in the genre.`;
  const usr = `Genre: ${genre}\nMood hint: ${mood || "default for genre"}\nLanguage: ${language || "English"}\n\nReturn palette as 4-5 hex codes, font pair (heading + body), mood + composition.`;
  return await callAIJson(sys, usr, "cover_intelligence", COVER_SCHEMA);
}

async function handlePackaging(p: any) {
  const { book } = p;
  const title = book?.title || "";
  const genre = book?.genre || "";
  const promise = book?.promise || "";
  // Brave query: competitor + pain points + reader signals.
  const primary = [title, genre, promise, "amazon book reviews readers"].filter(Boolean).join(" ");
  let grounding = await braveGrounding(primary);
  let usedQuery = primary;
  if (!grounding) {
    const fallback = [title || promise, genre, "amazon book"].filter(Boolean).join(" ");
    if (fallback && fallback !== primary) {
      grounding = await braveGrounding(fallback);
      if (grounding) usedQuery = fallback;
    }
  }
  console.log(`[brave] action="generatePackaging" used=${Boolean(grounding)}`);

  const sys = `You write Amazon KDP packaging that converts. Description = HTML-light (use \\n and <br>). Keywords follow KDP rules: 7 max, no comma overlap with title. When real competitor signals are provided, exploit gaps and avoid saturated phrasing.`;
  const usr =
    `Book:\n${JSON.stringify(book, null, 2)}\n` +
    (grounding ? `\nReal competitor / reader pain-point signals (Brave):\n${grounding}\n` : "") +
    `\nReturn Amazon description (200-300 words, hook → benefits → proof → CTA), 5-7 backend keywords, ` +
    `2-3 KDP browse categories, 4-6 sales bullets. Lean into differentiation from competitors above when present.`;
  const out = await callAIJson(sys, usr, "kdp_packaging", PACKAGING_SCHEMA);
  return { ...out, ...groundingMeta(usedQuery, grounding) };
}

/**
 * Brave multi-query: parallel targeted Brave searches, dedupes results.
 */
async function braveMultiQuery(
  queries: string[],
): Promise<{
  results: Array<{ title: string; url: string; description: string; source: string; query: string }>;
  text: string;
  usedQueries: string[];
}> {
  const unique = Array.from(new Set(queries.filter(Boolean))).slice(0, 8);
  if (!BRAVE_SEARCH_API_KEY || unique.length === 0) {
    return { results: [], text: "", usedQueries: [] };
  }
  console.log(`[brave] action="dominateTitles" queries=${unique.length}`);

  const settled = await Promise.all(
    unique.map(async (q) => {
      try {
        const url = new URL("https://api.search.brave.com/res/v1/web/search");
        url.searchParams.set("q", q);
        url.searchParams.set("count", "6");
        url.searchParams.set("safesearch", "moderate");
        const res = await fetch(url.toString(), {
          headers: { Accept: "application/json", "X-Subscription-Token": BRAVE_SEARCH_API_KEY! },
        });
        console.log(`[brave] q="${q.slice(0, 60)}" status=${res.status}`);
        if (!res.ok) return [];
        const data = await res.json();
        const items: any[] = data?.web?.results ?? [];
        return items.slice(0, 6).map((r) => ({
          title: (r.title ?? "").trim(),
          url: r.url ?? "",
          description: (r.description ?? "").replace(/<[^>]+>/g, "").trim(),
          source: (() => {
            try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return ""; }
          })(),
          query: q,
        }));
      } catch (e) {
        console.warn(`[brave] q="${q.slice(0, 60)}" error:`, e instanceof Error ? e.message : String(e));
        return [];
      }
    }),
  );

  const flat = settled.flat();
  const seen = new Set<string>();
  const results = flat.filter((r) => {
    const k = r.url || `${r.source}|${r.title}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return Boolean(r.title);
  });
  console.log(`[brave] action="dominateTitles" total=${results.length} (deduped from ${flat.length})`);

  const text = results
    .slice(0, 30)
    .map((r, i) => `${i + 1}. [${r.source}] ${r.title} — ${r.description} (q: ${r.query.slice(0, 60)})`)
    .join("\n");

  return { results, text, usedQueries: unique };
}

async function handleDominateTitles(p: any) {
  console.log("[title-domination] started");
  const {
    idea = "",
    genre = "",
    language = "English",
    marketplace = "amazon.com",
    bookType = "",
    targetReader = "",
    mainProblem = "",
    desiredPromise = "",
    titleTone = "direct",
  } = p ?? {};

  const niche = [genre, bookType].filter(Boolean).join(" ").trim();
  const keyword = (mainProblem || desiredPromise || idea).slice(0, 60);
  const site = marketplace?.toLowerCase().includes(".it") ? "site:amazon.it"
             : marketplace?.toLowerCase().includes(".uk") ? "site:amazon.co.uk"
             : "site:amazon.com";

  const queries = [
    `${idea} amazon book title`,
    `${niche} best selling books amazon`,
    `${mainProblem} ${bookType || "self help"} book`,
    `${keyword} kdp book`,
    `${genre} bestselling books amazon`,
    `${desiredPromise} book title`,
    `${site} ${keyword} book`,
    `site:goodreads.com ${keyword} book`,
  ].filter((q) => q && q.trim().length > 5);

  const { results, text, usedQueries } = await braveMultiQuery(queries);

  const sys =
    `You are a senior Amazon KDP title strategist. Turn real market signals into ORIGINAL, sellable titles. ` +
    `Never copy competitor titles — use them to find UNCROWDED angles. ` +
    `Score each title honestly 0-100 across kdp/clarity/emotion/keyword/originality. Penalize generic, poetic or saturated phrasing. ` +
    `Return at least 10 candidates and pick a single winner.`;

  const usr =
    `User input:\n` +
    `- Idea: ${idea}\n- Genre/niche: ${niche}\n- Language: ${language}\n- Marketplace: ${marketplace}\n` +
    `- Book type: ${bookType}\n- Target reader: ${targetReader}\n- Main problem: ${mainProblem}\n` +
    `- Desired promise: ${desiredPromise}\n- Tone: ${titleTone}\n\n` +
    (text
      ? `Real Brave Search competitor signals (DO NOT COPY, use to find gaps):\n${text}\n\n`
      : `(No live web results available — generate from first principles.)\n\n`) +
    `Produce structured analysis. KEEP TEXT CONCISE: each text field ≤ 120 chars, lists ≤ 6 items. ` +
    `Output: marketSignals, competitorInsights (5 max), titleCandidates (10-12, scored), winner, nextActions (3-5).`;

  const out = await callAIJson(sys, usr, "title_domination", TITLE_DOMINATION_SCHEMA);

  const meta = {
    groundingUsed: results.length > 0,
    groundingProvider: results.length > 0 ? ("brave" as const) : null,
    groundingResultsCount: results.length,
    groundingQueries: usedQueries,
    analyzedAt: new Date().toISOString(),
  };
  console.log(`[title-domination] completed candidates=${out?.titleCandidates?.length ?? 0} grounded=${meta.groundingUsed}`);
  return { ...meta, ...out };
}

// ============ Trending Niches (multi-market playlist) ============

async function handleTrendingNiches(p: any) {
  const language = String(p?.language ?? "English");
  const seed = p?.seed != null ? String(p.seed) : null;
  const focus = String(p?.focus ?? "").trim(); // optional genre/topic focus
  const marketplaces: string[] = Array.isArray(p?.marketplaces) && p.marketplaces.length
    ? p.marketplaces
    : ["amazon.com", "amazon.it", "apple-books"];

  console.log(`[trending-niches] started focus="${focus || "(all)"}" markets=${marketplaces.join(",")}`);

  const queries: string[] = [];
  if (marketplaces.includes("amazon.com")) {
    queries.push(
      `site:amazon.com ${focus || "books"} bestseller 2024 paperback`,
      `Amazon kindle bestseller ${focus || "non-fiction"} top sub-niche`,
    );
  }
  if (marketplaces.includes("amazon.it")) {
    queries.push(
      `site:amazon.it ${focus || "libri"} bestseller 2024`,
      `Amazon Italia kindle bestseller ${focus || "self-help"} nicchia`,
    );
  }
  if (marketplaces.includes("apple-books")) {
    queries.push(
      `site:books.apple.com ${focus || "bestseller"} top charts`,
      `Apple Books charts ${focus || "non-fiction"} trending`,
    );
  }
  // cross-market discovery
  queries.push(
    `${focus || "book"} sub-niche underserved low competition KDP 2024`,
    `goodreads trending ${focus || "self-help"} new releases`,
  );

  const { results, text, usedQueries } = await braveMultiQuery(queries.filter(q => q.length > 5));

  const sys =
    `You are a senior KDP + Apple Books market analyst. ` +
    `From REAL Brave Search signals across multiple marketplaces, you must extract a CURATED PLAYLIST ` +
    `of 8-12 sub-niches that are currently DOMINATING (or rising) and represent real opportunities. ` +
    `Output language for all human-readable strings: ${language}. ` +
    `Prioritize HIGH demand × LOW-MEDIUM competition. Mix marketplaces. Be specific (sub-niches, not generic genres). ` +
    `Return STRICT JSON only.`;

  const usr =
    `Marketplaces analyzed: ${marketplaces.join(", ")}\n` +
    (focus ? `Focus area: ${focus}\n` : `No focus — surface diverse opportunities across genres.\n`) +
    (seed ? `Variation seed: ${seed} (return DIFFERENT niches than previous runs)\n` : "") +
    `\nReal Brave Search signals (DO NOT copy titles — extract market patterns):\n` +
    (text || "(No live results — generate from your training knowledge of recent KDP trends.)\n") +
    `\nProduce a TRENDING PLAYLIST: 8-12 sub-niches sorted by opportunityScore DESC. ` +
    `Each item: name (specific), parentGenre, marketplace (best fit), demand/competition/opportunity, ` +
    `trendDirection, dominantPromise (what readers want), targetReader (avatar), suggestedAngle (gap to exploit), ` +
    `3-6 dominantKeywords, whyItMatters (1 sentence), saturationRisk. ` +
    `Keep every text field ≤ 140 chars. Also include 1 marketOverview (2 sentences) on the macro pattern.`;

  const out = await callAIJson(sys, usr, "trending_niches", TRENDING_NICHES_SCHEMA);

  const meta = {
    groundingUsed: results.length > 0,
    groundingProvider: results.length > 0 ? ("brave" as const) : null,
    groundingResultsCount: results.length,
    groundingQueries: usedQueries,
    marketplaces,
    analyzedAt: new Date().toISOString(),
  };
  console.log(`[trending-niches] completed niches=${out?.niches?.length ?? 0} grounded=${meta.groundingUsed}`);
  return { ...meta, ...out };
}

// ============ Server ============

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, payload } = (await req.json()) as ToolCallPayload;
    let result: unknown;

    switch (action) {
      case "analyzeMarket":         result = await handleAnalyzeMarket(payload); break;
      case "predictSuccess":        result = await handlePredictSuccess(payload); break;
      case "generateTitleVariants": result = await handleTitleVariants(payload); break;
      case "coverIntelligence":     result = await handleCoverIntelligence(payload); break;
      case "kdpPackaging":          result = await handlePackaging(payload); break;
      case "dominateTitles":        result = await handleDominateTitles(payload); break;
      case "trendingNiches":        result = await handleTrendingNiches(payload); break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log(`[kdp] analysis completed — action="${action}"`);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kdp-money-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
