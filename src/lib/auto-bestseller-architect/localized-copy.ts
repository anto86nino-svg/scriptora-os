import type { ArchitectPhaseId } from "./types";

export type ArchitectLang = "English" | "Italian" | "Spanish" | "French" | "German" | "Portuguese";

export function normalizeArchitectLang(value?: string): ArchitectLang {
  const raw = String(value || "English").trim().toLowerCase();
  if (raw.includes("ital") || raw === "it") return "Italian";
  if (raw.includes("span") || raw === "es") return "Spanish";
  if (raw.includes("fr") || raw.includes("franc") || raw === "fr") return "French";
  if (raw.includes("ger") || raw.includes("deutsch") || raw === "de") return "German";
  if (raw.includes("port") || raw === "pt") return "Portuguese";
  return "English";
}

function pick<T>(lang: ArchitectLang, table: Record<ArchitectLang, T>): T {
  return table[lang] ?? table.English;
}

export function getArchitectPhaseLabels(lang: ArchitectLang): Record<ArchitectPhaseId, string> {
  return pick(lang, {
    English: {
      "idea-intelligence": "Analyzing genre expectations",
      "market-positioning": "Mapping reader positioning",
      "title-positioning": "Exploring commercial title angles",
      "blueprint-architect": "Building narrative blueprint",
      "handoff-ready": "Preparing writing architecture",
    },
    Italian: {
      "idea-intelligence": "Analisi delle attese di genere",
      "market-positioning": "Mappatura del posizionamento lettori",
      "title-positioning": "Esplorazione angoli titolo commerciali",
      "blueprint-architect": "Costruzione blueprint narrativo",
      "handoff-ready": "Preparazione architettura di scrittura",
    },
    Spanish: {
      "idea-intelligence": "Analizando expectativas del género",
      "market-positioning": "Mapeando posicionamiento del lector",
      "title-positioning": "Explorando ángulos comerciales del título",
      "blueprint-architect": "Construyendo blueprint narrativo",
      "handoff-ready": "Preparando arquitectura de escritura",
    },
    French: {
      "idea-intelligence": "Analyse des attentes du genre",
      "market-positioning": "Cartographie du positionnement lecteur",
      "title-positioning": "Exploration des angles de titre",
      "blueprint-architect": "Construction du blueprint narratif",
      "handoff-ready": "Préparation de l'architecture d'écriture",
    },
    German: {
      "idea-intelligence": "Genre-Erwartungen analysieren",
      "market-positioning": "Leser-Positionierung kartieren",
      "title-positioning": "Kommerzielle Titelwinkel erkunden",
      "blueprint-architect": "Narratives Blueprint erstellen",
      "handoff-ready": "Schreibarchitektur vorbereiten",
    },
    Portuguese: {
      "idea-intelligence": "Analisando expectativas do género",
      "market-positioning": "Mapeando posicionamento do leitor",
      "title-positioning": "Explorando ângulos comerciais do título",
      "blueprint-architect": "Construindo blueprint narrativo",
      "handoff-ready": "Preparando arquitetura de escrita",
    },
  });
}

