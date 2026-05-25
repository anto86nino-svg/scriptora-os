
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: T[], seed: number, offset = 0): T {
  return items[(seed + offset * 9973) % items.length];
}

async function callDeepSeek(system: string, user: string, context: { userId?: string | null; projectId?: string | null; metadata?: Record<string, unknown> } = {}) {
  if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY missing");
  const result = await callDeepSeekTracked({
    apiKey: DEEPSEEK_API_KEY,
    systemPrompt: system,
    userPrompt: user,
    model: "deepseek-chat",
    temperature: 1.05,
    maxTokens: 1300,
    taskType: "scriptora_novel_idea",
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

    const genre = String(body.genre || "romance").trim();
    const seedIdea = String(body.seedIdea || body.idea || "").trim();
    const subcategory = String(body.subcategory || "").trim();
    const tone = String(body.tone || "").trim();
    const intensity = String(body.intensity || "").trim();
    const centralDynamic = String(body.centralDynamic || "").trim();
    const protagonistType = String(body.protagonistType || "").trim();
    const language = String(body.language || "Italian").trim();
    const preserveUserStory = Boolean(body.preserveUserStory);
    const diversitySeed = String(body.diversitySeed || crypto.randomUUID()).trim();
    const previousIdeas: string[] = Array.isArray(body.previousIdeas)
      ? body.previousIdeas.map((item: unknown) => String(item || "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 10)
      : [];
    const userId = body.userId ? String(body.userId) : null;
    const projectId = body.projectId ? String(body.projectId) : null;
    const seed = hashSeed(`${diversitySeed}|${genre}|${subcategory}|${tone}|${previousIdeas.join("|")}`);

    const protagonistRoles = [
      "fotografo forense",
      "traduttrice di lingue morte",
      "ex medico di bordo",
      "architetta acustica",
      "cuoco fallito diventato investigatore privato",
      "erede sotto falso nome",
      "guardiana di un osservatorio abbandonato",
      "violoncellista che ha perso l'udito da un orecchio",
      "avvocato dei casi impossibili",
      "geologa specializzata in frane e memorie sepolte",
      "bibliotecario che riconosce le bugie dalla calligrafia",
      "cartografa di soglie tra mondi instabili",
      "notaio dei morti in una città portuale",
      "tassidermista di creature estinte",
      "fabbricante di campane sacre incrinate",
      "ladra liturgica di reliquie vive",
      "pilota di droni subacquei per relitti industriali",
      "apicoltrice urbana che legge presagi negli sciami",
      "matematica del rischio assunta per prevedere tradimenti",
      "ex magistrata radiata che indaga confessioni false",
      "botanico clandestino che coltiva piante proibite",
      "sarta di abiti funebri che misura i vivi come se fossero gia morti",
      "guardiano di una dogana per viaggiatori impossibili",
    ];
    const settings = [
      "un faro trasformato in biblioteca privata",
      "un hotel sul lago fuori stagione",
      "un archivio sotterraneo sotto una città termale",
      "una nave-laboratorio ferma in porto",
      "un conservatorio chiuso per restauri",
      "un quartiere verticale in una metropoli piovosa",
      "una valle dove la nebbia cancella i confini",
      "una corte nobiliare in decadenza",
      "una clinica sperimentale costruita in una ex abbazia",
      "un'isola mineraria quasi disabitata",
      "una stazione orbitale turistica al collasso",
      "un teatro di provincia riaperto dopo un incendio",
    ];
    const conflictEngines = [
      "una prova materiale che cambia significato a ogni nuova scena",
      "un patto firmato anni prima con una clausola emotiva impossibile",
      "una scomparsa che tutti ricordano in modo diverso",
      "un oggetto ereditato che rende visibile una colpa nascosta",
      "un'indagine privata che diventa confessione sentimentale",
      "una rivalità professionale che obbliga due persone a dipendere l'una dall'altra",
      "un segreto pubblico che nessuno osa nominare",
      "una memoria falsa che protegge la verità sbagliata",
    ];
    const relationshipShapes = [
      "alleanza forzata con fiducia guadagnata per sottrazione",
      "attrazione trattenuta tra due persone che hanno ragione entrambe",
      "rivalità professionale che diventa vulnerabilità",
      "relazione epistolare nata da un errore d'identità",
      "protezione reciproca senza salvataggi facili",
      "amicizia spezzata che deve diventare qualcosa di più per sopravvivere",
    ];
    const sensoryAnchors = [
      "odore di carta bagnata",
      "musica sentita attraverso le pareti",
      "luce fredda di neon in piena notte",
      "sale sulle mani",
      "vetro appannato",
      "polvere dorata nei fasci di sole",
      "metallo caldo dopo la pioggia",
      "inchiostro che macchia le dita",
    ];

    const creativeCoordinates = {
      protagonistRole: pick(protagonistRoles, seed, 1),
      setting: pick(settings, seed, 2),
      conflictEngine: pick(conflictEngines, seed, 3),
      relationshipShape: pick(relationshipShapes, seed, 4),
      sensoryAnchor: pick(sensoryAnchors, seed, 5),
    };

    const system = `Sei Scriptora Novel Concept Architect.
Crei idee di romanzo commerciali, emotive, fresche e non ripetitive.
Scrivi in ${language}.
Output SOLO l'idea del romanzo, niente elenco, niente spiegazioni, niente markdown.
Ogni generazione deve sembrare nuova, concreta, vendibile e pronta per creare personaggi e trama.
Se l'utente non specifica una trama precisa, devi cambiare davvero: professione, luogo, ferita, conflitto, segreto, dinamica e promessa narrativa.
Non riciclare protagoniste generiche, uomini misteriosi indistinti, città del passato, segreti familiari vaghi o lo schema “torna nel luogo che aveva dimenticato”, salvo richiesta esplicita.
Se preserveUserStory=true, NON sostituire la storia dell'utente: rispettala, chiariscila, potenziala e rendila pronta per Character Bible e trama.`;

    const user = preserveUserStory && seedIdea
      ? `ELABORA LA STORIA DELL'UTENTE SENZA SOSTITUIRLA.

STORIA SCRITTA DALL'UTENTE:
${seedIdea}

Coordinate editoriali:
Genere: ${genre}
Filone / sottogenere: ${subcategory || "da dedurre rispettando la storia"}
Tono: ${tone || "cinematografico, emotivo, bestseller"}
Intensità: ${intensity || "medium"}
Dinamica centrale: ${centralDynamic || "desiderio, conflitto e conseguenza"}
Tipo protagonista: ${protagonistType || "protagonista memorabile, contraddittoria, ferita ma attiva"}

Regole:
- Mantieni protagonista, nucleo emotivo, conflitto principale, mondo e promessa narrativa indicati dall'utente.
- Non cambiare mestiere, identità, genere narrativo o mitologia centrale se l'utente li ha specificati.
- Puoi rafforzare chiarezza, posta in gioco, desiderio, ferita, antagonismo, atmosfera e conseguenze.
- Trasforma la storia in una premessa editoriale professionale di 4-7 frasi.
- Evita riassunti piatti: rendila più vendibile, più leggibile, più pronta per creare personaggi e trama.
- Non creare titoli.
- Non scrivere note tecniche.`
      : `Crea UNA idea di romanzo originale usando queste coordinate:

Genere: ${genre}
Filone / sottogenere: ${subcategory || "da scegliere in modo coerente"}
Tono: ${tone || "cinematografico, emotivo, bestseller"}
Intensità: ${intensity || "medium"}
Dinamica centrale: ${centralDynamic || "desiderio, conflitto e segreto"}
Tipo protagonista: ${protagonistType || "protagonista ferita ma attiva"}
${seedIdea ? `Seme dato dall'utente da rispettare e trasformare senza clonare idee precedenti: ${seedIdea}` : "Nessun seme trama specifico: inventa una direzione nuova usando le coordinate creative."}

Coordinate creative obbligatorie per differenziare questa generazione:
- Ruolo/professione protagonista: ${creativeCoordinates.protagonistRole}
- Location principale: ${creativeCoordinates.setting}
- Motore del conflitto: ${creativeCoordinates.conflictEngine}
- Geometria relazionale: ${creativeCoordinates.relationshipShape}
- Ancora sensoriale: ${creativeCoordinates.sensoryAnchor}
- Seed interno: ${diversitySeed}

Idee recenti da NON imitare:
${previousIdeas.length ? previousIdeas.map((item, index) => `${index + 1}. ${item}`).join("\n") : "Nessuna idea recente disponibile."}

Regole:
- 4-7 frasi massimo.
- Deve contenere protagonista, ferita, desiderio, conflitto, atmosfera e promessa narrativa.
- Deve essere specifica, non generica.
- Deve evitare cliché banali.
- Deve poter alimentare una Character Bible e un romanzo completo.
- Se nelle idee recenti compare restauratrice/restauratore/restauro/restaurare/archivio/reliquia, NON usare di nuovo quel mestiere, quella funzione narrativa o quel campo semantico, salvo richiesta esplicita e breve dell'utente.
- Se non hai un seme utente preciso, NON usare la formula “una donna arriva/torna/scappa” come apertura.
- Non creare due protagonisti con ferite o segreti simili alle idee recenti.
- I personaggi devono avere identità, lavoro, desiderio e contraddizione riconoscibili, non archetipi intercambiabili.
- Non usare titoli.
- Non scrivere note tecniche.`;

    const idea = await callDeepSeek(system, user, {
      userId,
      projectId,
      metadata: { genre, subcategory, language, source: "character_studio", diversitySeed, previousIdeas: previousIdeas.length, preserveUserStory },
    });

    return new Response(JSON.stringify({ idea }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
