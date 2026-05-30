import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// GENRE AUTO-FIX RULES (mirror of src/lib/genre-auto-fix.ts —
// kept inline because edge functions can't import from src/).
// ============================================================
interface AutoFixRule { triggers: string[]; label: string; directive: string; }

const AUTO_FIX_RULES: Record<string, AutoFixRule[]> = {
  horror: [
    { triggers: ["hook", "opening", "incipit", "weak start", "no tension"], label: "Iniezione sensoriale + paura fisica",
      directive: "Riscrivi le aperture deboli iniettando UN dettaglio sensoriale concreto (odore / texture / suono) entro le prime 2 frasi. Converti ogni paura astratta in percezione fisica del corpo (pelle, respiro, temperatura). Vietato 'sentiva paura' → mostra il sintomo." },
    { triggers: ["pacing", "rhythm", "slow", "lento", "tension"], label: "Frasi corte per tensione",
      directive: "Nei passaggi di tensione spezza i periodi: massimo 12 parole. Alterna una frase media a due frasi brevissime. Nessun avverbio inutile." },
    { triggers: ["abstract", "telling", "spiega"], label: "Show don't tell del perturbante",
      directive: "Ogni emozione del perturbante deve essere mostrata attraverso un oggetto domestico fuori posto, non spiegata." },
  ],
  children: [
    { triggers: ["rhythm", "ritmo", "flow", "read-aloud", "musical"], label: "Pattern ripetitivi + musicalità",
      directive: "Aggiungi pattern di ripetizione (parola/frase chiave che ritorna 2-3 volte). Inserisci almeno una rima interna o un'allitterazione per pagina. Il testo deve scorrere ad alta voce: leggi mentalmente e taglia ogni inciampo." },
    { triggers: ["complex", "long sentence", "vocabulary", "difficult"], label: "Sintassi semplificata",
      directive: "Frasi soggetto-verbo-complemento, max 10 parole. Una sola idea per frase. Vocabolario adatto a 6-9 anni: sostituisci ogni parola astratta con immagine concreta." },
    { triggers: ["dialogue", "voice", "character"], label: "Voci dei personaggi distinte",
      directive: "Ogni personaggio deve avere un tic verbale o una parola-firma riconoscibile. Niente dialoghi piatti." },
  ],
  romance: [
    { triggers: ["explicit emotion", "telling feeling", "spiega sentimenti", "on-the-nose"], label: "Sottotesto al posto della spiegazione",
      directive: "Riduci ogni dichiarazione esplicita di sentimento. Mostra l'emozione attraverso il sottotesto: ciò che NON viene detto, le frasi interrotte, le pause." },
    { triggers: ["tension", "chemistry", "spark", "micro"], label: "Micro-tensione fisica",
      directive: "Inserisci almeno 2 micro-beat di tensione per scena: uno sguardo trattenuto, un quasi-contatto, una pausa di 1 battito prima della risposta. Mostra il corpo che reagisce prima della mente." },
    { triggers: ["dialogue flat", "dialoghi piatti"], label: "Dialoghi a doppio livello",
      directive: "Ogni scambio di dialogo deve avere un livello superficiale (cosa si dice) e un livello segreto (cosa si vuole davvero). Riscrivi i dialoghi piatti con questa doppiezza." },
  ],
  "self-help": [
    { triggers: ["reframe", "unclear", "confusing", "vague"], label: "Reframe nitido",
      directive: "Identifica la convinzione che il capitolo vuole rompere e riscrivila in UNA frase netta del tipo 'Non è X. È Y.'. Mettila in apertura del paragrafo chiave." },
    { triggers: ["closing", "ending", "weak conclusion", "finale"], label: "Quote-line di chiusura",
      directive: "Termina la sezione con UNA frase memorabile, sottolineabile, max 15 parole, che il lettore vorrà screenshotare. Tagliante, asimmetrica, vera." },
    { triggers: ["actionable", "tool", "esercizio", "pratica", "missing application"], label: "Strumento operativo",
      directive: "Inserisci almeno UNO strumento applicabile entro 24 ore: domanda-pivot, micro-esercizio, o mini-protocollo in 3 passi. Concreto, non motivazionale." },
  ],
  spirituality: [
    { triggers: ["abstract", "vago", "generic", "new age"], label: "Ancoraggio concreto",
      directive: "Ogni concetto spirituale deve essere ancorato a un'immagine sensoriale o a un gesto quotidiano. Vietate frasi vuote tipo 'energia universale' senza referente concreto." },
    { triggers: ["closing", "ending", "finale"], label: "Domanda contemplativa",
      directive: "Chiudi con una domanda che il lettore porterà con sé per 24 ore. Non retorica, non motivazionale: una domanda vera." },
  ],
  fantasy: [
    { triggers: ["exposition", "info-dump", "worldbuilding", "spiega mondo"], label: "Worldbuilding in azione",
      directive: "Elimina ogni info-dump esplicativo. Le regole del mondo devono emergere SOLO mentre i personaggi agiscono o si scontrano con esse. Mostra la regola attraverso la conseguenza." },
    { triggers: ["intent", "passive", "no goal", "wandering"], label: "Intento per paragrafo",
      directive: "Ogni paragrafo deve contenere un'intenzione chiara di un personaggio (cosa vuole, ora, in questo istante). Riscrivi i paragrafi vaganti aggiungendo questo vettore." },
    { triggers: ["pacing", "slow"], label: "Tagliare l'aria",
      directive: "Comprimi le descrizioni a max 3 frasi consecutive. Alterna sempre descrizione → azione/dialogo." },
  ],
  thriller: [
    { triggers: ["pacing", "slow", "lento"], label: "Cliffhanger di paragrafo",
      directive: "Ogni 2-3 paragrafi inserisci una mini-rivelazione, un colpo di scena minore o una domanda urgente. Mai stallo informativo." },
    { triggers: ["telling", "spiega"], label: "Solo azione + percezione",
      directive: "Sostituisci ogni spiegazione con azione o percezione del POV. Vietato narratore onnisciente che chiarisce." },
  ],
  "sci-fi": [
    { triggers: ["exposition", "info-dump", "tecno"], label: "Tecnologia in uso",
      directive: "Le tecnologie e i concetti scientifici devono apparire in uso, mai descritti a freddo. Mostra il personaggio che interagisce, fallisce, adatta." },
    { triggers: ["abstract", "cold", "freddo"], label: "Ancoraggio umano",
      directive: "Ogni passaggio concettuale deve agganciarsi a una reazione emotiva concreta del POV." },
  ],
};

