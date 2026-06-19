import type { GuidedInterviewState, InterviewGenre, InterviewQuickSuggestion } from "./types";
import { sanitizeDnaText } from "./dna-cleaner";
import { buildCharacterAwareQuestionPrompt } from "./character-foundation-studio";

export type InterviewBookCategory =
  | "gothic-dark"
  | "thriller-horror"
  | "romance"
  | "dark-romance"
  | "fantasy"
  | "sci-fi"
  | "self-help"
  | "business"
  | "study"
  | "poetry"
  | "memoir"
  | "children-ya"
  | "manual"
  | "literary-fiction"
  | "general-fiction"
  | "general-nonfiction";

export type InterviewBookSignals = {
  category: InterviewBookCategory;
  secondaryCategory?: InterviewBookCategory;
  confidence: number;
  isNarrative: boolean;
  isNonfiction: boolean;
  userAnswerCount: number;
  genre?: InterviewGenre;
  subgenreHint?: string;
};

type CategoryPattern = {
  category: InterviewBookCategory;
  patterns: RegExp[];
  weight: number;
  narrative: boolean;
  nonfiction: boolean;
  genre?: InterviewGenre;
  subgenre?: string;
};

const CATEGORY_PATTERNS: CategoryPattern[] = [
  {
    category: "gothic-dark",
    patterns: [
      /\b(gotico|gothic|oscuro|ombre|presagi|decadent|elegante|nebbia|mistero elegante|segreti familiari)\b/i,
    ],
    weight: 1.4,
    narrative: true,
    nonfiction: false,
    genre: "literary-fiction",
    subgenre: "Gotico / dark",
  },
  {
    category: "thriller-horror",
    patterns: [
      /\b(thriller|horror|paura|minaccia|indagine|suspense|omicidio|assassino|psicologico|realistico|colpo di scena)\b/i,
    ],
    weight: 1.3,
    narrative: true,
    nonfiction: false,
    genre: "thriller",
    subgenre: "Thriller / horror",
  },
  {
    category: "dark-romance",
    patterns: [/\b(dark romance|romance oscuro|proibito|ossessione|possessiv|attrazione proibita)\b/i],
    weight: 1.35,
    narrative: true,
    nonfiction: false,
    genre: "dark-romance",
    subgenre: "Dark Romance",
  },
  {
    category: "romance",
    patterns: [/\b(romance|slow burn|relazione|amore|cuore|desiderio|enemies to lovers|payoff emotivo)\b/i],
    weight: 1.2,
    narrative: true,
    nonfiction: false,
    genre: "romance",
    subgenre: "Romance",
  },
  {
    category: "fantasy",
    patterns: [/\b(fantasy|magia|regno|elfi|draghi|epico|mondo immaginario|destino|missione)\b/i],
    weight: 1.2,
    narrative: true,
    nonfiction: false,
    genre: "fantasy",
    subgenre: "Fantasy",
  },
  {
    category: "sci-fi",
    patterns: [/\b(sci[- ]?fi|fantascienza|futuro|spazio|tecnolog|android|AI|distopia|speculativ)\b/i],
    weight: 1.2,
    narrative: true,
    nonfiction: false,
    genre: "literary-fiction",
    subgenre: "Sci-fi",
  },
  {
    category: "poetry",
    patterns: [/\b(poesia|poetico|versi|raccolta poetica|lirica|sonetto|voce poetica)\b/i],
    weight: 1.35,
    narrative: true,
    nonfiction: false,
    genre: "poetry",
    subgenre: "Poesia",
  },
  {
    category: "memoir",
    patterns: [/\b(memoir|autobiograf|storia vera|testimonianza|vissuto|guarigione personale)\b/i],
    weight: 1.15,
    narrative: true,
    nonfiction: false,
    genre: "literary-fiction",
    subgenre: "Memoir",
  },
  {
    category: "study",
    patterns: [
      /\b(studio|universit|esame|orale|verifica|studenti|comprensione|metodo di studio|memoria|concetti difficili)\b/i,
    ],
    weight: 1.25,
    narrative: false,
    nonfiction: true,
    genre: "manual",
    subgenre: "Studio / università",
  },
  {
    category: "self-help",
    patterns: [
      /\b(self[- ]?help|crescita|abitudini|disciplina|bloccat|motivaz|mindset|trasformazione personale|metodo)\b/i,
    ],
    weight: 1.15,
    narrative: false,
    nonfiction: true,
    genre: "self-help",
    subgenre: "Self-help",
  },
  {
    category: "business",
    patterns: [/\b(business|imprenditor|startup|vendite|leadership|produttivit|carriera|creator)\b/i],
    weight: 1.1,
    narrative: false,
    nonfiction: true,
    genre: "business",
    subgenre: "Business",
  },
  {
    category: "manual",
    patterns: [/\b(manuale|guida pratica|tutorial|how[- ]?to|passo per passo|istruzioni)\b/i],
    weight: 1.1,
    narrative: false,
    nonfiction: true,
    genre: "manual",
    subgenre: "Manuale",
  },
  {
    category: "children-ya",
    patterns: [/\b(bambini|raga[zs]zi|young adult|YA|fiaba|immaginazione|età)\b/i],
    weight: 1.1,
    narrative: true,
    nonfiction: false,
    genre: "literary-fiction",
    subgenre: "Young Adult",
  },
  {
    category: "literary-fiction",
    patterns: [/\b(romanzo|narrativa|storia|identit|famiglia|memoria|atmosferic)\b/i],
    weight: 0.85,
    narrative: true,
    nonfiction: false,
    genre: "literary-fiction",
    subgenre: "Narrativa letteraria",
  },
];