export function getArchitectFlowCopy(lang: ArchitectLang) {
  return pick(lang, {
    English: {
      errorTitle: "Blueprint preparation failed",
      retry: "Try again",
      runningTitle: "AI Developmental Architect",
      preparing: "Preparing…",
      emptyTitle: "Market-aware narrative architecture",
      emptyBody: "Enter your idea and build a commercially informed blueprint — then open the writing room with full context preserved.",
      blueprintKicker: "Commercially informed blueprint",
      ideaIntelligence: "Idea intelligence",
      subgenre: "Subgenre",
      confidence: "Confidence",
      marketPositioning: "Market positioning",
      audience: "Audience",
      promise: "Promise",
      hookStrength: "Hook strength",
      titleConcepts: "Title concepts",
      readerRisks: "Reader risk warnings",
      narrativeArchitecture: "Narrative architecture",
      chaptersThemes: (count: number, themes: string) =>
        `${count} chapters · ${themes || "Themes mapped"}`,
      readyTitle: "Your book is ready to write",
      openWriter: "Open writing room",
      openWriterHint:
        "Opens Writer Room with blueprint, genre intelligence, author identity, and story memory — no context reset.",
      checklist: [
        "Market analyzed",
        "Blueprint created",
        "Emotional architecture prepared",
        "Writing memory initialized",
      ] as const,
    },
    Italian: {
      errorTitle: "Preparazione blueprint non riuscita",
      retry: "Riprova",
      runningTitle: "Architetto evolutivo AI",
      preparing: "Preparazione…",
      emptyTitle: "Architettura narrativa orientata al mercato",
      emptyBody:
        "Inserisci la tua idea e costruisci un blueprint informato sul mercato — poi apri la stanza di scrittura con tutto il contesto preservato.",
      blueprintKicker: "Blueprint orientato al mercato",
      ideaIntelligence: "Intelligenza idea",
      subgenre: "Sottogenere",
      confidence: "Affidabilità",
      marketPositioning: "Posizionamento di mercato",
      audience: "Pubblico",
      promise: "Promessa",
      hookStrength: "Forza hook",
      titleConcepts: "Concept titolo",
      readerRisks: "Avvisi rischio lettore",
      narrativeArchitecture: "Architettura narrativa",
      chaptersThemes: (count: number, themes: string) =>
        `${count} capitoli · ${themes || "Temi mappati"}`,
      readyTitle: "Il tuo libro è pronto per essere scritto",
      openWriter: "Apri stanza di scrittura",
      openWriterHint:
        "Apre la Writer Room con blueprint, intelligenza di genere, identità autore e memoria narrativa — senza reset del contesto.",
      checklist: [
        "Mercato analizzato",
        "Blueprint creato",
        "Architettura emotiva preparata",
        "Memoria di scrittura inizializzata",
      ] as const,
    },
    Spanish: {
      errorTitle: "Error al preparar el blueprint",
      retry: "Reintentar",
      runningTitle: "Arquitecto evolutivo IA",
      preparing: "Preparando…",
      emptyTitle: "Arquitectura narrativa con enfoque de mercado",
      emptyBody:
        "Introduce tu idea y construye un blueprint informado por el mercado — luego abre la sala de escritura con todo el contexto preservado.",
      blueprintKicker: "Blueprint informado comercialmente",
      ideaIntelligence: "Inteligencia de la idea",
      subgenre: "Subgénero",
      confidence: "Confianza",
      marketPositioning: "Posicionamiento de mercado",
      audience: "Audiencia",
      promise: "Promesa",
      hookStrength: "Fuerza del hook",
      titleConcepts: "Conceptos de título",
      readerRisks: "Alertas de riesgo lector",
      narrativeArchitecture: "Arquitectura narrativa",
      chaptersThemes: (count: number, themes: string) =>
        `${count} capítulos · ${themes || "Temas mapeados"}`,
      readyTitle: "Tu libro está listo para escribirse",
      openWriter: "Abrir sala de escritura",
      openWriterHint:
        "Abre la Writer Room con blueprint, inteligencia de género, identidad de autor y memoria narrativa — sin perder contexto.",
      checklist: [
        "Mercado analizado",
        "Blueprint creado",
        "Arquitectura emocional preparada",
        "Memoria de escritura inicializada",
      ] as const,
    },
    French: {
      errorTitle: "Échec de la préparation du blueprint",
      retry: "Réessayer",
      runningTitle: "Architecte évolutif IA",
      preparing: "Préparation…",
      emptyTitle: "Architecture narrative orientée marché",
      emptyBody:
        "Saisissez votre idée et construisez un blueprint informé par le marché — puis ouvrez la salle d'écriture avec tout le contexte préservé.",
      blueprintKicker: "Blueprint informé commercialement",
      ideaIntelligence: "Intelligence de l'idée",
      subgenre: "Sous-genre",
      confidence: "Confiance",
      marketPositioning: "Positionnement marché",
      audience: "Public",
      promise: "Promesse",
      hookStrength: "Force du hook",
      titleConcepts: "Concepts de titre",
      readerRisks: "Alertes risque lecteur",
      narrativeArchitecture: "Architecture narrative",
      chaptersThemes: (count: number, themes: string) =>
        `${count} chapitres · ${themes || "Thèmes cartographiés"}`,
      readyTitle: "Votre livre est prêt à être écrit",
      openWriter: "Ouvrir la salle d'écriture",
      openWriterHint:
        "Ouvre la Writer Room avec blueprint, intelligence de genre, identité auteur et mémoire narrative — sans reset du contexte.",
      checklist: [
        "Marché analysé",
        "Blueprint créé",
        "Architecture émotionnelle préparée",
        "Mémoire d'écriture initialisée",
      ] as const,
    },
    German: {
      errorTitle: "Blueprint-Vorbereitung fehlgeschlagen",
      retry: "Erneut versuchen",
      runningTitle: "KI-Developmental-Architect",
      preparing: "Vorbereitung…",
      emptyTitle: "Marktorientierte narrative Architektur",
      emptyBody:
        "Geben Sie Ihre Idee ein und erstellen Sie ein marktinformiertes Blueprint — dann öffnen Sie den Schreibraum mit vollem Kontext.",
      blueprintKicker: "Marktorientiertes Blueprint",
      ideaIntelligence: "Ideen-Intelligenz",
      subgenre: "Subgenre",
      confidence: "Vertrauen",
      marketPositioning: "Marktpositionierung",
      audience: "Zielgruppe",
      promise: "Versprechen",
      hookStrength: "Hook-Stärke",
      titleConcepts: "Titelkonzepte",
      readerRisks: "Leser-Risiko-Hinweise",
      narrativeArchitecture: "Narrative Architektur",
      chaptersThemes: (count: number, themes: string) =>
        `${count} Kapitel · ${themes || "Themen zugeordnet"}`,
      readyTitle: "Ihr Buch ist bereit zum Schreiben",
      openWriter: "Schreibraum öffnen",
      openWriterHint:
        "Öffnet den Writer Room mit Blueprint, Genre-Intelligenz, Autorenidentität und Erzählgedächtnis — ohne Kontextverlust.",
      checklist: [
        "Markt analysiert",
        "Blueprint erstellt",
        "Emotionale Architektur vorbereitet",
        "Schreibgedächtnis initialisiert",
      ] as const,
    },
    Portuguese: {
      errorTitle: "Falha na preparação do blueprint",
      retry: "Tentar novamente",
      runningTitle: "Arquiteto evolutivo IA",
      preparing: "A preparar…",
      emptyTitle: "Arquitetura narrativa orientada ao mercado",
      emptyBody:
        "Introduza a sua ideia e construa um blueprint informado pelo mercado — depois abra a sala de escrita com todo o contexto preservado.",
      blueprintKicker: "Blueprint comercialmente informado",
      ideaIntelligence: "Inteligência da ideia",
      subgenre: "Subgénero",
      confidence: "Confiança",
      marketPositioning: "Posicionamento de mercado",
      audience: "Público",
      promise: "Promessa",
      hookStrength: "Força do hook",
      titleConcepts: "Conceitos de título",
      readerRisks: "Avisos de risco para o leitor",
      narrativeArchitecture: "Arquitetura narrativa",
      chaptersThemes: (count: number, themes: string) =>
        `${count} capítulos · ${themes || "Temas mapeados"}`,
      readyTitle: "O seu livro está pronto para ser escrito",
      openWriter: "Abrir sala de escrita",
      openWriterHint:
        "Abre a Writer Room com blueprint, inteligência de género, identidade de autor e memória narrativa — sem perder contexto.",
      checklist: [
        "Mercado analisado",
        "Blueprint criado",
        "Arquitetura emocional preparada",
        "Memória de escrita inicializada",
      ] as const,
    },
  });
}