function matchAutoFixRules(genreKey: string, report: { breaks?: string[]; missing?: string[]; excess?: string[] }): AutoFixRule[] {
  const rules = AUTO_FIX_RULES[genreKey] || [];
  if (!rules.length) return [];
  const haystack = [...(report.breaks || []), ...(report.missing || []), ...(report.excess || [])].join(" \n ").toLowerCase();
  return rules.filter((r) => r.triggers.some((t) => haystack.includes(t.toLowerCase())));
}

function buildAutoFixPromptBlock(rules: AutoFixRule[]): string {
  if (!rules.length) return "";
  const list = rules.map((r, i) => `${i + 1}. [${r.label}] ${r.directive}`).join("\n");
  return `GENRE AUTO-FIX DIRECTIVES (apply surgically — do NOT rewrite the whole chapter):\n${list}\n\nHARD CONSTRAINTS:\n- Total rewrite must NOT exceed 15% of the original chapter length.\n- Do NOT change plot, character intent, or narrative meaning.\n- Only enhance clarity, immersion, rhythm, or structure.\n- Preserve the author's voice and POV.`;
}

import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["genre-coach"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody);
    const { chapterTitle = "", chapterText = "", language = "Italian", genreProfile = null, projectId = null } = body;

    if (!chapterText || typeof chapterText !== "string" || chapterText.length < 100) {
      return new Response(JSON.stringify({ error: "chapterText is required (min 100 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const profileBlock = genreProfile ? `
ACTIVE GENRE PROFILE — judge the chapter strictly against this:
- Profile: ${genreProfile.key || "generic"}
- Tone signature: ${genreProfile.tone || ""}
- Pacing rule: ${genreProfile.pacing || ""}
- Reader promise (must be felt): ${genreProfile.readerPromise || ""}
- Hook patterns expected: ${(genreProfile.hookTypes || []).join(" | ")}
- Always do: ${(genreProfile.dos || []).join(" | ")}
- Never do: ${(genreProfile.donts || []).join(" | ")}
- Chapter ending rule: ${genreProfile.chapterEnding || ""}
` : "";

    const systemPrompt = `You are a senior developmental editor specialized in genre fiction/non-fiction. You analyze chapters against the ACTIVE GENRE PROFILE and return a structured coaching report. You write in ${language}. Output strict JSON only — no prose, no markdown.`;

    const userPrompt = `Analyze this chapter as a Genre Coach. Do NOT rewrite it. Diagnose only.

CHAPTER TITLE: ${chapterTitle}
${profileBlock}
CHAPTER TEXT:
"""
${chapterText.slice(0, 12000)}
"""

Return EXACTLY this JSON shape (in ${language}):
{
  "genreFitScore": 0-100,
  "works": ["3-5 concrete things the chapter does RIGHT (cite tone/hook/pacing/promise)"],
  "breaks": ["3-5 things that break the genre profile (be specific, quote a phrase if useful)"],
  "missing": ["2-4 elements the genre expects but are absent"],
  "excess": ["1-3 things that are TOO MUCH (overwriting, info-dump, cliché)"],
  "fixes": [
    { "issue": "string", "where": "opening|middle|ending|throughout", "suggestion": "1-2 sentence targeted fix (do NOT rewrite the chapter)" }
  ],
  "verdict": "1 sentence overall judgment in ${language}"
}

RULES
- Be specific, never generic ('improve flow' is forbidden — say WHAT to change and WHERE).
- Judge against the GENRE PROFILE if provided, otherwise use general bestseller standards.
- Score 0-100: 90+ = bestseller-level, 70-89 = solid, 50-69 = needs work, <50 = off-genre.
- 4-7 fixes max, ranked by impact.
- Return ONLY the JSON object.`;

    let content = "{}";
    try {
      const result = await callDeepSeekTracked({
        apiKey: DEEPSEEK_API_KEY,
        systemPrompt,
        userPrompt,
        temperature: 0.6,
        maxTokens: 3000,
        jsonMode: true,
        taskType: "genre_coach",
        projectId,
        metadata: { language, genreKey: genreProfile?.key || null },
      });
      content = result.content || "{}";
    } catch (err: any) {
      const status = err?.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please wait and try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402 || status === 401) return new Response(JSON.stringify({ error: "DeepSeek API key invalid or credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw err;
    }

    let parsed: any;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }
    if (!parsed) throw new Error("Invalid AI response shape");

    // Match Genre Auto-Fix rules against the report
    const autoFixRules = matchAutoFixRules(genreProfile?.key || "", parsed);
    parsed.autoFixRules = autoFixRules;
    parsed.autoFixPromptBlock = buildAutoFixPromptBlock(autoFixRules);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("genre-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
