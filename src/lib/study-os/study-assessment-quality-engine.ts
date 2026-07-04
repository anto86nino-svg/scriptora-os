import type {
  DifficultWord,
  Flashcard,
  OpenStudyQuestion,
  QuizQuestion,
  StudyDifficultyLevel,
  StudyExercise,
  StudyMaterialClassification,
} from "@/lib/study-session";

export type ExamQuestionType =
  | "definizione"
  | "causa-effetto"
  | "cronologia"
  | "confronto"
  | "collegamento"
  | "conseguenze"
  | "interrogazione-aperta"
  | "trabocchetto"
  | "sintesi-finale";

export interface AssessmentExamQuestion {
  tipo: ExamQuestionType;
  difficolta: "facile" | "media" | "difficile";
  domanda: string;
  rispostaAttesa: string;
  spiegazione: string;
  concettiVerificati: string[];
  criterioValutazione?: string;
}

export interface DidacticAssessmentPack {
  examQuestions: AssessmentExamQuestion[];
  openQuestions: OpenStudyQuestion[];
  quiz: QuizQuestion[];
  trueFalse: QuizQuestion[];
  exercises: StudyExercise[];
  studyNotesPro: string;
  flashcards: Flashcard[];
  enrichedVocabulary: DifficultWord[];
}

export const BANNED_DIDACTIC_PHRASES = [
  /è importante perché aiuta a capire cause, eventi e conseguenze/i,
  /collegalo al tema centrale/i,
  /definiscilo con parole tue/i,
  /è rilevante nello svolgimento degli eventi/i,
  /termine generico/i,
  /spiega il significato di .+ nel testo/i,
  /nel materiale studiato\?$/i,
];

const WEAK_QUESTION_PATTERN =
  /^(che cosa significa|spiega il significato|perché .+ è importante)\b/i;

const WEAK_NEL_TESTO = /\bnel testo\b/i;

interface ConceptBucket {
  id: string;
  test: RegExp;
  maxPerSection: number;
}

const WWI_CONCEPT_BUCKETS: ConceptBucket[] = [
  { id: "cause-nazionalismo", test: /\bnazionalismo\b/i, maxPerSection: 2 },
  { id: "cause-imperialismo", test: /\bimperialismo\b/i, maxPerSection: 2 },
  { id: "cause-militarismo", test: /\bmilitarismo\b/i, maxPerSection: 2 },
  { id: "cause-alleanze", test: /\btriplice|alleanz/i, maxPerSection: 2 },
  { id: "scoppio-sarajevo", test: /\bsarajevo\b/i, maxPerSection: 2 },
  { id: "guerra-trincee", test: /\btrince|verdun|somme\b/i, maxPerSection: 2 },
  { id: "italia-neutralita", test: /\bneutralit|interventist|patto di londra\b/i, maxPerSection: 2 },
  { id: "italia-caporetto", test: /\bcaporetto\b/i, maxPerSection: 2 },
  { id: "italia-piave", test: /\bpiave|vittorio veneto\b/i, maxPerSection: 2 },
  { id: "svolta-1917", test: /\b1917\b|\brivoluzione russa\b|\bstati uniti\b/i, maxPerSection: 2 },
  { id: "fine-armistizio", test: /\barmistizio\b|\b11 novembre\b/i, maxPerSection: 2 },
  { id: "conseguenze-versailles", test: /\bversailles\b|\btrattat/i, maxPerSection: 2 },
  { id: "conseguenze-imperi", test: /\bimperi\b|\bcroll\b/i, maxPerSection: 2 },
  { id: "conseguenze-instabilita", test: /\binstabil|tensioni|dopoguerra\b/i, maxPerSection: 2 },
];

function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N}\s]/gu, "").trim();
}

function questionStem(text: string): string {
  return normalizeKey(text.replace(/\?+$/, "").slice(0, 72));
}

export function isWeakAssessmentQuestion(question: string): boolean {
  const clean = question.replace(/\s+/g, " ").trim();
  if (WEAK_NEL_TESTO.test(clean)) return true;
  if (/^perché .+ è importante\?$/i.test(clean) && !/\b(1914|1917|1918|sarajevo|caporetto|versailles|trince)\b/i.test(clean)) {
    return true;
  }
  return WEAK_QUESTION_PATTERN.test(clean);
}

export function containsBannedDidacticPhrase(text: string): boolean {
  return BANNED_DIDACTIC_PHRASES.some((pattern) => pattern.test(text));
}