export function getIdeaIntelligenceCopy(lang: ArchitectLang) {
  return pick(lang, {
    English: {
      fictionEmotion: "Emotional immersion & relationship tension",
      nonfictionEmotion: "Transformation & practical clarity",
      defaultEmotion: "Reader-centered emotional journey",
      fictionExpectation:
        "Readers expect escalating emotional friction, clear genre signals, and a payoff that honors the premise.",
      nonfictionExpectation:
        "Readers expect credible authority, a clear transformation path, and practical value without generic filler.",
      lanes: {
        romance: "Emotion-forward commercial fiction with high reader compulsion",
        thriller: "Suspense-driven commercial fiction with escalating stakes",
        speculative: "Speculative fiction with world-building and emotional payoff",
        character: "Character-driven narrative with genre-specific reader expectations",
        business: "Outcome-oriented nonfiction with actionable authority",
        transform: "Inner-transformation nonfiction with emotional resonance",
        instructional: "Instructional nonfiction with trust-through-specificity",
        fallback: "Commercially informed niche positioning",
      },
    },
    Italian: {
      fictionEmotion: "Immersione emotiva e tensione relazionale",
      nonfictionEmotion: "Trasformazione e chiarezza pratica",
      defaultEmotion: "Percorso emotivo centrato sul lettore",
      fictionExpectation:
        "I lettori si aspettano frizione emotiva crescente, segnali di genere chiari e un payoff coerente con la premessa.",
      nonfictionExpectation:
        "I lettori si aspettano autorevolezza credibile, un percorso di trasformazione chiaro e valore pratico senza riempitivi generici.",
      lanes: {
        romance: "Narrativa commerciale emotiva con alta compulsione di lettura",
        thriller: "Narrativa commerciale di suspense con poste in gioco crescenti",
        speculative: "Narrativa speculativa con world-building e payoff emotivo",
        character: "Narrativa character-driven con attese di genere chiare",
        business: "Non-fiction orientata ai risultati con autorevolezza pratica",
        transform: "Non-fiction di trasformazione interiore con risonanza emotiva",
        instructional: "Non-fiction didattica basata su specificità e fiducia",
        fallback: "Posizionamento di nicchia informato sul mercato",
      },
    },
    Spanish: {
      fictionEmotion: "Inmersión emocional y tensión relacional",
      nonfictionEmotion: "Transformación y claridad práctica",
      defaultEmotion: "Viaje emocional centrado en el lector",
      fictionExpectation:
        "Los lectores esperan fricción emocional creciente, señales claras de género y un payoff fiel a la premisa.",
      nonfictionExpectation:
        "Los lectores esperan autoridad creíble, un camino de transformación claro y valor práctico sin relleno genérico.",
      lanes: {
        romance: "Ficción comercial emocional con alta compulsión lectora",
        thriller: "Ficción comercial de suspense con stakes crecientes",
        speculative: "Ficción especulativa con world-building y payoff emocional",
        character: "Narrativa centrada en personajes con expectativas de género",
        business: "No ficción orientada a resultados con autoridad práctica",
        transform: "No ficción de transformación interior con resonancia emocional",
        instructional: "No ficción instructiva basada en especificidad y confianza",
        fallback: "Posicionamiento de nicho informado por el mercado",
      },
    },
    French: {
      fictionEmotion: "Immersion émotionnelle et tension relationnelle",
      nonfictionEmotion: "Transformation et clarté pratique",
      defaultEmotion: "Parcours émotionnel centré lecteur",
      fictionExpectation:
        "Les lecteurs attendent une friction émotionnelle croissante, des signaux de genre clairs et un payoff fidèle à la promesse.",
      nonfictionExpectation:
        "Les lecteurs attendent une autorité crédible, un chemin de transformation clair et une valeur pratique sans remplissage générique.",
      lanes: {
        romance: "Fiction commerciale émotionnelle à forte compulsión lecteur",
        thriller: "Fiction commerciale de suspense à enjeux croissants",
        speculative: "Fiction spéculative avec world-building et payoff émotionnel",
        character: "Récit centré personnages avec attentes de genre",
        business: "Non-fiction orientée résultats avec autorité pratique",
        transform: "Non-fiction de transformation intérieure à résonance émotionnelle",
        instructional: "Non-fiction instructive fondée sur la spécificité",
        fallback: "Positionnement de niche informé par le marché",
      },
    },
    German: {
      fictionEmotion: "Emotionale Immersion und Beziehungsspannung",
      nonfictionEmotion: "Transformation und praktische Klarheit",
      defaultEmotion: "Leserzentrierte emotionale Reise",
      fictionExpectation:
        "Leser erwarten steigende emotionale Reibung, klare Genresignale und ein Payoff, der der Prämisse gerecht wird.",
      nonfictionExpectation:
        "Leser erwarten glaubwürdige Autorität, einen klaren Transformationsweg und praktischen Nutzen ohne Fülltext.",
      lanes: {
        romance: "Emotionsgetriebene kommerzielle Fiction mit hoher Leserbindung",
        thriller: "Spannungsgetriebene kommerzielle Fiction mit steigenden Einsätzen",
        speculative: "Spekulative Fiction mit Worldbuilding und emotionalem Payoff",
        character: "Charaktergetriebenes Erzählen mit klaren Genre-Erwartungen",
        business: "Ergebnisorientierte Non-Fiction mit praktischer Autorität",
        transform: "Innere Transformations-Non-Fiction mit emotionaler Resonanz",
        instructional: "Instruktive Non-Fiction durch Spezifität und Vertrauen",
        fallback: "Marktorientierte Nischen-Positionierung",
      },
    },
    Portuguese: {
      fictionEmotion: "Imersão emocional e tensão relacional",
      nonfictionEmotion: "Transformação e clareza prática",
      defaultEmotion: "Jornada emocional centrada no leitor",
      fictionExpectation:
        "Os leitores esperam fricção emocional crescente, sinais claros de género e um payoff fiel à premissa.",
      nonfictionExpectation:
        "Os leitores esperam autoridade credível, um caminho de transformação claro e valor prático sem enchimento genérico.",
      lanes: {
        romance: "Ficção comercial emocional com alta compulsão de leitura",
        thriller: "Ficção comercial de suspense com stakes crescentes",
        speculative: "Ficção especulativa com world-building e payoff emocional",
        character: "Narrativa centrada em personagens com expectativas de género",
        business: "Não-ficção orientada a resultados com autoridade prática",
        transform: "Não-ficção de transformação interior com ressonância emocional",
        instructional: "Não-ficção instrutiva baseada em especificidade e confiança",
        fallback: "Posicionamento de nicho informado pelo mercado",
      },
    },
  });
}

