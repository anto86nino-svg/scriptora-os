
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function callDeepSeek(system: string, user: string, context: { userId?: string | null; projectId?: string | null; metadata?: Record<string, unknown> } = {}) {
  if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY missing");
  const result = await callDeepSeekTracked({
    apiKey: DEEPSEEK_API_KEY,
    systemPrompt: system,
    userPrompt: user,
    model: "deepseek-chat",
    temperature: 0.72,
    maxTokens: 3500,
    taskType: "scriptora_character_bible",
    projectId: context.projectId,
    userId: context.userId,
    metadata: context.metadata,
  });
  return result.content.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const idea = String(body.idea || "").trim();
    const genre = String(body.genre || "romance").trim();
    const language = String(body.language || "Italian").trim();
    const tone = String(body.tone || "").trim();
    const subcategory = String(body.subcategory || "").trim();
    const intensity = String(body.intensity || "").trim();
    const centralDynamic = String(body.centralDynamic || "").trim();
    const protagonistType = String(body.protagonistType || "").trim();
    const count = Math.max(2, Math.min(8, Number(body.count || 4)));
    const userId = body.userId ? String(body.userId) : null;
    const projectId = body.projectId ? String(body.projectId) : null;

    if (idea.length < 10) {
      return new Response(JSON.stringify({ error: "Inserisci un'idea più specifica per generare i personaggi." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Sei Scriptora Character Architect.
Crei Character Bible professionali per romanzi commerciali.
Scrivi in ${language}.
Output SOLO testo pulito, niente JSON, niente markdown table.

Obiettivo:
- creare personaggi coerenti, memorabili e utilizzabili direttamente dal motore di scrittura;
- bloccare nomi, ruoli, età, ferite, desideri, segreti e relazioni;
- evitare che nei capitoli futuri i personaggi cambino nome o identità;
- creare tensione narrativa vera, non personaggi generici;
- adattare cast, ferite, desideri, segreti e relazioni al genere, sottogenere, tono, intensità e dinamica centrale;
- progettare personaggi che producano trama, conflitto e continuità;
- creare cast diversi ogni volta: professioni, età, classi sociali, ferite, segreti, modi di parlare e rapporti non devono sembrare intercambiabili.`;

    const user = `IDEA ROMANZO:
${idea}

GENERE:
${genre}

SOTTOGENERE / FILONE:
${subcategory || "da dedurre dal genere"}

TONO:
${tone || "emotivo, cinematografico, bestseller"}

INTENSITÀ:
${intensity || "medium"}

DINAMICA CENTRALE:
${centralDynamic || "tensione emotiva, desiderio e conflitto"}

TIPO PROTAGONISTA:
${protagonistType || "protagonista memorabile, contraddittoria, ferita ma attiva"}

NUMERO PERSONAGGI:
${count}

Crea una CHARACTER BIBLE con ${count} personaggi massimo.

Per ogni personaggio usa ESATTAMENTE questa struttura:

Nome:
Cognome:
Età:
Ruolo nella storia:
Aspetto fisico:
Carattere:
Ferita interiore:
Desiderio esterno:
Bisogno interiore:
Segreto:
Rapporto con gli altri personaggi:
Regole di continuità:

REGOLE IMPORTANTI:
- Rispetta in modo specifico genere, sottogenere, tono, intensità, dinamica centrale e tipo protagonista.
- Il cast deve essere diverso per romance, dark romance, thriller, fantasy, horror, sci-fi, historical, literary fiction, young adult, family saga e memoir narrativo.
- Il protagonista deve essere chiarissimo.
- I nomi devono restare canonici per tutto il romanzo.
- Non creare doppioni con nomi simili.
- Non usare sempre coppie generiche tipo donna ferita + uomo misterioso: se l'idea non lo richiede, varia genere dei ruoli, professioni, desideri, età, status, famiglia, colpa e tipo di segreto.
- Evita nomi e ruoli placeholder ricorrenti. Ogni nome deve sembrare scelto per questa storia, lingua e ambientazione.
- Ogni personaggio deve avere un tratto concreto verificabile in scena: gesto, lavoro, ossessione, oggetto, modo di mentire o paura specifica.
- Ogni personaggio deve avere una funzione narrativa precisa.
- Ogni rapporto deve contenere tensione, desiderio, paura o conflitto.
- Le regole di continuità devono impedire al motore di cambiare nome, età, ruolo o relazione.
- Non scrivere spiegazioni fuori dalla scheda personaggi.`;

    const characterBible = await callDeepSeek(system, user, {
      userId,
      projectId,
      metadata: { genre, subcategory, language, count, source: "character_studio" },
    });

    return new Response(JSON.stringify({ characterBible }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