export function isSemanticallyDuplicate(a: string, b: string): boolean {
  const ka = questionStem(a);
  const kb = questionStem(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const wordsA = new Set(ka.split(/\s+/).filter((w) => w.length > 4));
  const wordsB = new Set(kb.split(/\s+/).filter((w) => w.length > 4));
  if (!wordsA.size || !wordsB.size) return false;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap += 1;
  const ratio = overlap / Math.min(wordsA.size, wordsB.size);
  return ratio >= 0.72;
}

function bucketForText(text: string): string | null {
  for (const bucket of WWI_CONCEPT_BUCKETS) {
    if (bucket.test.test(text)) return bucket.id;
  }
  return null;
}

export function deduplicateAssessmentItems<T>(
  items: T[],
  getText: (item: T) => string,
  buckets: ConceptBucket[] = WWI_CONCEPT_BUCKETS,
): T[] {
  const seenStems = new Set<string>();
  const bucketCounts = new Map<string, number>();
  const result: T[] = [];

  for (const item of items) {
    const text = getText(item);
    const stem = questionStem(text);
    if (seenStems.has(stem)) continue;
    if ([...seenStems].some((existing) => isSemanticallyDuplicate(existing, stem))) continue;

    const bucketId = bucketForText(text);
    if (bucketId) {
      const max = buckets.find((b) => b.id === bucketId)?.maxPerSection ?? 2;
      const count = bucketCounts.get(bucketId) ?? 0;
      if (count >= max) continue;
      bucketCounts.set(bucketId, count + 1);
    }

    seenStems.add(stem);
    result.push(item);
  }
  return result;
}

export function isWwiHistoryText(text: string): boolean {
  const lower = text.toLowerCase();
  const signals = [
    /\bprima guerra mondiale\b/,
    /\b1914\b/,
    /\bsarajevo\b/,
    /\bversailles\b/,
    /\bcaporetto\b/,
    /\bnazionalismo\b/,
  ];
  return signals.filter((re) => re.test(lower)).length >= 4;
}

function buildWwiExamQuestions(): AssessmentExamQuestion[] {
  return [
    {
      tipo: "definizione",
      difficolta: "facile",
      domanda: "Cosa si intende per nazionalismo nel contesto prebellico europeo e perché fu particolarmente esplosivo nei Balcani?",
      rispostaAttesa: "Il nazionalismo esalta l'identità del proprio popolo e la rivendicazione di uno Stato nazionale; nei Balcani alimentò rivalità tra comunità che volevano uscire dal controllo degli imperi.",
      spiegazione: "Una buona definizione collega l'ideologia al caso concreto balcanico citato nel materiale.",
      concettiVerificati: ["nazionalismo", "Balcani"],
    },
    {
      tipo: "causa-effetto",
      difficolta: "media",
      domanda: "In che modo il sistema di alleanze trasformò l'attentato di Sarajevo in una guerra europea?",
      rispostaAttesa: "L'attentato scatenò l'ultimatum austro-ungarico alla Serbia; le alleanze (Triplice Alleanza e Triplice Intesa) fecero sì che un conflitto locale coinvolgesse rapidamente le grandi potenze.",
      spiegazione: "Serve collegare detonatore (Sarajevo), meccanismo (alleanze) ed escalation.",
      concettiVerificati: ["Sarajevo", "alleanze", "Triplice Intesa"],
    },
    {
      tipo: "cronologia",
      difficolta: "media",
      domanda: "Ordina e spiega la sequenza: Patto di Londra, Caporetto, Piave, Vittorio Veneto.",
      rispostaAttesa: "1915 Patto di Londra e intervento italiano; 1917 disfatta di Caporetto; 1918 resistenza sul Piave e vittoria di Vittorio Veneto con armistizio austro-ungarico.",
      spiegazione: "La cronologia italiana va collegata a cause e svolta del conflitto.",
      concettiVerificati: ["Italia", "Caporetto", "Piave", "Vittorio Veneto"],
    },
    {
      tipo: "confronto",
      difficolta: "difficile",
      domanda: "Confronta neutralisti e interventisti: quali obiettivi politici li dividevano nel 1914-1915?",
      rispostaAttesa: "I neutralisti volevano tenere l'Italia fuori dal conflitto; gli interventisti chiedevano la guerra per ottenere terre irredente e prestigio, come nel Patto di Londra del 1915.",
      spiegazione: "Il confronto deve mostrare posizioni opposte e l'esito diplomatico.",
      concettiVerificati: ["neutralità", "interventismo", "Patto di Londra"],
    },
    {
      tipo: "collegamento",
      difficolta: "media",
      domanda: "Come collega il 1917 la crisi italiana di Caporetto alla svolta generale del conflitto?",
      rispostaAttesa: "Caporetto fu una grave sconfitta italiana, mentre nel 1917 la Russia uscì dal conflitto e entrarono gli Stati Uniti, modificando l'equilibrio a favore degli Alleati.",
      spiegazione: "Collegamento tra fronte italiano e dinamica globale del 1917.",
      concettiVerificati: ["1917", "Caporetto", "Russia", "Stati Uniti"],
    },
    {
      tipo: "conseguenze",
      difficolta: "media",
      domanda: "Quali conseguenze politiche ed economiche ebbe il Trattato di Versailles sulla Germania e sull'Europa?",
      rispostaAttesa: "Impose riparazioni, perdite territoriali e limitazioni militari alla Germania; ridisegnò le mappe e alimentò risentimenti che influenzarono il dopoguerra.",
      spiegazione: "Conseguenze immediate e tensioni di lungo periodo.",
      concettiVerificati: ["Versailles", "conseguenze", "Germania"],
    },
    {
      tipo: "interrogazione-aperta",
      difficolta: "difficile",
      domanda: "Perché la guerra di trincea cambiò il modo di combattere rispetto alle aspettative iniziali di guerra breve?",
      rispostaAttesa: "Le aspettative erano di guerra movimentata; invece artiglierie, mitragliatrici e gas resero il fronte occidentale un logoramento statico con perdite enormi (Verdun, Somme).",
      spiegazione: "Risposta aperta con contrasto aspettativa/realtà ed esempi.",
      concettiVerificati: ["trincee", "Verdun", "Somme"],
      criterioValutazione: "6=solo trincee; 7-8=collega armi e logoramento; 9-10=esempi e conseguenze sul soldato.",
    },
    {
      tipo: "trabocchetto",
      difficolta: "difficile",
      domanda: "Vero o falso: l'Italia entrò in guerra nel 1914 insieme alla Triplice Alleanza contro la Francia. Giustifica.",
      rispostaAttesa: "Falso: l'Italia dichiarò neutralità nel 1914 e intervenne solo nel 1915 contro l'Austria-Ungheria dopo il Patto di Londra.",
      spiegazione: "Trabocchetto classico: confondere alleanza prebellica e scelta italiana del 1915.",
      concettiVerificati: ["Italia", "neutralità", "1915"],
    },
    {
      tipo: "sintesi-finale",
      difficolta: "difficile",
      domanda: "In sintesi, quali furono cause strutturali, scintilla immediata e tre conseguenze durature della Prima guerra mondiale?",
      rispostaAttesa: "Cause: nazionalismo, imperialismo, militarismo, alleanze. Scintilla: Sarajevo. Conseguenze: crollo imperi, Versailles e instabilità, trasformazioni sociali ed economiche.",
      spiegazione: "Sintesi da verifica orale con struttura causa-evento-conseguenza.",
      concettiVerificati: ["cause", "Sarajevo", "conseguenze"],
      criterioValutazione: "Valuta completezza, ordine logico e almeno tre conseguenze distinte.",
    },
    {
      tipo: "causa-effetto",
      difficolta: "facile",
      domanda: "Quale ruolo ebbero imperialismo e militarismo nell'aumentare le tensioni tra le potenze prima del 1914?",
      rispostaAttesa: "L'imperialismo accese la competizione per colonie e mercati; il militarismo favorì la corsa agli armamenti e piani di mobilitazione che resero difficile evitare la guerra dopo la crisi.",
      spiegazione: "Due cause strutturali spiegate con meccanismo, non solo elenco.",
      concettiVerificati: ["imperialismo", "militarismo"],
    },
  ];
}

function examToOpenQuestion(item: AssessmentExamQuestion): OpenStudyQuestion {
  const sections = [
    `Risposta modello: ${item.rispostaAttesa}`,
    `Perché è corretta: ${item.spiegazione}`,
  ];
  if (item.criterioValutazione) sections.push(`Criteri voto (6-10): ${item.criterioValutazione}`);
  if (item.tipo === "interrogazione-aperta" || item.tipo === "sintesi-finale") {
    sections.push("Follow-up professore: Puoi approfondire con una data precisa o un esempio di battaglia che confermi quanto detto?");
    sections.push("Trabocchetto: Attenzione a non confondere cause strutturali (nazionalismo, alleanze) con la sola spiegazione «perché è successo a Sarajevo».");
  }
  if (item.tipo === "trabocchetto") {
    sections.push("Follow-up professore: E se ti chiedessi perché l'Italia non entrò subito al fianco della Germania?");
    sections.push("Trabocchetto: Non confondere membership dell'alleanza con la decisione di guerra del 1915.");
  }

  const defaultFollowUp = "Puoi collegare questo punto a un altro evento o concetto del periodo studiato?";
  const defaultTrap = item.tipo === "trabocchetto"
    ? "Non confondere data o coalizione con una spiegazione monocausale."
    : undefined;

  return {
    question: item.domanda,
    answerGuide: sections.join("\n"),
    questionType: item.tipo,
    difficulty: item.difficolta,
    verifiedConcepts: item.concettiVerificati,
    modelAnswer: item.rispostaAttesa,
    shortAnswer: item.rispostaAttesa.split(/[.;]/)[0]?.trim(),
    gradingCriteria: item.criterioValutazione,
    oralFollowUp: item.tipo === "trabocchetto"
      ? "Perché l'Italia restò neutrale nel 1914 nonostante la Triplice Alleanza?"
      : item.tipo === "interrogazione-aperta" || item.tipo === "sintesi-finale"
        ? "Puoi collegare questo punto a un altro evento del 1917 o 1918?"
        : defaultFollowUp,
    oralTrap: item.tipo === "trabocchetto"
      ? "L'Italia combatté al fianco della Germania fin dall'inizio."
      : defaultTrap,
  };
}

function buildWwiQuiz(): { quiz: QuizQuestion[]; trueFalse: QuizQuestion[] } {
  const mc: QuizQuestion[] = [
    {
      question: "Quale evento del 28 giugno 1914 è considerato il detonatore immediato della crisi europea?",
      options: ["Battaglia di Caporetto", "Attentato di Sarajevo", "Armistizio dell'11 novembre", "Firma del Patto di Londra"],
      answer: 1,
      explanation: "L'omicidio dell'arciduca Francesco Ferdinando scatenò l'ultimatum austro-ungarico e la mobilitazione per alleanze.",
      difficulty: "easy",
      type: "multiple-choice",
      learningLevel: "memory",
      sourceReference: "Scoppio guerra",
      testedSkill: "cronologia",
      commonMistake: "Confondere Sarajevo (1914) con Caporetto (1917).",
    },
    {
      question: "Quale alleanza opponeva principalmente Francia, Russia e Gran Bretagna?",
      options: ["Triplice Alleanza", "Triplice Intesa", "Asse Roma-Berlino", "Patto di Londra"],
      answer: 1,
      explanation: "La Triplice Intesa era la coalizione contrapposta alle potenze centrali.",
      difficulty: "medium",
      type: "multiple-choice",
      learningLevel: "understanding",
      sourceReference: "Alleanze",
      testedSkill: "definizione",
      commonMistake: "Scambiare Intesa e Alleanza.",
    },
    {
      question: "Perché il 1917 è un anno di svolta nel conflitto?",
      options: [
        "Perché inizia solo allora la guerra di trincea",
        "Perché la Russia esce dal conflitto e entrano gli Stati Uniti",
        "Perché l'Italia dichiara neutralità",
        "Perché viene firmato il Trattato di Versailles",
      ],
      answer: 1,
      explanation: "1917 segna l'uscita della Russia e l'intervento americano, spostando l'equilibrio.",
      difficulty: "hard",
      type: "multiple-choice",
      learningLevel: "exam",
      sourceReference: "1917",
      testedSkill: "causa-effetto",
      commonMistake: "Attribuire Versailles (1919) al 1917.",
    },
    {
      question: "Completa: dopo la disfatta di Caporetto, l'esercito italiano resistette sul fiume ______.",
      options: ["Po", "Piave", "Adige", "Tagliamento"],
      answer: 1,
      explanation: "La resistenza sul Piave nel 1918 precedette Vittorio Veneto.",
      difficulty: "medium",
      type: "short-answer",
      learningLevel: "memory",
      sourceReference: "Italia",
      testedSkill: "completamento",
      commonMistake: "Confondere Piave con altri fiumi del fronte.",
    },
    {
      question: "Metti in ordine cronologico: A) Armistizio 1918 B) Patto di Londra C) Attentato Sarajevo D) Caporetto",
      options: ["C-B-D-A", "B-C-A-D", "C-D-B-A", "D-C-B-A"],
      answer: 0,
      explanation: "Sarajevo 1914, Patto di Londra 1915, Caporetto 1917, armistizio 1918.",
      difficulty: "hard",
      type: "multiple-choice",
      learningLevel: "exam",
      sourceReference: "Cronologia",
      testedSkill: "ordine cronologico",
      commonMistake: "Invertire Caporetto e Patto di Londra.",
    },
    {
      question: "Completa: il patto difensivo tra Germania, Austria-Ungheria e Italia si chiamava Triplice ______.",
      options: ["Intesa", "Alleanza", "Lega", "Coalizione"],
      answer: 1,
      explanation: "La Triplice Alleanza si contrapponeva alla Triplice Intesa.",
      difficulty: "easy",
      type: "short-answer",
      learningLevel: "memory",
      sourceReference: "Alleanze",
      testedSkill: "completamento",
      commonMistake: "Scrivere Intesa invece di Alleanza.",
    },
    {
      question: "Breve risposta: perché l'Italia inizialmente dichiarò neutralità nel 1914?",
      options: ["Risposta aperta — verifica con la guida"],
      answer: 0,
      explanation: "Il patto difensivo non obbligava a una guerra di aggressione; inoltre divise neutralisti e interventisti.",
      difficulty: "medium",
      type: "open",
      learningLevel: "application",
      sourceReference: "Italia",
      testedSkill: "risposta breve",
    },
    {
      question: "Domanda aperta: quali conseguenze ebbe il crollo degli imperi centrali sul mappe europee?",
      options: ["Risposta aperta — verifica con la guida"],
      answer: 0,
      explanation: "Nacquero nuovi Stati, scomparvero imperi multietnici e si ridisegnarono confini con nuove tensioni.",
      difficulty: "hard",
      type: "open",
      learningLevel: "exam",
      sourceReference: "Conseguenze",
      testedSkill: "domanda aperta",
    },
  ];

  const tf: QuizQuestion[] = [
    {
      question: "Vero o falso: la guerra di trincea caratterizzò soprattutto il fronte occidentale con battaglie logoranti?",
      options: ["Vero", "Falso"],
      answer: 0,
      explanation: "Verdun e la Somme sono esempi di logoramento in trincea sul fronte occidentale.",
      difficulty: "easy",
      type: "true-false",
      learningLevel: "understanding",
      commonMistake: "Pensare che tutti i fronti fossero identici alla trincea.",
    },
    {
      question: "Vero o falso: il Trattato di Versailles del 1919 impose condizioni severe alla Germania?",
      options: ["Vero", "Falso"],
      answer: 0,
      explanation: "Riconobbe responsabilità tedesca, riparazioni e limitazioni militari.",
      difficulty: "medium",
      type: "true-false",
      learningLevel: "memory",
      commonMistake: "Confondere armistizio (1918) con trattato di pace (1919).",
    },
    {
      question: "Vero o falso: l'imperialismo riduceva le tensioni perché divideva equamente le colonie?",
      options: ["Vero", "Falso"],
      answer: 1,
      explanation: "L'imperialismo aumentò la competizione per colonie e mercati, alimentando rivalità.",
      difficulty: "medium",
      type: "true-false",
      learningLevel: "exam",
      commonMistake: "Considerare l'imperialismo pacificatore.",
    },
  ];

  return { quiz: mc, trueFalse: tf };
}

function buildWwiExercises(): StudyExercise[] {
  return [
    {
      id: "wwi-date-1",
      type: "guided",
      prompt: "Indica tre date-chiave tra 1914 e 1919 e associa a ciascuna un evento della Prima guerra mondiale.",
      solution: "1914 Sarajevo e scoppio guerra; 1917 Caporetto e svolta con USA; 1918 armistizio e 1919 Versailles.",
      explanation: "Le date devono essere collegate a eventi precisi, non elencate a caso.",
      difficulty: "easy",
      level: "Base",
      exerciseType: "risposta breve",
      sourceConcept: "cronologia",
      hint: "Usa almeno una data italiana e una europea generale.",
      estimatedMinutes: 8,
      objective: "Memorizzare date essenziali con significato storico.",
      guidedCorrection: "Per ogni data chiediti: causa, evento o conseguenza?",
      commonError: "Elencare date senza spiegare cosa accadde.",
    },
    {
      id: "wwi-cause-1",
      type: "reasoning",
      prompt: "Spiega la catena causa-effetto: nazionalismo nei Balcani → attentato di Sarajevo → sistema di alleanze.",
      solution: "Il nazionalismo serbo contribuì all'attentato; l'ultimatum e le alleanze trasformarono la crisi in guerra europea.",
      explanation: "Verifica comprensione delle cause profonde e del meccanismo di escalation.",
      difficulty: "medium",
      level: "Intermedio",
      exerciseType: "collegamenti",
      sourceConcept: "nazionalismo",
      estimatedMinutes: 12,
      objective: "Collegare cause strutturali e scintilla immediata.",
      guidedCorrection: "Ogni passaggio deve avere un connettore logico (perciò, di conseguenza).",
      commonError: "Spiegare solo Sarajevo ignorando nazionalismo e alleanze.",
    },
    {
      id: "wwi-distinguish-1",
      type: "reasoning",
      prompt: "Distingui Triplice Alleanza e Triplice Intesa: membri principali e obiettivo del patto.",
      solution: "Alleanza: Germania, Austria-Ungheria, Italia (prebellico). Intesa: Francia, Russia, Gran Bretagna. Entrambe erano difensive ma amplificarono l'effetto domino.",
      explanation: "Confronto essenziale per interrogazioni sulle cause.",
      difficulty: "medium",
      level: "Intermedio",
      exerciseType: "confronto",
      sourceConcept: "Triplice Intesa",
      estimatedMinutes: 10,
      objective: "Distinguere coalizioni senza invertirle.",
      guidedCorrection: "Scrivi due colonne: Alleanza | Intesa.",
      commonError: "Confondere i due blocchi o dimenticare l'Italia nella Triplice Alleanza prebellica.",
    },
    {
      id: "wwi-link-1",
      type: "application",
      prompt: "Collega Caporetto (1917) alla successiva resistenza sul Piave e a Vittorio Veneto (1918).",
      solution: "Caporetto provocò crisi e ripiegamento; sul Piave l'esercito si riorganizzò; Vittorio Veneto segnò la vittoria decisiva e l'armistizio austro-ungarico.",
      explanation: "Esercizio di collegamento tra eventi italiani.",
      difficulty: "hard",
      level: "Avanzato",
      exerciseType: "collegamenti",
      sourceConcept: "Caporetto",
      estimatedMinutes: 15,
      objective: "Ricostruire la svolta italiana del conflitto.",
      guidedCorrection: "Usa connettivi temporali: dopo, tuttavia, infine.",
      commonError: "Trattare Caporetto e Vittorio Veneto come eventi scollegati.",
    },
    {
      id: "wwi-oral-1",
      type: "free",
      prompt: "Interrogazione orale (2 minuti): «Riassumi cause, svolta del 1917 e fine del conflitto».",
      solution: "Cause strutturali + Sarajevo; 1917 Caporetto, Russia fuori, USA dentro; 1918 armistizio e poi Versailles.",
      explanation: "Simula struttura da colloquio con professor che chiede sintesi.",
      difficulty: "hard",
      level: "Verifica finale",
      exerciseType: "interrogazione orale",
      sourceConcept: "sintesi",
      estimatedMinutes: 5,
      objective: "Organizzare un discorso orale coerente.",
      guidedCorrection: "Apri con periodo, poi tre blocchi: cause, 1917, fine.",
      commonError: "Perdersi nei dettagli senza chiusura sulle conseguenze.",
    },
    {
      id: "wwi-short-1",
      type: "guided",
      prompt: "Risposta breve: perché l'Italia firmò il Patto di Londra nel 1915?",
      solution: "Per entrare in guerra contro l'Austria-Ungheria ottenendo promesse di terre irredente e maggiore prestigio, dopo il dibattito neutralisti/interventisti.",
      explanation: "Verifica motivazioni dell'intervento italiano.",
      difficulty: "medium",
      level: "Intermedio",
      exerciseType: "risposta breve",
      sourceConcept: "Patto di Londra",
      estimatedMinutes: 7,
      objective: "Spiegare scelte di politica estera italiana.",
      guidedCorrection: "Cita almeno neutralità iniziale e obiettivi interventisti.",
      commonError: "Dire che l'Italia entrò in guerra nel 1914.",
    },
    {
      id: "wwi-prep-1",
      type: "free",
      prompt: "Preparati a rispondere: «Quali furono le conseguenze del Trattato di Versailles?» con almeno tre aspetti.",
      solution: "Politico: riorganizzazione mappe e risentimenti tedeschi; economico: riparazioni; sociale: trauma e nuovi equilibri.",
      explanation: "Preparazione mirata a domanda frequente d'esame.",
      difficulty: "hard",
      level: "Verifica finale",
      exerciseType: "spiegazione aperta",
      sourceConcept: "Versailles",
      estimatedMinutes: 12,
      objective: "Argomentare conseguenze su più piani.",
      guidedCorrection: "Usa etichette: sul piano politico/economico/socialmente.",
      commonError: "Limitarsi a «fu duro per la Germania» senza esempi.",
    },
  ];
}

function buildWwiStudyNotesPro(title: string): string {
  return [
    "Scheda Studio Pro",
    "",
    `Tema: ${title}`,
    "",
    "Cosa devi sapere",
    "• Quattro cause strutturali: nazionalismo, imperialismo, militarismo, alleanze.",
    "• Scintilla: attentato di Sarajevo (28 giugno 1914) e effetto domino delle alleanze.",
    "• Caratteri della guerra: trincee, armi moderne, logoramento (Verdun, Somme).",
    "• Italia: neutralità → Patto di Londra 1915 → Caporetto 1917 → Piave → Vittorio Veneto 1918.",
    "• Svolta 1917: Russia esce, USA entrano; fine con armistizio 11 novembre 1918.",
    "• Conseguenze: crollo imperi, Versailles 1919, instabilità del dopoguerra.",
    "",
    "Da memorizzare",
    "• 28/06/1914 — Attentato di Sarajevo",
    "• 1915 — Patto di Londra e intervento italiano",
    "• 1917 — Caporetto; Rivoluzione russa; ingresso USA",
    "• 11/11/1918 — Armistizio",
    "• 1919 — Trattato di Versailles",
    "• Triplice Alleanza vs Triplice Intesa",
    "",
    "Per l'interrogazione",
    "• «Professore, le cause vanno distinte in fattori di lungo periodo e detonatore di Sarajevo.»",
    "• «L'Italia restò neutrale nel 1914 perché il patto difensivo non obbligava a una guerra di aggressione.»",
    "• «Caporetto fu una crisi militare, ma sul Piave l'esercito si riorganizzò prima di Vittorio Veneto.»",
    "• «Versailles segnò la pace punitiva con la Germania e ridisegnò l'Europa.»",
  ].join("\n");
}

function buildWwiFlashcards(): Flashcard[] {
  return [
    {
      front: "Quali furono le quattro cause strutturali della Prima guerra mondiale?",
      back: "Nazionalismo, imperialismo, militarismo e sistema di alleanze (Triplice Alleanza vs Triplice Intesa).",
      type: "cause-effect",
      category: "Cause",
      example: "Nei Balcani il nazionalismo alimentò tensioni prima di Sarajevo.",
      commonMistake: "Cercare una sola causa ignorando l'accumulo di fattori.",
    },
    {
      front: "Perché Sarajevo non spiega da solo tutta la guerra?",
      back: "Fu il detonatore immediato, ma le alleanze e le tensioni di lungo periodo trasformarono una crisi locale in conflitto europeo.",
      type: "cause-effect",
      category: "Scoppio",
      commonMistake: "Presentare la guerra come inevitabile solo per un attentato.",
    },
    {
      front: "Cosa cambiò nel 1917 sul piano italiano e globale?",
      back: "Italia: disfatta di Caporetto. Globale: Russia esce dal conflitto, entrano gli Stati Uniti.",
      type: "comparison",
      category: "1917",
      commonMistake: "Omettere la doppia svolta italiana e internazionale.",
    },
    {
      front: "Due conseguenze del Trattato di Versailles",
      back: "Condizioni severe alla Germania (riparazioni, territori) e nuove tensioni che influenzarono il dopoguerra.",
      type: "application",
      category: "Conseguenze",
      commonMistake: "Confondere armistizio (1918) con trattato di pace (1919).",
    },
  ];
}

function enrichVocabularyEntry(word: DifficultWord): DifficultWord {
  const directAnswer = word.simple?.trim() || "";
  const textLink = word.example?.trim() || "";
  const commonError = word.commonMistake?.replace(/termine generico/i, "concetto usato senza spiegare il ruolo storico") || `Confondere "${word.word}" con un'etichetta da memorizzare senza contesto.`;
  const oralPhrase = `«${word.word} si spiega così: ${directAnswer.split(/[.;]/)[0]}.»`;

  const school = [
    `Risposta diretta: ${directAnswer}`,
    `Perché è corretta: collega il termine agli eventi descritti nel capitolo.`,
    `Collegamento al testo: ${textLink}`,
    `Errore comune: ${commonError}`,
    `Frase per interrogazione: ${oralPhrase}`,
  ].join("\n");

  return {
    ...word,
    school,
    commonMistake: commonError,
    examQuestion: oralPhrase.replace(/[«»]/g, ""),
  };
}

export function passesQuizQualityGate(item: QuizQuestion): boolean {
  if (!item.explanation?.trim() || item.explanation.length < 20) return false;
  if (/^Un concetto chiave di/i.test(item.question)) return false;
  if (item.options.some((o) => /irrilevante|fuori contesto|a caso/i.test(o)) && item.options.length >= 4) {
    const weakCount = item.options.filter((o) => /irrilevante|fuori contesto|a caso|dettaglio da ignorare/i.test(o)).length;
    if (weakCount >= 2) return false;
  }
  if (containsBannedDidacticPhrase(`${item.question} ${item.explanation}`)) return false;
  return true;
}

export function passesExerciseQualityGate(item: StudyExercise): boolean {
  if (!item.prompt || !item.solution || !item.explanation) return false;
  if (!item.commonError && !item.hint) return false;
  if (containsBannedDidacticPhrase(`${item.prompt} ${item.solution} ${item.explanation}`)) return false;
  return true;
}

function buildGenericHistoryExamQuestions(
  title: string,
  concepts: string[],
): AssessmentExamQuestion[] {
  const base = concepts.slice(0, 6);
  const templates: Array<{ tipo: ExamQuestionType; diff: AssessmentExamQuestion["difficolta"]; q: (c: string, n?: string) => string; a: (c: string) => string }> = [
    {
      tipo: "definizione",
      diff: "facile",
      q: (c) => `Come definiresti "${c}" nel periodo storico di ${title}?`,
      a: (c) => `Definisci "${c}" con riferimento a cause, protagonisti o conseguenze presenti nel materiale.`,
    },
    {
      tipo: "causa-effetto",
      diff: "media",
      q: (c, n) => `Quale effetto ebbe "${c}" su ${n || "gli eventi successivi"}?`,
      a: (c) => `Collega "${c}" a almeno un evento successivo con connettivo causale esplicito.`,
    },
    {
      tipo: "cronologia",
      diff: "media",
      q: () => `Quali date o fasi sequenziali sono essenziali per ricostruire ${title}?`,
      a: () => "Indica almeno tre tappe in ordine cronologico con evento associato.",
    },
    {
      tipo: "confronto",
      diff: "difficile",
      q: (c, n) => `Cosa distingue "${c}" da "${n || "un concetto affine"}" nel periodo studiato?`,
      a: (c, n) => `Mostra una differenza sostanziale tra "${c}" e "${n}" con esempio.`,
    },
    {
      tipo: "conseguenze",
      diff: "media",
      q: () => `Quali conseguenze a lungo termine derivano dagli eventi descritti in ${title}?`,
      a: () => "Cita almeno due conseguenze su piani politico, sociale o economico.",
    },
    {
      tipo: "interrogazione-aperta",
      diff: "difficile",
      q: () => `In che modo ${title} cambiò equilibri esistenti secondo il materiale?`,
      a: () => "Argomenta con almeno due prove tratte dal capitolo.",
    },
    {
      tipo: "trabocchetto",
      diff: "difficile",
      q: (c) => `"${c}" è l'unica causa del conflitto descritto: vero o falso? Giustifica.`,
      a: (c) => `Falso: "${c}" va inserito in un insieme di fattori; evitare spiegazioni monocausali.`,
    },
    {
      tipo: "sintesi-finale",
      diff: "difficile",
      q: () => `Sintetizza cause, sviluppo e conseguenze di ${title} in un paragrafo da interrogazione.`,
      a: () => "Struttura: contesto, evento centrale, almeno due conseguenze.",
    },
  ];

  return templates.map((tpl, index) => {
    const concept = base[index % base.length] || title;
    const next = base[(index + 1) % base.length] || concept;
    return {
      tipo: tpl.tipo,
      difficolta: tpl.diff,
      domanda: tpl.q(concept, next),
      rispostaAttesa: tpl.a(concept, next),
      spiegazione: "La risposta deve usare lessico storico e prove dal materiale, non frasi generiche.",
      concettiVerificati: [concept],
      criterioValutazione: tpl.diff === "difficile" ? "6= incompleta; 8= corretta con esempi; 10= sintesi argomentata." : undefined,
    };
  }).filter((item) => !isWeakAssessmentQuestion(item.domanda));
}

function buildGenericHistoryStudyNotes(title: string, concepts: string[]): string {
  const know = concepts.slice(0, 5).map((c) => `• Spiega "${c}" con data o protagonista collegato.`);
  const memorize = concepts.slice(0, 4).map((c) => `• ${c}`);
  return [
    "Scheda Studio Pro",
    "",
    `Tema: ${title}`,
    "",
    "Cosa devi sapere",
    ...know,
    "• Collega almeno due eventi con connettivo causale (perciò, di conseguenza).",
    "",
    "Da memorizzare",
    ...memorize,
    "",
    "Per l'interrogazione",
    `• «Professore, partirei dal contesto di ${title} e poi collegherei cause ed eventi principali.»`,
    "• «Preferisco distinguere fattori di lungo periodo dall'evento scatenante.»",
    "• «Concludo sempre con almeno una conseguenza verificabile.»",
  ].join("\n");
}

/** Build school-grade assessment materials with quality gates and deduplication. */
export function buildDidacticAssessmentPack(input: {
  title: string;
  clean: string;
  classification: StudyMaterialClassification;
  keyConcepts: string[];
  difficultyLevel: StudyDifficultyLevel;
  difficultWords: DifficultWord[];
  proLines: string[];
}): DidacticAssessmentPack | null {
  if (input.classification.type !== "history") return null;

  const wwi = isWwiHistoryText(input.clean);
  const examRaw = wwi ? buildWwiExamQuestions() : buildGenericHistoryExamQuestions(input.title, input.keyConcepts);
  const examQuestions = deduplicateAssessmentItems(
    examRaw.filter((q) => !isWeakAssessmentQuestion(q.domanda)),
    (q) => q.domanda,
  );

  const openQuestions = deduplicateAssessmentItems(
    examQuestions.map(examToOpenQuestion),
    (q) => q.question,
  );

  const { quiz: wwiQuiz, trueFalse: wwiTf } = wwi ? buildWwiQuiz() : { quiz: [], trueFalse: [] };
  let quiz = wwiQuiz.length ? wwiQuiz : [];
  let trueFalse = wwiTf.length ? wwiTf : [];

  if (!quiz.length) {
    quiz = [];
  }

  quiz = deduplicateAssessmentItems(quiz.filter(passesQuizQualityGate), (q) => q.question);
  trueFalse = deduplicateAssessmentItems(trueFalse.filter(passesQuizQualityGate), (q) => q.question);

  const exercises = deduplicateAssessmentItems(
    (wwi ? buildWwiExercises() : []).filter(passesExerciseQualityGate),
    (e) => e.prompt,
  );

  const studyNotesPro = wwi
    ? buildWwiStudyNotesPro(input.title)
    : buildGenericHistoryStudyNotes(input.title, input.keyConcepts);

  const flashcards = wwi ? buildWwiFlashcards() : [];
  const enrichedVocabulary = input.difficultWords.map(enrichVocabularyEntry);

  return {
    examQuestions,
    openQuestions,
    quiz,
    trueFalse,
    exercises,
    studyNotesPro,
    flashcards,
    enrichedVocabulary,
  };
}

export function countExamQuestionTypes(questions: AssessmentExamQuestion[]): Record<ExamQuestionType, number> {
  const counts = {} as Record<ExamQuestionType, number>;
  for (const q of questions) {
    counts[q.tipo] = (counts[q.tipo] || 0) + 1;
  }
  return counts;
}