export function getMarketPositioningCopy(lang: ArchitectLang) {
  return pick(lang, {
    English: {
      audiences: {
        romance: "Adult readers who crave emotionally charged relationship arcs with high tension and delayed payoff.",
        thriller: "Readers who binge suspense — they want escalating dread, sharp hooks, and credible stakes.",
        fantasy: "Speculative fiction readers who expect immersive world logic plus emotional character stakes.",
        productivity: "Professionals seeking structured behavior change — they want clarity, not motivational fluff.",
        nonfiction: "Readers looking for credible guidance with a clear promise and practical application.",
        fallback: "Adult readers aligned with the genre's core emotional contract and commercial expectations.",
      },
      promises: {
        enemies: "The slow, charged transformation from antagonism to intimacy — without losing edge.",
        darkRomance: "Forbidden desire under moral pressure — readers want intensity with consequence.",
        thriller: "A tightening sense that nothing is safe — perception and trust become the battlefield.",
        fiction: "An emotionally earned journey where conflict, subtext, and payoff honor the premise.",
        nonfiction: "A credible path from problem to transformation — readers should feel guided, not lectured.",
      },
      positioning: {
        crossover: "Strong crossover potential between emotionally driven fantasy/romance readers and high-tension commercial fiction audiences.",
        suspense: "Positioned in the commercial suspense lane — hook-first openings and sustained escalation matter more than literary density.",
        nonfiction: (subgenre: string) => `Commercial nonfiction lane: ${subgenre} — authority and specificity beat generic inspiration.`,
      },
      hooks: {
        high: "Opening premise carries clear commercial intrigue — the idea signals conflict or promise quickly.",
        mid: "Solid conceptual hook with room to sharpen the first-page tension or specificity.",
        low: "Concept needs a sharper opening angle — consider leading with conflict, stakes, or an unexpected image.",
      },
      risks: {
        weakHook: "Weak opening risk — premise may not grab readers on page one.",
        shortIdea: "Premise may read generic until character stakes and conflict are specified.",
        genreMismatch: "Genre expectation mismatch — align tone and structure with reader norms.",
        slowBurn: "Emotional tension may arrive too late for slow-burn romance expectations.",
        retention: "Reader retention risk — middle sections may need stronger unresolved friction.",
        mixedSignals: "Niche signals are mixed — refine subgenre or comp titles in the brief.",
        none: "No major commercial red flags detected — focus on execution in the writing room.",
      },
    },
    Italian: {
      audiences: {
        romance: "Lettori adulti che cercano archi relazionali carichi di tensione emotiva e payoff ritardato.",
        thriller: "Lettori che divorano suspense — vogliono dread crescente, hook netti e poste in gioco credibili.",
        fantasy: "Lettori di narrativa speculativa che si aspettano logica di mondo immersiva e stakes emotivi sui personaggi.",
        productivity: "Professionisti che cercano cambiamento strutturato — vogliono chiarezza, non motivazione generica.",
        nonfiction: "Lettori che cercano guida credibile con promessa chiara e applicazione pratica.",
        fallback: "Lettori adulti allineati al contratto emotivo del genere e alle attese commerciali.",
      },
      promises: {
        enemies: "La trasformazione lenta e carica dall'antagonismo all'intimità — senza perdere edge.",
        darkRomance: "Desiderio proibito sotto pressione morale — i lettori vogliono intensità con conseguenze.",
        thriller: "La sensazione crescente che nulla sia al sicuro — percezione e fiducia diventano il campo di battaglia.",
        fiction: "Un percorso emotivamente guadagnato dove conflitto, subtext e payoff onorano la premessa.",
        nonfiction: "Un percorso credibile dal problema alla trasformazione — i lettori devono sentirsi guidati, non predati.",
      },
      positioning: {
        crossover: "Forte potenziale crossover tra lettori fantasy/romance emotiva e narrativa commerciale ad alta tensione.",
        suspense: "Posizionato nel binario suspense commerciale — aperture hook-first ed escalation sostenuta contano più della densità letteraria.",
        nonfiction: (subgenre: string) => `Binario nonfiction commerciale: ${subgenre} — autorevolezza e specificità battono l'ispirazione generica.`,
      },
      hooks: {
        high: "La premessa iniziale ha intrigo commerciale chiaro — l'idea segnala conflitto o promessa subito.",
        mid: "Hook concettuale solido con margine per affinare tensione o specificità nella prima pagina.",
        low: "Il concept ha bisogno di un angolo d'apertura più netto — punta su conflitto, stakes o immagine inattesa.",
      },
      risks: {
        weakHook: "Rischio apertura debole — la premessa potrebbe non agganciare alla pagina uno.",
        shortIdea: "La premessa può sembrare generica finché non specifichi stakes e conflitto dei personaggi.",
        genreMismatch: "Disallineamento attese di genere — allinea tono e struttura alle norme del lettore.",
        slowBurn: "La tensione emotiva potrebbe arrivare troppo tardi per le attese slow-burn romance.",
        retention: "Rischio retention — le sezioni centrali potrebbero richiedere frizione irrisolta più forte.",
        mixedSignals: "Segnali di nicchia misti — affina sottogenere o titoli comparabili nel brief.",
        none: "Nessun red flag commerciale rilevante — concentrati sull'esecuzione in scrittura.",
      },
    },
    Spanish: {
      audiences: {
        romance: "Lectores adultos que buscan arcos relacionales cargados de tensión emocional y payoff retardado.",
        thriller: "Lectores que devoran suspense — quieren dread creciente, hooks afilados y stakes creíbles.",
        fantasy: "Lectores de ficción especulativa que esperan lógica de mundo inmersiva y stakes emocionales.",
        productivity: "Profesionales que buscan cambio estructurado — quieren claridad, no motivación genérica.",
        nonfiction: "Lectores que buscan guía creíble con promesa clara y aplicación práctica.",
        fallback: "Lectores adultos alineados con el contrato emocional del género.",
      },
      promises: {
        enemies: "La transformación lenta y cargada del antagonismo a la intimidad — sin perder filo.",
        darkRomance: "Deseo prohibido bajo presión moral — los lectores quieren intensidad con consecuencias.",
        thriller: "La sensación creciente de que nada es seguro — percepción y confianza como campo de batalla.",
        fiction: "Un viaje emocionalmente ganado donde conflicto, subtexto y payoff honran la premisa.",
        nonfiction: "Un camino creíble del problema a la transformación — guiar, no sermonear.",
      },
      positioning: {
        crossover: "Fuerte potencial crossover entre lectores fantasy/romance emocional y ficción comercial de alta tensión.",
        suspense: "Posicionado en el carril suspense comercial — aperturas hook-first y escalada sostenida.",
        nonfiction: (subgenre: string) => `Carril no ficción comercial: ${subgenre} — autoridad y especificidad vencen la inspiración genérica.`,
      },
      hooks: {
        high: "La premisa inicial tiene intriga comercial clara — la idea señala conflicto o promesa rápido.",
        mid: "Hook conceptual sólido con margen para afilar tensión o especificidad en la primera página.",
        low: "El concepto necesita un ángulo de apertura más afilado — conflito, stakes o imagen inesperada.",
      },
      risks: {
        weakHook: "Riesgo de apertura débil — la premisa puede no enganchar en la página uno.",
        shortIdea: "La premisa puede parecer genérica hasta especificar stakes y conflicto.",
        genreMismatch: "Desalineación de expectativas de género — alinea tono y estructura.",
        slowBurn: "La tensión emocional puede llegar tarde para expectativas slow-burn romance.",
        retention: "Riesgo de retención — las secciones centrales pueden necesitar más fricción.",
        mixedSignals: "Señales de nicho mixtas — refina subgénero o comps en el brief.",
        none: "Sin red flags comerciales mayores — enfócate en la ejecución en escritura.",
      },
    },
    French: {
      audiences: {
        romance: "Lecteurs adultes en quête d'arcs relationnels chargés d'émotion et de payoff différé.",
        thriller: "Lecteurs de suspense — ils veulent une dread croissante, des hooks nets et des enjeux crédibles.",
        fantasy: "Lecteurs de fiction spéculative exigeant une logique de monde immersive et des enjeux émotionnels.",
        productivity: "Professionnels cherchant un changement structuré — clarté, pas de fluff motivationnel.",
        nonfiction: "Lecteurs cherchant un guide crédible avec promesse claire et application pratique.",
        fallback: "Lecteurs adultes alignés sur le contrat émotionnel du genre.",
      },
      promises: {
        enemies: "La transformation lente et chargée de l'antagonisme à l'intimité — sans perdre l'edge.",
        darkRomance: "Désir interdit sous pression morale — intensité avec conséquences.",
        thriller: "Le sentiment croissant que rien n'est sûr — perception et confiance comme champ de bataille.",
        fiction: "Un parcours émotionnellement gagné où conflit, subtexte et payoff honorent la promesse.",
        nonfiction: "Un chemin crédible du problème à la transformation — guider, pas moraliser.",
      },
      positioning: {
        crossover: "Fort potentiel crossover entre romance/fantasy émotionnelle et fiction commerciale tendue.",
        suspense: "Positionné dans le lane suspense commercial — ouvertures hook-first et escalation soutenue.",
        nonfiction: (subgenre: string) => `Lane non-fiction commerciale : ${subgenre} — autorité et spécificité avant l'inspiration générique.`,
      },
      hooks: {
        high: "La prémisse d'ouverture porte une intrigue commerciale claire.",
        mid: "Hook conceptuel solide avec marge pour affiner la tension de première page.",
        low: "Le concept a besoin d'un angle d'ouverture plus net — conflit, enjeux ou image inattendue.",
      },
      risks: {
        weakHook: "Risque d'ouverture faible — la prémisse peut ne pas accrocher dès la page une.",
        shortIdea: "La prémisse peut sembler générique sans enjeux et conflit précisés.",
        genreMismatch: "Décalage d'attentes de genre — alignez ton et structure.",
        slowBurn: "La tension émotionnelle peut arriver trop tard pour une slow-burn romance.",
        retention: "Risque de rétention — le milieu peut nécessiter plus de friction non résolue.",
        mixedSignals: "Signaux de niche mixtes — affinez sous-genre ou comps dans le brief.",
        none: "Pas de red flag commercial majeur — concentrez-vous sur l'exécution en écriture.",
      },
    },
    German: {
      audiences: {
        romance: "Erwachsene Leser mit emotional geladenen Beziehungsbögen und verzögertem Payoff.",
        thriller: "Suspense-Leser — sie wollen steigenden Dread, scharfe Hooks und glaubwürdige Einsätze.",
        fantasy: "Speculative-Fiction-Leser erwarten immersive Weltlogik und emotionale Character-Stakes.",
        productivity: "Professionelle mit strukturiertem Verhaltenswandel — Klarheit statt Motivationsfluff.",
        nonfiction: "Leser suchen glaubwürdige Führung mit klarer Promise und praktischer Anwendung.",
        fallback: "Erwachsene Leser im Einklang mit dem emotionalen Vertrag des Genres.",
      },
      promises: {
        enemies: "Die langsame, aufgeladene Transformation von Antagonismus zu Intimität — ohne Edge-Verlust.",
        darkRomance: "Verbotenes Verlangen unter moralischem Druck — Intensität mit Konsequenzen.",
        thriller: "Das wachsende Gefühl, dass nichts sicher ist — Wahrnehmung und Vertrauen als Schlachtfeld.",
        fiction: "Eine emotional verdiente Reise, in der Konflikt, Subtext und Payoff der Prämisse gerecht werden.",
        nonfiction: "Ein glaubwürdiger Weg vom Problem zur Transformation — führen, nicht belehren.",
      },
      positioning: {
        crossover: "Starkes Crossover-Potenzial zwischen emotionaler Fantasy/Romance und hochspannender kommerzieller Fiction.",
        suspense: "Im kommerziellen Suspense-Lane — Hook-first-Eröffnungen und anhaltende Eskalation zählen mehr.",
        nonfiction: (subgenre: string) => `Kommerzielle Non-Fiction-Spur: ${subgenre} — Autorität und Spezifität schlagen generische Inspiration.`,
      },
      hooks: {
        high: "Die Eröffnungspremisse trägt klare kommerzielle Spannung.",
        mid: "Solider konzeptioneller Hook mit Spielraum für schärfere Erstseiten-Spannung.",
        low: "Das Konzept braucht einen schärferen Eröffnungswinkel — Konflikt, Stakes oder unerwartetes Bild.",
      },
      risks: {
        weakHook: "Schwaches Eröffnungsrisiko — Premisse packt auf Seite eins vielleicht nicht.",
        shortIdea: "Premisse wirkt generisch, bis Character-Stakes und Konflikt spezifiziert sind.",
        genreMismatch: "Genre-Erwartungs-Mismatch — Ton und Struktur an Lesernormen anpassen.",
        slowBurn: "Emotionale Spannung könnte für Slow-Burn-Romance zu spät kommen.",
        retention: "Retention-Risiko — Mittelteile brauchen evtl. stärkere offene Reibung.",
        mixedSignals: "Nischen-Signale gemischt — Subgenre oder Comps im Brief verfeinern.",
        none: "Keine großen kommerziellen Red Flags — Fokus auf Ausführung im Schreibraum.",
      },
    },
    Portuguese: {
      audiences: {
        romance: "Leitores adultos que procuram arcos relacionais carregados de tensão emocional e payoff retardado.",
        thriller: "Leitores de suspense — querem dread crescente, hooks afiados e stakes credíveis.",
        fantasy: "Leitores de ficção especulativa que esperam lógica de mundo imersiva e stakes emocionais.",
        productivity: "Profissionais à procura de mudança estruturada — clareza, não motivação genérica.",
        nonfiction: "Leitores à procura de orientação credível com promessa clara e aplicação prática.",
        fallback: "Leitores adultos alinhados com o contrato emocional do género.",
      },
      promises: {
        enemies: "A transformação lenta e carregada do antagonismo à intimidade — sem perder o edge.",
        darkRomance: "Desejo proibido sob pressão moral — intensidade com consequências.",
        thriller: "A sensação crescente de que nada é seguro — perceção e confiança como campo de batalha.",
        fiction: "Uma jornada emocionalmente conquistada onde conflito, subtexto e payoff honram a premissa.",
        nonfiction: "Um caminho credível do problema à transformação — guiar, não pregar.",
      },
      positioning: {
        crossover: "Forte potencial crossover entre romance/fantasy emocional e ficção comercial de alta tensão.",
        suspense: "Posicionado no lane suspense comercial — aberturas hook-first e escalada sustentada.",
        nonfiction: (subgenre: string) => `Lane não-ficção comercial: ${subgenre} — autoridade e especificidade vencem inspiração genérica.`,
      },
      hooks: {
        high: "A premissa inicial tem intriga comercial clara — a ideia sinaliza conflito ou promessa depressa.",
        mid: "Hook conceptual sólido com margem para afilar tensão ou especificidade na primeira página.",
        low: "O conceito precisa de um ângulo de abertura mais afiado — conflito, stakes ou imagem inesperada.",
      },
      risks: {
        weakHook: "Risco de abertura fraca — a premissa pode não prender na página um.",
        shortIdea: "A premissa pode parecer genérica até especificar stakes e conflito.",
        genreMismatch: "Desalinhamento de expectativas de género — alinhe tom e estrutura.",
        slowBurn: "A tensão emocional pode chegar tarde para expectativas slow-burn romance.",
        retention: "Risco de retenção — secções centrais podem precisar de mais fricção.",
        mixedSignals: "Sinais de nicho mistos — refine subgénero ou comps no brief.",
        none: "Sem red flags comerciais maiores — foque na execução na sala de escrita.",
      },
    },
  });
}

