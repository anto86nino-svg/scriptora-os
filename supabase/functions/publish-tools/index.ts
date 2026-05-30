import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["publish-tools"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody);
    const { action, config, blueprint, chapters, projectId = null } = body;
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    const bookContext = `
Title: ${config.title}
Subtitle: ${config.subtitle || "N/A"}
Genre: ${config.genre}
Tone: ${config.tone}
Language: ${config.language}
Category: ${config.category} / ${config.subcategory}
Themes: ${blueprint?.themes?.join(", ") || "N/A"}
Overview: ${blueprint?.overview?.slice(0, 500) || "N/A"}
Chapter titles: ${chapters?.map((c: any, i: number) => `${i + 1}. ${c.title}`).join(", ") || "N/A"}
`;

    if (action === "description") {
      systemPrompt = `You are a bestselling book marketing copywriter who writes Amazon book descriptions that convert browsers into buyers. You write in ${config.language}.`;
      userPrompt = `Based on this book:\n${bookContext}\n\nGenerate a complete Amazon-ready book description package. Return EXACTLY this JSON format:\n{\n  "hook": "2-3 powerful opening lines that create instant emotional pull",\n  "shortDescription": "150-200 word compelling description",\n  "longDescription": "300-500 word detailed description with paragraph breaks (use \\n\\n for breaks)",\n  "tagline": "One powerful sentence that captures the book\'s essence"\n}\n\nRules:\n- Write in ${config.language}\n- Use emotional triggers appropriate for ${config.genre}\n- Follow Amazon bestseller description patterns\n- Include power words and urgency\n- Format for Amazon (short paragraphs, bold hooks)\n- Make it irresistible to the target reader`;
    } else if (action === "keywords") {
      systemPrompt = `You are an Amazon KDP keyword research expert who understands book discoverability and category optimization. You respond in ${config.language}.`;
      userPrompt = `Based on this book:\n${bookContext}\n\nGenerate a complete keyword strategy. Return EXACTLY this JSON format:\n{\n  "primaryKeywords": ["7 primary Amazon search keywords - high relevance"],\n  "longTailKeywords": ["15 long-tail keyword phrases - mix of competition levels"],\n  "categorySuggestions": ["5 Amazon category/subcategory suggestions with paths"]\n}\n\nRules:\n- Keywords must be realistic and actually searchable on Amazon\n- Mix high-competition and low-competition terms\n- Long-tail keywords should be 3-5 words each\n- Categories should be real Amazon BISAC categories\n- Match the ${config.genre} genre precisely\n- Consider ${config.language} market`;
    } else if (action === "titles") {
      systemPrompt = `You are a bestselling book title strategist who creates titles that maximize click-through rate and sales. You write in ${config.language}.`;
      userPrompt = `Based on this book:\n${bookContext}\n\nGenerate optimized title alternatives. Return EXACTLY this JSON format:\n{\n  "alternativeTitles": ["3 alternative title options"],\n  "subtitleOptions": ["3 subtitle options"],\n  "bestsellerVersion": {\n    "title": "The single best title optimized for maximum clicks and sales",\n    "subtitle": "Matching subtitle",\n    "reasoning": "Brief explanation of why this combination works"\n  }\n}\n\nRules:\n- Titles must increase CTR\n- Must be market-aware for ${config.genre}\n- Use proven bestseller title formulas\n- Consider SEO and searchability\n- Write in ${config.language}`;
    } else if (action === "coverPrompt" || action === "cover") {
      systemPrompt = `You are a professional book cover designer and art director who creates cover concepts for bestselling books. You respond in English for prompts but descriptions in ${config.language}.`;
      userPrompt = `Based on this book:\n${bookContext}\n\nAnd these user preferences:\nMood: ${config._coverMood || "genre-appropriate"}\nStyle: ${config._coverStyle || "professional"}\nColor palette: ${config._coverColors || "genre-appropriate"}\n\nGenerate a complete cover design brief. Return EXACTLY this JSON format:\n{\n  "imagePrompt": "A detailed image generation prompt (80-120 words)",\n  "titleStyle": "Description of how the title should look",\n  "fontCombination": { "titleFont": "Font name", "subtitleFont": "Font name", "authorFont": "Font name" },\n  "layoutStructure": { "titlePosition": "where", "imageArea": "what", "authorPosition": "where", "additionalElements": "any" },\n  "colorPalette": ["5 hex color codes"]\n}`;
    } else if (action === "titleShadow") {
      systemPrompt = `You are an elite Amazon KDP title strategist and SEO expert. You write in ${config.language}.`;
      userPrompt = `Based on this book:\n${bookContext}\n\nPerform a FULL Title Shadow Engine analysis. Return EXACTLY this JSON format:\n{\n  "primaryTitles": [{ "title": "string", "ctrScore": 8, "seoScore": 7, "marketFitScore": 9, "reasoning": "string" }],\n  "subtitles": { "0": ["3 subtitles"], "1": ["3 subtitles"], "2": ["3 subtitles"] },\n  "shadowTitles": [{ "title": "string", "purpose": "string", "demandLevel": "high|medium|low", "competitionLevel": "high|medium|low" }],\n  "bestVersion": { "title": "string", "subtitle": "string", "combinedScore": 9.2, "reasoning": "string" }\n}\n\nProvide 3 primary titles, 5 shadow titles. Write in ${config.language}.`;
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    let content = "";
    try {
      const result = await callDeepSeekTracked({
        apiKey: DEEPSEEK_API_KEY,
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 8192,
        taskType: `publish_${action}`,
        projectId,
        metadata: { action, language: config?.language, genre: config?.genre },
      });
      content = result.content || "";
    } catch (err: any) {
      const status = err?.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402 || status === 401) {
        return new Response(JSON.stringify({ error: "DeepSeek API key invalid or credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    return new Response(JSON.stringify({ content, parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-tools error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
