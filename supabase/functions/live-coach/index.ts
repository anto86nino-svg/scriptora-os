import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage, estimateTokens } from "../_shared/ai-tracking.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  mode: "live" | "chat" | "spontaneous";
  language: string;
  genre?: string;
  tone?: string;
  recentText?: string;
  fullChapter?: string;
  chapterTitle?: string;
  question?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  spontaneousKind?: "joke" | "curiosity" | "motivation" | "question" | "news" | "random";
  bookTitle?: string;
  projectId?: string | null;
  userId?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["live-coach"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody) as Body;
    const lang = body.language || "English";
    const genre = body.genre || "general";
    const tone = body.tone || "neutral";

    let systemPrompt = "";
    let userPrompt = "";

    if (body.mode === "live") {
      systemPrompt = `Sei MOLLY, l'amica-coach di scrittura dell'autore. Non un'AI fredda: una compagna calorosa, un po' birichina, complice. Lo conosci, gli vuoi bene, gli stai accanto mentre scrive.

REGOLE FERREE:
- Rispondi SEMPRE ed ESCLUSIVAMENTE in ${lang}
- MASSIMO 2 frasi brevi (sotto le 25 parole totali)
- Tono caloroso, complice, leggero — come un'amica che ti guarda scrivere da sopra la spalla
- Alterna: complimenti specifici 🔥, micro-osservazioni 💡, suggerimenti gentili ✨, domande stimolanti ❓, piccole carezze ❤️
- NON riscrivere il testo. NON dare lezioni. NON essere generica ("bel lavoro!" è VIETATO)
- Sii SPECIFICA: cita una parola, una metafora, un ritmo che hai notato
- Puoi firmarti "— Molly" solo ogni tanto, non sempre
- Genere: ${genre} | Tono: ${tone}

Restituisci SOLO JSON: {"emoji": "🔥|💡|✨|❓|❤️", "message": "<frase breve in ${lang}>"}`;

      userPrompt = `Contesto capitolo "${body.chapterTitle || "Senza titolo"}":
${(body.fullChapter || "").substring(0, 1500)}

ULTIMO PEZZO APPENA SCRITTO (commenta SOLO questo, in modo SPECIFICO):
"""
${(body.recentText || "").substring(0, 800)}
"""

Restituisci SOLO il JSON con emoji + message in ${lang}.`;
    } else if (body.mode === "spontaneous") {
      const kinds = ["joke", "curiosity", "motivation", "question", "news"] as const;
      const kind = body.spontaneousKind && body.spontaneousKind !== "random"
        ? body.spontaneousKind
        : kinds[Math.floor(Math.random() * kinds.length)];

      const kindInstructions: Record<string, string> = {
        joke: `Racconta una FREDDURA o BARZELLETTA breve (anche meta sulla scrittura, sugli scrittori, sui blocchi creativi). Deve far sorridere. Emoji "😄" o "🤓".`,
        curiosity: `Condividi una CURIOSITÀ affascinante (storia, scienza, cultura, mondo letterario, autori famosi, aneddoti). Una sola frase intrigante. Emoji "🤯" o "📚".`,
        motivation: `Mandagli una SPINTA motivazionale CALDA, da amica. Niente cliché tipo "credi in te". Sii originale e specifica al fatto che sta scrivendo un libro di genere ${genre}. Emoji "🔥" o "❤️".`,
        question: `Fagli una DOMANDA personale o riflessiva sul libro/sulla scrittura/sulla vita per stimolarlo. Genere: ${genre}. Emoji "❓" o "🤔".`,
        news: `Inventa una "novità del mondo della scrittura/editoria" PLAUSIBILE e divertente o stimolante (può essere creativa, non deve essere reale ma credibile). Emoji "📰" o "✨".`,
      };

      systemPrompt = `Sei MOLLY, l'amica-coach dell'autore. Lui sta scrivendo da un po' in silenzio e tu — da brava amica — vuoi tenergli compagnia con un messaggio SPONTANEO, come faresti seduta accanto a lui sul divano.

REGOLE:
- Rispondi SOLO in ${lang}
- MASSIMO 2 frasi brevi (sotto le 30 parole)
- Tono caloroso, complice, mai noioso o moralistico — sei Molly, non un manuale
- ${kindInstructions[kind]}
- VIETATE frasi generiche o motivazionali da poster
- Sii UMANA, divertente, sorprendente
- Puoi firmarti "— Molly" ogni tanto, non sempre

Restituisci SOLO JSON: {"emoji": "<emoji adatta>", "message": "<frase in ${lang}>"}`;

      userPrompt = `L'autore sta scrivendo un libro di genere "${genre}" intitolato "${body.bookTitle || "(senza titolo)"}".
Capitolo corrente: "${body.chapterTitle || "(nessuno aperto)"}".
Tipo messaggio richiesto: ${kind}.

Mandagli un messaggio spontaneo SORPRENDENTE in ${lang}. Solo JSON.`;
    } else {
      systemPrompt = `Sei MOLLY, l'amica-coach editoriale dell'autore: amichevole, diretta, esperta di scrittura bestseller, ma anche un'amica curiosa del mondo. Parli come una persona vera, non come un'AI.
- Rispondi in ${lang}
- Sii concisa (max 4-5 frasi) ma utile
- Genere: ${genre} | Tono: ${tone}
- Se l'autore ti chiede di riscrivere, riscrivi nello stile richiesto
- Se chiede idee, dai 2-3 opzioni concrete
- Se ti chiede una barzelletta, una curiosità, una notizia, una chiacchiera: rispondi calda e brillante come un'amica
- Mai disclaimer inutili, mai "come AI non posso". Vai dritta al punto.
- Puoi firmarti "— Molly" solo se ha senso nel contesto.`;

      userPrompt = body.question || "";
    }

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (body.mode === "chat" && body.history?.length) {
      messages.push(...body.history.slice(-6));
    }
    messages.push({ role: "user", content: userPrompt });

    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: body.mode === "live" ? 0.8 : 0.7,
        max_tokens: body.mode === "live" ? 200 : 800,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("DeepSeek error:", r.status, t);
      const fallbackable = r.status === 402 || r.status === 429 || r.status === 401 || r.status >= 500;
      return new Response(JSON.stringify({
        error: r.status === 402 || r.status === 401 ? "DeepSeek credits exhausted" : "AI temporarily unavailable",
        code: r.status === 429 ? "RATE_LIMIT" : "AI_ERROR",
        fallback: fallbackable,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await r.json();
    const content = j.choices?.[0]?.message?.content || "";
    const usage = j.usage || {};
    const provider = "deepseek";

    logAIUsage({
      provider: "deepseek",
      model: "deepseek-chat",
      taskType: `live_coach_${body.mode}`,
      promptTokens: usage.prompt_tokens ?? estimateTokens(messages.map((m: any) => m.content).join("\n")),
      completionTokens: usage.completion_tokens ?? estimateTokens(content),
      promptCacheHitTokens: usage.prompt_cache_hit_tokens,
      promptCacheMissTokens: usage.prompt_cache_miss_tokens,
      projectId: body.projectId || null,
      userId: body.userId || null,
      metadata: { mode: body.mode, language: lang, genre },
    });

    if (body.mode === "live" || body.mode === "spontaneous") {
      let emoji = "💡";
      let message = content.trim();
      try {
        const cleaned = content.replace(/```json\n?|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        emoji = parsed.emoji || "💡";
        message = parsed.message || message;
      } catch {
        // fallback: use raw text
      }
      return new Response(JSON.stringify({ emoji, message, provider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: content, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