export function getTitleRationaleCopy(lang: ArchitectLang) {
  return pick(lang, {
    English: {
      shortTitle: "Memorable, market-sized title length.",
      longTitle: "Descriptive title with clear genre signal.",
      subtitle: "Subtitle adds emotional intrigue without explaining the whole plot.",
      genre: "Genre signal aligns with reader shelf expectations.",
      hook: "Supports a commercially informed opening hook.",
      angle: (a: string) => `Angle: ${a}.`,
      manual: "Author-selected title preserved from brief.",
    },
    Italian: {
      shortTitle: "Titolo memorabile, lunghezza adatta al mercato.",
      longTitle: "Titolo descrittivo con segnale di genere chiaro.",
      subtitle: "Il sottotitolo aggiunge intrigo emotivo senza spiegare tutta la trama.",
      genre: "Il segnale di genere è allineato alle attese degli scaffali.",
      hook: "Supporta un hook di apertura orientato al mercato.",
      angle: (a: string) => `Angolo: ${a}.`,
      manual: "Titolo scelto dall'autore preservato dal brief.",
    },
    Spanish: {
      shortTitle: "Título memorable, longitud adecuada al mercado.",
      longTitle: "Título descriptivo con señal de género clara.",
      subtitle: "El subtítulo añade intriga emocional sin explicar toda la trama.",
      genre: "La señal de género se alinea con las expectativas del estante.",
      hook: "Apoya un hook de apertura informado comercialmente.",
      angle: (a: string) => `Ángulo: ${a}.`,
      manual: "Título del autor preservado del brief.",
    },
    French: {
      shortTitle: "Titre mémorable, longueur adaptée au marché.",
      longTitle: "Titre descriptif avec signal de genre clair.",
      subtitle: "Le sous-titre ajoute de l'intrigue émotionnelle sans tout révéler.",
      genre: "Le signal de genre correspond aux attentes rayon.",
      hook: "Soutient un hook d'ouverture informé commercialement.",
      angle: (a: string) => `Angle : ${a}.`,
      manual: "Titre auteur préservé depuis le brief.",
    },
    German: {
      shortTitle: "Merkbare, marktgerechte Titellänge.",
      longTitle: "Beschreibender Titel mit klarem Genresignal.",
      subtitle: "Untertitel fügt emotionale Spannung hinzu, ohne die ganze Handlung zu verraten.",
      genre: "Genresignal entspricht Regalerwartungen.",
      hook: "Unterstützt einen marktinformierten Eröffnungs-Hook.",
      angle: (a: string) => `Winkel: ${a}.`,
      manual: "Vom Autor gewählter Titel aus dem Brief übernommen.",
    },
    Portuguese: {
      shortTitle: "Título memorável, comprimento adequado ao mercado.",
      longTitle: "Título descritivo com sinal de género claro.",
      subtitle: "O subtítulo acrescenta intriga emocional sem explicar toda a trama.",
      genre: "O sinal de género alinha-se com as expectativas da prateleira.",
      hook: "Suporta um hook de abertura informado comercialmente.",
      angle: (a: string) => `Ângulo: ${a}.`,
      manual: "Título escolhido pelo autor preservado do brief.",
    },
  });
}