const SELF_HELP_CHIP_LABELS = new Set([
  "Professionisti",
  "Creativi",
  "Studenti brillanti",
  "Persone bloccate",
  "Chi cerca un metodo",
  "Trasformazione pratica",
]);

function chip(label: string, value: string): InterviewQuickSuggestion {
  return { label, value };
}

const TARGET_BY_CATEGORY: Record<InterviewBookCategory, InterviewQuickSuggestion[]> = {
  "gothic-dark": [
    chip("Lettori dark gothic", "Lettori dark gothic che amano atmosfere eleganti e inquietanti."),
    chip("Amanti dei segreti", "Lettori affamati di segreti, presagi e verità sepolte."),
    chip("Atmosfere oscure", "Chi ama libri oscuri, lenti, carichi di ombre e simboli."),
    chip("Misteri eleganti", "Lettori di misteri eleganti, decadenti, gotici e raffinati."),
    chip("Presagi e ombre", "Chi cerca presagi, ombre, silenzi e tensione sottile."),
    chip("Gotico moderno", "Lettori di gotico moderno, intimo, letterario e disturbante."),
  ],
  "thriller-horror": [
    chip("Tensione psicologica", "Lettori che amano tensione psicologica, ambiguità e paura umana."),
    chip("Colpi di scena", "Lettori che cercano colpi di scena, mistero e ritmo alto."),
    chip("Paura umana", "Chi vuole paura realistica, vicina, possibile e disturbante."),
    chip("Minaccia vicina", "Lettori che temono ciò che viene da casa, famiglia, lavoro o memoria."),
    chip("Ritmo compulsivo", "Lettori page-turner che vogliono capitoli brevi e open loop."),
    chip("Verità instabile", "Chi ama dubitare di ciò che vede, ricorda o crede."),
  ],
  "romance": [
    chip("Lettori romance", "Lettori romance che vogliono emozione, chimica e payoff."),
    chip("Slow burn", "Lettori che amano slow burn, tensione trattenuta e desiderio crescente."),
    chip("Tensione romantica", "Chi cerca tensione romantica, sguardi, silenzi e attrazione."),
    chip("Ferite emotive", "Lettori sensibili a personaggi feriti, vulnerabili, veri."),
    chip("Finale catartico", "Chi vuole un finale emotivo che resti addosso."),
    chip("Relazione impossibile", "Lettori attratti da amori difficili, proibiti o rischiosi."),
  ],
  "dark-romance": [
    chip("Dark romance", "Lettori dark romance che amano ossessione, rischio e tabù."),
    chip("Attrazione proibita", "Chi cerca attrazione proibita, pericolosa, magnetica."),
    chip("Desiderio trattenuto", "Lettori che amano desiderio trattenuto, lento e intenso."),
    chip("Ferite emotive", "Lettori sensibili a ferite, controllo, potere e vulnerabilità."),
    chip("Tensione intensa", "Chi vuole tensione intensa, morbosa, emotiva e adulta."),
    chip("Finale catartico", "Lettori che vogliono un finale devastante o liberatorio."),
  ],
  fantasy: [
    chip("Lettori fantasy", "Lettori fantasy che amano mondi, regole e destino."),
    chip("Worldbuilding", "Chi ama worldbuilding denso, mappe mentali e mitologie."),
    chip("Avventura epica", "Lettori che vogliono missione, viaggio e prova del destino."),
    chip("Magia e destino", "Chi cerca magia, profezie, scelte e costo del potere."),
    chip("Eroi feriti", "Lettori attratti da eroi imperfetti, feriti, in crescita."),
    chip("Atmosfera immersiva", "Chi vuole immersione totale in un mondo altro."),
  ],
  "sci-fi": [
    chip("Lettori sci-fi", "Lettori sci-fi che amano futuri possibili e dilemmi morali."),
    chip("Tecnologia", "Chi è affascinato da tecnologia, AI, spazio o distopie."),
    chip("Futuro speculativo", "Lettori che vogliono speculazione intelligente, non solo gadget."),
    chip("Dilemmi etici", "Chi cerca domande morali, identità, controllo e verità."),
    chip("Mondo alterato", "Lettori attratti da mondi alterati, vicini al nostro."),
    chip("Tensione intellettuale", "Chi ama idee forti dentro storie tese."),
  ],
  "self-help": [
    chip("Persone bloccate", "Persone bloccate che sanno cosa fare ma non riescono a iniziare."),
    chip("Professionisti", "Professionisti under pressure che vogliono ritrovare focus."),
    chip("Creativi", "Creativi e maker che devono portare a termine progetti importanti."),
    chip("Chi cerca un metodo", "Lettori che vogliono un metodo concreto, non teoria vuota."),
    chip("Trasformazione pratica", "Chi cerca trasformazione pratica, misurabile, quotidiana."),
    chip("Disciplina", "Lettori che vogliono disciplina, abitudini e continuità."),
  ],
  business: [
    chip("Imprenditori", "Imprenditori e founder che devono decidere, vendere e crescere."),
    chip("Professionisti", "Professionisti che vogliono risultati concreti e chiarezza."),
    chip("Creator", "Creator e solopreneur che devono monetizzare e strutturare."),
    chip("Manager", "Manager e leader che guidano team sotto pressione."),
    chip("Principianti", "Principianti che vogliono basi solide senza fuffa."),
    chip("Esperti", "Esperti che cercano un framework più affilato."),
  ],
  study: [
    chip("Studenti universitari", "Studenti universitari sotto pressione d'esame."),
    chip("Esame orale", "Chi deve preparare un esame orale difficile."),
    chip("Verifica scritta", "Chi deve affrontare verifica scritta o concetti complessi."),
    chip("Metodo di studio", "Lettori che vogliono un metodo di studio concreto."),
    chip("Memoria", "Chi deve memorizzare, ripassare e tenere tutto insieme."),
    chip("Comprensione profonda", "Studenti che vogliono capire davvero, non solo ripassare."),
  ],
  poetry: [
    chip("Lettori sensibili", "Lettori sensibili che amano immagini, silenzi e voce."),
    chip("Voce poetica", "Chi cerca una voce poetica riconoscibile e intima."),
    chip("Dolore e rinascita", "Lettori attratti da perdita, dolore, rinascita e bellezza."),
    chip("Immagini forti", "Chi ama immagini forti, simboli, ritmo e densità."),
    chip("Oscura e lirica", "Lettori di poesia oscura, lirica, malinconica o spirituale."),
    chip("Esperienza intima", "Chi vuole un'esperienza intima, quasi confessionale."),
  ],
  memoir: [
    chip("Esperienza vissuta", "Lettori attratti da storie vere, vissute, non edulcorate."),
    chip("Testimonianza", "Chi cerca testimonianza, verità e resilienza."),
    chip("Guarigione", "Lettori in cerca di guarigione, senso e compagnia."),
    chip("Lettori empatici", "Lettori empatici che vogliono entrare in una vita reale."),
    chip("Memoria e identità", "Chi ama memoria, identità, famiglia e verità personale."),
    chip("Voce autentica", "Lettori che vogliono una voce autentica, non performativa."),
  ],
  "children-ya": [
    chip("Bambini 8-12", "Bambini 8-12 con immaginazione viva e bisogno di avventura."),
    chip("Young Adult", "Giovani adulti che vogliono identità, scelte e intensità."),
    chip("Avventura", "Lettori giovani attratti da avventura, coraggio e meraviglia."),
    chip("Valori e crescita", "Famiglie o educatori che cercano valori e crescita."),
    chip("Tono accessibile", "Lettori che vogliono linguaggio chiaro, vivo, coinvolgente."),
    chip("Immaginazione", "Chi ama mondi, personaggi memorabili e senso di scoperta."),
  ],
  manual: [
    chip("Principianti", "Principianti che vogliono istruzioni chiare passo passo."),
    chip("Pratici", "Lettori pratici che vogliono applicare subito."),
    chip("Professionisti", "Professionisti che cercano una guida operativa."),
    chip("Creator", "Creator che vogliono un processo ripetibile."),
    chip("Esperti", "Esperti che vogliono affinare tecnica e risultati."),
    chip("Chi deve fare", "Chi ha bisogno di sapere cosa fare adesso."),
  ],
  "literary-fiction": [
    chip("Lettori di narrativa", "Lettori di narrativa che amano personaggi e atmosfera."),
    chip("Storie umane", "Chi cerca storie umane, vere, dense di sottotesto."),
    chip("Atmosfera", "Lettori sensibili a tono, luogo e respiro del libro."),
    chip("Identità", "Chi ama identità, memoria, famiglia e scelte morali."),
    chip("Lentamente immersivo", "Lettori che amano ritmo lento ma profondamente immersivo."),
    chip("Letterario accessibile", "Chi vuole prosa curata ma comunque coinvolgente."),
  ],
  "general-fiction": [
    chip("Lettori di storie", "Lettori che amano storie forti, personaggi e tensione."),
    chip("Emozione e mistero", "Chi cerca emozione, mistero o sorpresa."),
    chip("Atmosfera riconoscibile", "Lettori che vogliono un'atmosfera riconoscibile e viva."),
    chip("Personaggi veri", "Chi ama personaggi veri, feriti, memorabili."),
    chip("Payoff narrativo", "Lettori che vogliono payoff narrativo e senso di viaggio."),
    chip("Lettura immersiva", "Chi cerca un'esperienza immersiva, non generica."),
  ],
  "general-nonfiction": [
    chip("Curiosi del tema", "Lettori curiosi del tema che vogliono chiarezza."),
    chip("Pratici", "Lettori pratici che vogliono applicare ciò che leggono."),
    chip("Professionisti", "Professionisti interessati al tema in modo concreto."),
    chip("Principianti", "Principianti che vogliono entrare nel tema senza perdersi."),
    chip("Chi cerca metodo", "Lettori che vogliono struttura, metodo e direzione."),
    chip("Chi vuole cambiare", "Lettori che vogliono cambiare qualcosa di reale."),
  ],
};