export function getCharacterStrictRules(lang: ArchitectLang): string {
  return pick(lang, {
    English: "Never rename this character. Preserve role, personality, relationships and continuity.",
    Italian: "Non rinominare mai questo personaggio. Preserva ruolo, personalità, relazioni e continuità.",
    Spanish: "Nunca renombres este personaje. Preserva rol, personalidad, relaciones y continuidad.",
    French: "Ne renommez jamais ce personnage. Préservez rôle, personnalité, relations et continuité.",
    German: "Diese Figur niemals umbenennen. Rolle, Persönlichkeit, Beziehungen und Kontinuität bewahren.",
    Portuguese: "Nunca renomeie esta personagem. Preserve papel, personalidade, relações e continuidade.",
  });
}

export function getArchitectPageCopy(lang: ArchitectLang) {
  return pick(lang, {
    English: {
      blueprintReady: "Narrative blueprint ready — open the writing room when you're ready",
      selectTitleFirst: "Select a title before opening the writing room",
      openingWriterRoom: "Opening writing room with full blueprint…",
      oneProjectAtATime: "One project at a time — we build a solid blueprint for each book.",
      briefLoaded: "Brief loaded — adjust and build blueprint",
      blueprintFailed: "Blueprint preparation failed",
      mobileSteps: { brief: "1 · Brief", building: "2 · Blueprint", ready: "3 · Ready" },
      editBrief: "Edit brief",
      hideBrief: "Hide brief",
      backToBlueprint: "Back to blueprint",
      openBrief: "Open brief",
    },
    Italian: {
      blueprintReady: "Blueprint narrativo pronto — apri la stanza di scrittura quando vuoi",
      selectTitleFirst: "Seleziona un titolo prima di aprire la stanza di scrittura",
      openingWriterRoom: "Apertura stanza di scrittura con blueprint completo…",
      oneProjectAtATime: "Un progetto alla volta — costruiamo un blueprint solido per ogni libro.",
      briefLoaded: "Brief caricato — modifica e costruisci il blueprint",
      blueprintFailed: "Preparazione blueprint non riuscita",
      mobileSteps: { brief: "1 · Brief", building: "2 · Blueprint", ready: "3 · Pronto" },
      editBrief: "Modifica brief",
      hideBrief: "Nascondi brief",
      backToBlueprint: "Torna al blueprint",
      openBrief: "Apri brief",
    },
    Spanish: {
      blueprintReady: "Blueprint narrativo listo — abre la sala de escritura cuando quieras",
      selectTitleFirst: "Selecciona un título antes de abrir la sala de escritura",
      openingWriterRoom: "Abriendo sala de escritura con blueprint completo…",
      oneProjectAtATime: "Un proyecto a la vez — construimos un blueprint sólido para cada libro.",
      briefLoaded: "Brief cargado — ajusta y construye el blueprint",
      blueprintFailed: "Error al preparar el blueprint",
      mobileSteps: { brief: "1 · Brief", building: "2 · Blueprint", ready: "3 · Listo" },
      editBrief: "Editar brief",
      hideBrief: "Ocultar brief",
      backToBlueprint: "Volver al blueprint",
      openBrief: "Abrir brief",
    },
    French: {
      blueprintReady: "Blueprint narratif prêt — ouvrez la salle d'écriture quand vous voulez",
      selectTitleFirst: "Sélectionnez un titre avant d'ouvrir la salle d'écriture",
      openingWriterRoom: "Ouverture de la salle d'écriture avec blueprint complet…",
      oneProjectAtATime: "Un projet à la fois — nous construisons un blueprint solide pour chaque livre.",
      briefLoaded: "Brief chargé — ajustez et construisez le blueprint",
      blueprintFailed: "Échec de la préparation du blueprint",
      mobileSteps: { brief: "1 · Brief", building: "2 · Blueprint", ready: "3 · Prêt" },
      editBrief: "Modifier le brief",
      hideBrief: "Masquer le brief",
      backToBlueprint: "Retour au blueprint",
      openBrief: "Ouvrir le brief",
    },
    German: {
      blueprintReady: "Narratives Blueprint bereit — öffnen Sie den Schreibraum, wenn Sie bereit sind",
      selectTitleFirst: "Wählen Sie einen Titel, bevor Sie den Schreibraum öffnen",
      openingWriterRoom: "Schreibraum wird mit vollem Blueprint geöffnet…",
      oneProjectAtATime: "Ein Projekt nach dem anderen — wir erstellen ein solides Blueprint pro Buch.",
      briefLoaded: "Brief geladen — anpassen und Blueprint erstellen",
      blueprintFailed: "Blueprint-Vorbereitung fehlgeschlagen",
      mobileSteps: { brief: "1 · Brief", building: "2 · Blueprint", ready: "3 · Bereit" },
      editBrief: "Brief bearbeiten",
      hideBrief: "Brief ausblenden",
      backToBlueprint: "Zurück zum Blueprint",
      openBrief: "Brief öffnen",
    },
    Portuguese: {
      blueprintReady: "Blueprint narrativo pronto — abra a sala de escrita quando quiser",
      selectTitleFirst: "Selecione um título antes de abrir a sala de escrita",
      openingWriterRoom: "A abrir sala de escrita com blueprint completo…",
      oneProjectAtATime: "Um projeto de cada vez — construímos um blueprint sólido para cada livro.",
      briefLoaded: "Brief carregado — ajuste e construa o blueprint",
      blueprintFailed: "Falha na preparação do blueprint",
      mobileSteps: { brief: "1 · Brief", building: "2 · Blueprint", ready: "3 · Pronto" },
      editBrief: "Editar brief",
      hideBrief: "Ocultar brief",
      backToBlueprint: "Voltar ao blueprint",
      openBrief: "Abrir brief",
    },
  });
}