const TONE_BY_CATEGORY: Partial<Record<InterviewBookCategory, InterviewQuickSuggestion[]>> = {
  "gothic-dark": [
    chip("Gotica", "Gotica, oscura, elegante, carica di presagi e ombre."),
    chip("Decadente", "Decadente, malinconica, aristocratica, piena di silenzi."),
    chip("Paura sottile", "Paura sottile, mai urlata, sempre presente."),
    chip("Inquietante", "Inquietante, elegante, disturbante ma raffinata."),
  ],
  "thriller-horror": [
    chip("Claustrofobica", "Claustrofobica, come se il lettore non avesse vie d'uscita."),
    chip("Disturbante", "Disturbante, con una paura che resta addosso."),
    chip("Investigativa", "Investigativa, fatta di indizi, sospetti e verità instabili."),
    chip("Realistica", "Realistica, umana, possibile, vicina."),
  ],
  "romance": [
    chip("Slow burn", "Slow burn, con desiderio trattenuto e tensione crescente."),
    chip("Dolce", "Dolce, intimo, luminoso, emotivamente caldo."),
    chip("Magnetico", "Magnetico, sensuale, pieno di sottotesto."),
    chip("Doloroso", "Doloroso, vulnerabile, con ferite che non si aprono subito."),
  ],
  "dark-romance": [
    chip("Proibito", "Proibito, pericoloso, ossessivo, magnetico."),
    chip("Slow burn", "Slow burn dark, lento, intenso, morboso."),
    chip("Ferito", "Ferito, vulnerabile, attratto da ciò che fa male."),
    chip("Teso", "Teso, adulto, pieno di rischio e desiderio."),
  ],
  poetry: [
    chip("Oscura", "Oscura, viscerale, attraversata da ombra e perdita."),
    chip("Malinconica", "Malinconica, intima, piena di memoria."),
    chip("Luminosa", "Luminosa, fragile, orientata a rinascita."),
    chip("Corporea", "Corporea, sensoriale, fatta di pelle e respiro."),
  ],
  "self-help": [
    chip("Diretto e umano", "Diretto e umano, vicino al lettore."),
    chip("Compassionevole", "Compassionevole, morbido, incoraggiante."),
    chip("Sfida dura", "Sfida dura, senza scuse, orientata all'azione."),
    chip("Pratico", "Pratico, concreto, basato su esempi reali."),
  ],
  study: [
    chip("Chiaro e guidato", "Chiaro, guidato, rassicurante ma esigente."),
    chip("Metodico", "Metodico, strutturato, orientato al risultato."),
    chip("Motivante", "Motivante, concreto, anti-panico."),
    chip("Profondo", "Profondo, orientato alla comprensione vera."),
  ],
};

function collectInterviewBlob(state: GuidedInterviewState): string {
  const parts = state.messages.filter((m) => m.role === "user").map((m) => m.content);
  for (const value of Object.values(state.extracted ?? {})) {
    if (typeof value === "string" && value.trim()) parts.push(value);
  }
  return sanitizeDnaText(parts.join("\n"));
}

function scoreCategories(blob: string): Array<{ pattern: CategoryPattern; score: number }> {
  const scores: Array<{ pattern: CategoryPattern; score: number }> = [];
  for (const pattern of CATEGORY_PATTERNS) {
    let score = 0;
    for (const rx of pattern.patterns) {
      const matches = blob.match(rx);
      if (matches) score += matches.length * pattern.weight;
    }
    if (score > 0) scores.push({ pattern, score });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function genreBoostCategory(genre?: InterviewGenre): InterviewBookCategory | undefined {
  const map: Partial<Record<InterviewGenre, InterviewBookCategory>> = {
    romance: "romance",
    "dark-romance": "dark-romance",
    thriller: "thriller-horror",
    fantasy: "fantasy",
    poetry: "poetry",
    "self-help": "self-help",
    business: "business",
    manual: "manual",
    "literary-fiction": "literary-fiction",
  };
  return genre ? map[genre] : undefined;
}

export function inferInterviewBookSignals(state: GuidedInterviewState): InterviewBookSignals {
  const blob = collectInterviewBlob(state);
  const userAnswerCount = state.messages.filter(
    (m) => m.role === "user" && sanitizeDnaText(m.content).length >= 2,
  ).length;

  const ranked = scoreCategories(blob);
  const inferredGenre = (state.selectedGenre || state.inferredProfile?.genre) as InterviewGenre | undefined;
  const boost = genreBoostCategory(inferredGenre);

  let category: InterviewBookCategory = "general-fiction";
  let secondaryCategory: InterviewBookCategory | undefined;
  let confidence = 0.2;

  if (ranked.length > 0) {
    category = ranked[0].pattern.category;
    confidence = Math.min(0.95, 0.35 + ranked[0].score * 0.08);
    if (ranked[1] && ranked[1].score >= ranked[0].score * 0.75) {
      secondaryCategory = ranked[1].pattern.category;
    }
  } else if (boost) {
    category = boost;
    confidence = 0.45;
  } else if (state.inferredProfile?.bookType?.toLowerCase().includes("saggio")) {
    category = "general-nonfiction";
    confidence = 0.35;
  }

  if (boost && boost !== category && confidence < 0.55) {
    category = boost;
    confidence = Math.max(confidence, 0.5);
  }

  const activePattern =
    CATEGORY_PATTERNS.find((p) => p.category === category) ??
    CATEGORY_PATTERNS.find((p) => p.category === "literary-fiction")!;

  return {
    category,
    secondaryCategory,
    confidence,
    isNarrative: activePattern.narrative,
    isNonfiction: activePattern.nonfiction,
    userAnswerCount,
    genre: activePattern.genre ?? inferredGenre,
    subgenreHint: activePattern.subgenre ?? state.inferredProfile?.subgenre,
  };
}

function resolveCategory(signals: InterviewBookSignals): InterviewBookCategory {
  if (signals.confidence >= 0.35) return signals.category;
  if (signals.isNonfiction) return "general-nonfiction";
  return "general-fiction";
}

function audienceKeys(questionKey: string): boolean {
  return (
    questionKey === "targetReader" ||
    questionKey === "readerTransformation" ||
    questionKey === "depthReaderFit" ||
    questionKey.includes("target") ||
    questionKey.includes("Reader")
  );
}

function toneKeys(questionKey: string): boolean {
  return questionKey === "emotionalTone" || questionKey.includes("tone") || questionKey === "depthCoreFear";
}

function avoidSelfHelpForNarrative(suggestions: InterviewQuickSuggestion[], narrative: boolean): InterviewQuickSuggestion[] {
  if (!narrative) return suggestions;
  return suggestions.filter((s) => !SELF_HELP_CHIP_LABELS.has(s.label));
}

export function getContextualQuickSuggestions(
  questionKey: string,
  state: GuidedInterviewState,
): InterviewQuickSuggestion[] {
  const signals = inferInterviewBookSignals(state);
  const category = resolveCategory(signals);

  if (audienceKeys(questionKey)) {
    return avoidSelfHelpForNarrative(TARGET_BY_CATEGORY[category].slice(0, 6), signals.isNarrative);
  }

  if (toneKeys(questionKey)) {
    const tone = TONE_BY_CATEGORY[category];
    if (tone?.length) return tone.slice(0, 4);
  }

  if (questionKey === "promise" || questionKey === "depthFinalDirection") {
    const direction = getDirectionFallbackSuggestions(state);
    if (questionKey === "depthFinalDirection" && direction.length > 0) {
      return direction;
    }
    if (category === "gothic-dark") {
      return [
        chip("Segreti di famiglia", "Segreti di famiglia che emergono piano piano."),
        chip("Presagi e ombre", "Presagi, ombre e verità sepolte nel passato."),
        chip("Mistero elegante", "Un mistero elegante che non si rivela troppo presto."),
        chip("Atmosfera gotica", "Un'atmosfera gotica che avvolge ogni scena."),
      ];
    }
    if (category === "thriller-horror") {
      return [
        chip("Verità instabile", "Una verità instabile che cambia ciò che il lettore crede."),
        chip("Minaccia vicina", "Una minaccia vicina, umana, impossibile da ignorare."),
        chip("Indizi e sospetti", "Indizi e sospetti che si accumulano fino al crollo."),
        chip("Rivelazione finale", "Una rivelazione finale che ribalta tutto."),
      ];
    }
    if (category === "romance" || category === "dark-romance") {
      return [
        chip("Segreto emotivo", "Un segreto emotivo che non deve uscire troppo presto."),
        chip("Desiderio trattenuto", "Desiderio trattenuto fino al punto di rottura."),
        chip("Scelta impossibile", "Una scelta impossibile tra cuore e conseguenze."),
        chip("Finale catartico", "Un finale catartico che resta addosso."),
      ];
    }
    if (category === "study") {
      return [
        chip("Metodo chiaro", "Un metodo chiaro per affrontare l'esame senza panico."),
        chip("Comprensione reale", "Capire davvero i concetti, non solo memorizzarli."),
        chip("Ripasso efficace", "Un sistema di ripasso efficace e realistico."),
        chip("Sicurezza all'orale", "Più sicurezza e struttura all'esame orale."),
      ];
    }
  }

  if (questionKey === "centralConflict" || questionKey === "depthCoreFear") {
    if (category === "gothic-dark" || category === "thriller-horror") {
      return [
        chip("Segreto sepolto", "Un segreto sepolto che torna a galla."),
        chip("Minaccia vicina", "Una minaccia vicina che sembrava impossibile."),
        chip("Verità negata", "Una verità negata troppo a lungo."),
        chip("Equilibrio rotto", "Un evento che rompe un equilibrio fragile."),
      ];
    }
  }

  if (questionKey === "setting") {
    if (category === "gothic-dark") {
      return [
        chip("Villa decadente", "Una villa decadente, pioggia, nebbia e silenzi."),
        chip("Città antica", "Una città antica piena di memoria e ombre."),
        chip("Interno claustrofobico", "Interni claustrofobici, corridor, porte chiuse."),
        chip("Luogo maledetto", "Un luogo che sembra respirare presagi."),
      ];
    }
  }

  if (questionKey === "depthDoNotBecome") {
    if (signals.isNarrative) {
      return [
        chip("Non self-help", "Non deve diventare un saggio motivazionale."),
        chip("Non generico", "Non deve diventare una storia generica senza identità."),
        chip("Non troppo esplicito", "Non deve tradire il tono con eccesso di spiegazioni."),
        chip("Non cambiare genere", "Non deve cambiare genere senza motivo narrativo."),
      ];
    }
  }

  if (questionKey === "depthPacingChoice") {
    if (category === "gothic-dark") {
      return [
        chip("Lento e inquietante", "Lento e inquietante, con presagi e silenzi."),
        chip("Elegante e oscuro", "Elegante e oscuro, mai frettoloso."),
        chip("Cinematografico", "Cinematografico, immersivo, denso di atmosfera."),
        chip("Teso ma lirico", "Teso ma lirico, con bellezza dentro l'ombra."),
      ];
    }
  }

  return [];
}

export function getContextualQuestionCopy(
  questionKey: string,
  state: GuidedInterviewState,
): { question?: string; helper?: string } {
  const signals = inferInterviewBookSignals(state);
  const category = resolveCategory(signals);

  if (questionKey === "targetReader") {
    if (category === "gothic-dark") {
      return {
        question: "Chi ama davvero questo tipo di oscurità elegante?",
        helper: "Pensa a lettori di gotico, segreti, presagi e atmosfere raffinate.",
      };
    }
    if (category === "thriller-horror") {
      return {
        question: "A chi vuoi far venire il fiato corto?",
        helper: "Lettori di tensione, paura umana, mistero o verità instabile.",
      };
    }
    if (category === "romance" || category === "dark-romance") {
      return {
        question: "Per quale lettore deve essere impossibile smettere di leggere?",
        helper: "Romance, slow burn, ferite emotive, attrazione, proibito.",
      };
    }
    if (category === "study") {
      return {
        question: "Quale studente deve sentirsi finalmente preparato?",
        helper: "Università, esame, verifica, metodo, panico da prestazione.",
      };
    }
    if (category === "self-help") {
      return {
        question: "Chi ha bisogno davvero di questo cambiamento?",
        helper: "Persone bloccate, professionisti, creativi — il più concreto possibile.",
      };
    }
    if (category === "poetry") {
      return {
        question: "Chi deve sentirsi attraversato da queste pagine?",
        helper: "Lettori sensibili, amanti di immagini, voce, dolore e bellezza.",
      };
    }
  }

  if (questionKey === "emotionalTone" && category === "gothic-dark") {
    return {
      question: "Che atmosfera gotica immagini: decadente, elegante, claustrofobica, inquietante?",
      helper: "Presagi, ombre, silenzi, bellezza dentro l'oscurità.",
    };
  }

  if (questionKey === "readerTransformation" && signals.isNarrative) {
    return {
      question: "Che emozione o paura vuoi lasciare nel lettore quando chiude il libro?",
      helper: "Non cosa impara — cosa sente, cosa gli resta addosso.",
    };
  }

  if (questionKey === "promise" && category === "thriller-horror") {
    return {
      question: "Cosa il lettore deve scoprire poco alla volta?",
      helper: "Indizi, sospetti, verità instabile, minaccia che si avvicina.",
    };
  }

  return {};
}

export function enrichInterviewQuestion(
  state: GuidedInterviewState,
  question: { key: string; question: string; helper?: string; quickSuggestions?: InterviewQuickSuggestion[] },
): typeof question {
  const copy = getContextualQuestionCopy(question.key, state);
  const suggestions = getContextualQuickSuggestions(question.key, state);
  const foundation = state.bookFoundation;
  const cast = foundation?.foundationCharacters ?? [];
  const genre = foundation?.genre ?? state.selectedGenre ?? state.extracted?.genre ?? "fiction";
  const enrichedQuestion =
    cast.length > 0
      ? buildCharacterAwareQuestionPrompt(
          copy.question ?? question.question,
          cast,
          String(genre),
        )
      : copy.question ?? question.question;
  return {
    ...question,
    question: enrichedQuestion,
    helper: copy.helper ?? question.helper,
    quickSuggestions:
      suggestions.length > 0 ? suggestions : question.quickSuggestions,
  };
}

export function suggestionsAvoidSelfHelpMismatch(
  suggestions: InterviewQuickSuggestion[],
  state: GuidedInterviewState,
): InterviewQuickSuggestion[] {
  const signals = inferInterviewBookSignals(state);
  return avoidSelfHelpForNarrative(suggestions, signals.isNarrative);
}

export function getDirectionFallbackSuggestions(
  state: GuidedInterviewState,
): InterviewQuickSuggestion[] {
  const signals = inferInterviewBookSignals(state);
  const category = resolveCategory(signals);

  if (category === "gothic-dark" || category === "thriller-horror") {
    return [
      chip("Storia oscura e gotica", "Una storia oscura, emotiva, gotica, piena di presagi e ombre."),
      chip("Mistero e colpi di scena", "Un mistero con segreti, tensione e colpi di scena."),
      chip("Horror psicologico", "Horror psicologico realistico, con minaccia vicina."),
      chip("Non lo so ancora", "Non lo so ancora: aiutami a capirlo parlando."),
    ];
  }

  if (category === "romance" || category === "dark-romance") {
    return [
      chip("Romance pieno di tensione", "Un romance pieno di tensione, desiderio e ferite emotive."),
      chip("Slow burn", "Un slow burn intenso, lento, magnetico."),
      chip("Dark romance", "Un dark romance proibito, adulto, rischioso."),
      chip("Non lo so ancora", "Non lo so ancora: aiutami a capirlo parlando."),
    ];
  }

  if (category === "self-help" || category === "business" || category === "study") {
    return [
      chip("Guida pratica", "Una guida pratica, concreta, orientata al risultato."),
      chip("Percorso di trasformazione", "Un percorso di trasformazione reale per lettori concreti."),
      chip("Manuale operativo", "Un manuale operativo, chiaro, passo dopo passo."),
      chip("Non lo so ancora", "Non lo so ancora: aiutami a capirlo parlando."),
    ];
  }

  return [
    chip("Storia oscura e gotica", "Una storia oscura, emotiva, gotica."),
    chip("Romance pieno di tensione", "Un romance pieno di tensione e attrazione."),
    chip("Mistero e segreti", "Un mistero con segreti e colpi di scena."),
    chip("Non lo so ancora", "Non lo so ancora: aiutami a capirlo parlando."),
  ];
}

export function getContinueCtaLabel(ready: boolean, hasPendingInput: boolean): string {
  if (ready) return "Apri il DNA del libro";
  if (hasPendingInput) return "Rispondi a Scriptora";
  return "Fammi un'altra domanda";
}
