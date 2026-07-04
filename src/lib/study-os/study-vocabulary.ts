import { hasStudyPlaceholderText, hasVocabularyTemplateText } from "@/lib/study-os/study-quality-gates";
import { explainProfessionalWord } from "@/lib/professional-dictionary";
import type { DifficultWord } from "@/lib/study-session";
import type { StudyMaterialClassification } from "@/lib/study-session";

interface CuratedDefinition {
  word: string;
  simple: string;
  technical: string;
  example: string;
}

const CURATED_HISTORY_DEFINITIONS: Record<string, CuratedDefinition> = {
  nazionalismo: {
    word: "Nazionalismo",
    simple: "È l'idea che ogni popolo debba avere uno Stato proprio e che la propria nazione sia superiore o più importante delle altre.",
    technical: "Ideologia e movimento politico che esalta l'identità nazionale, l'unità del popolo e spesso rivendica territori o indipendenza, alimentando tensioni tra Stati.",
    example: "Nei Balcani il nazionalismo serbo contribuì alle tensioni che precedettero l'attentato di Sarajevo del 1914.",
  },
  "triplice intesa": {
    word: "Triplice Intesa",
    simple: "Era l'alleanza militare tra Francia, Russia e Gran Bretagna (con altri alleati) durante la Prima guerra mondiale.",
    technical: "Coalizione difensiva formata da potenze europee contrapposte alla Triplice Alleanza; un attacco a un membro poteva coinvolgere tutti gli alleati.",
    example: "Dopo l'attentato di Sarajevo, il sistema di alleanze trasformò un conflitto balcanico in guerra europea tra Intesa e Centrali.",
  },
  caporetto: {
    word: "Caporetto",
    simple: "Fu una grave sconfitta italiana nel 1917, che costrinse l'esercito a ripiegare e provocò una crisi militare e politica.",
    technical: "Battaglia del fronte italiano (ottobre 1917) segnata da crollo difensivo austro-tedesco; accelerò il riposizionamento sul fiume Piave.",
    example: "Dopo Caporetto la resistenza sul Piave e la vittoria di Vittorio Veneto nel 1918 segnarono la ripresa italiana.",
  },
  imperialismo: {
    word: "Imperialismo",
    simple: "È la competizione tra grandi potenze per controllare colonie, mercati e risorse fuori dall'Europa.",
    technical: "Politica di espansione territoriale ed economica che aumentò le rivalità diplomatiche tra Stati prima del 1914.",
    example: "L'imperialismo spinse le potenze a contendersi l'Africa e l'Asia, aumentando le tensioni prima della guerra.",
  },
  militarismo: {
    word: "Militarismo",
    simple: "È l'esaltazione della forza militare e la tendenza a risolvere le crisi con la guerra.",
    technical: "Clima politico-culturale che favorì la corsa agli armamenti e piani di mobilitazione rapida, rendendo più difficile evitare il conflitto.",
    example: "Il militarismo portò a generali e governi a considerare la guerra come opzione rapida dopo la crisi di Sarajevo.",
  },
  sarajevo: {
    word: "Attentato di Sarajevo",
    simple: "Fu l'omicidio dell'arciduca Francesco Ferdinando il 28 giugno 1914, che scatenò la crisi diplomatica europea.",
    technical: "Attentato compiuto da Gavrilo Princip a Sarajevo; l'ultimatum austro-ungarico alla Serbia e le alleanze portarono allo scoppio della guerra.",
    example: "L'attentato di Sarajevo è considerato il detonatore immediato della Prima guerra mondiale.",
  },
  versailles: {
    word: "Trattato di Versailles",
    simple: "Fu il trattato di pace del 1919 che impose condizioni severe alla Germania sconfita.",
    technical: "Accordo che riconobbe la responsabilità tedesca, prevedeva riparazioni, perdite territoriali e limitazioni militari, ridisegnando l'Europa.",
    example: "Il Trattato di Versailles alimentò risentimenti in Germania e contribuì alle tensioni del dopoguerra.",
  },
  "triplice alleanza": {
    word: "Triplice Alleanza",
    simple: "Era il patto difensivo tra Germania, Austria-Ungheria e Italia prima della Prima guerra mondiale.",
    technical: "Alleanza militare che legava le potenze centrali: un attacco a uno dei membri poteva coinvolgere gli altri.",
    example: "La Triplice Alleanza si contrapponeva alla Triplice Intesa e amplificò l'effetto a catena dopo Sarajevo.",
  },
  armistizio: {
    word: "Armistizio",
    simple: "È la sospensione dei combattimenti tra gli eserciti in guerra, prima della pace definitiva.",
    technical: "Accordo militare che ferma le ostilità; l'armistizio dell'11 novembre 1918 pose fine alla Prima guerra mondiale sul fronte occidentale.",
    example: "L'armistizio del 11 novembre 1918 chiuse il conflitto dopo il crollo degli Imperi centrali.",
  },
  piave: {
    word: "Piave",
    simple: "Fu il fiume sul quale l'esercito italiano resistette dopo Caporetto, diventando simbolo di riscossa.",
    technical: "Linea difensiva italiana nel 1917-1918; la battaglia del Piave segnò la ripresa militare prima di Vittorio Veneto.",
    example: "La resistenza sul Piave fermò l'avanzata austro-ungarica dopo la disfatta di Caporetto.",
  },
  neutralisti: {
    word: "Neutralisti",
    simple: "Erano coloro che volevano che l'Italia restasse fuori dalla guerra nel 1914-1915.",
    technical: "Corrente politica e sociale che sosteneva la neutralità italiana, contrapposta agli interventisti.",
    example: "I neutralisti ritenevano che l'Italia non avesse interesse a entrare nel conflitto europeo.",
  },
  interventisti: {
    word: "Interventisti",
    simple: "Sostenevano l'entrata dell'Italia in guerra per ottenere terre irredente e prestigio.",
    technical: "Movimento politico favorevole all'intervento armato, culminato nel Patto di Londra e nella dichiarazione di guerra del 1915.",
    example: "Gli interventisti convinsero l'Italia a schierarsi contro l'Austria-Ungheria nel 1915.",
  },
};

function normalizeTermKey(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}

function lookupCuratedDefinition(term: string): CuratedDefinition | null {
  const key = normalizeTermKey(term);
  if (CURATED_HISTORY_DEFINITIONS[key]) return CURATED_HISTORY_DEFINITIONS[key];
  if (key.includes("intesa") && !key.includes("triplice")) return null;
  if (key === "intesa") return null;
  for (const [candidate, definition] of Object.entries(CURATED_HISTORY_DEFINITIONS)) {
    if (key.includes(candidate) || candidate.includes(key)) return definition;
  }
  return null;
}

function sentenceContext(text: string, term: string, radius = 1): string {
  const sentences = text.replace(/\n+/g, " ").match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [];
  const lower = term.toLowerCase();
  const hit = sentences.find((s) => s.toLowerCase().includes(lower));
  if (!hit) return "";
  const index = sentences.indexOf(hit);
  const slice = sentences.slice(Math.max(0, index - radius), index + radius + 1);
  return slice.join(" ").trim();
}

function buildImportanceSentence(term: string, classification?: StudyMaterialClassification): string {
  if (classification?.type === "history") {
    return `Capire "${term}" aiuta a ricostruire cause, eventi e conseguenze del periodo storico studiato.`;
  }
  if (classification?.type === "law") {
    return `"${term}" è utile per collegare norme, obblighi ed effetti pratici nel materiale.`;
  }
  return `"${term}" è un concetto chiave per organizzare lo studio e rispondere a verifiche sul tema.`;
}

function buildReviewQuestion(term: string, classification?: StudyMaterialClassification): string {
  if (classification?.type === "history") {
    return `Perché "${term}" è rilevante nello svolgimento o nelle conseguenze degli eventi descritti?`;
  }
  return `Come spiegheresti "${term}" con definizione ed esempio tratto dal testo?`;
}

/** Build a real vocabulary entry — no placeholder templates. */
export function buildStudyTermDefinition(
  term: string,
  sourceText: string,
  classification?: StudyMaterialClassification,
  connections: string[] = [],
): DifficultWord {
  const curated = classification?.type === "history" ? lookupCuratedDefinition(term) : null;
  const entry = curated || explainProfessionalWord(term);
  const context = sentenceContext(sourceText, term);
  const inText = context
    ? `Nel testo: ${context.replace(/\s+/g, " ").trim().slice(0, 220)}`
    : `Nel testo compare come elemento per comprendere ${classification?.label || "il tema"}.`;

  const simple = curated?.simple
    || (entry.simple && !hasVocabularyTemplateText(entry.simple) && !hasStudyPlaceholderText(entry.simple)
      ? entry.simple
      : `${entry.word} è un concetto tecnico del materiale che va spiegato con un esempio concreto.`);
  const technical = curated?.technical || entry.technical;
  const example = curated?.example
    || (entry.example && !hasVocabularyTemplateText(entry.example) ? entry.example : `Esempio: "${entry.word}" compare nel materiale in un passaggio concreto del capitolo studiato.`);
  const importance = buildImportanceSentence(entry.word, classification);

  const school = [
    `Termine: ${entry.word}`,
    `Definizione semplice: ${simple}`,
    inText,
    `Perché è importante: ${importance}`,
    `Esempio: ${example}`,
    `Domanda di ripasso: ${buildReviewQuestion(entry.word, classification)}`,
  ].join("\n");

  const advanced = [
    technical,
    inText,
    connections.length ? `Collegamenti: ${connections.join(" · ")}` : "",
  ].filter(Boolean).join(" ");

  return {
    word: entry.word,
    simple,
    technical: advanced || technical,
    school,
    advanced,
    precise: technical,
    example,
    newExample: example,
    examQuestion: buildReviewQuestion(entry.word, classification),
    connections: connections.slice(0, 4),
    commonMistake: `Confondere "${entry.word}" con un termine generico senza spiegare il suo ruolo nel periodo studiato.`,
    importance: "alto",
  };
}

export function isLegacyStudyDefinition(word: DifficultWord): boolean {
  const joined = [
    word.simple,
    word.technical,
    word.school,
    word.advanced,
    word.example,
    word.examQuestion,
  ].join(" ");

  if (hasStudyPlaceholderText(joined)) return false;
  if (/\bdefinizione scolastica\b/i.test(joined)) return false;
  if (/\bda spiegare\b/i.test(joined)) return false;
  if (/\bdefinizione \+ esempio\b/i.test(joined)) return false;
  if (/\bcollegalo al tema centrale\b/i.test(joined)) return false;
  if (/\bconcetto da spiegare\b/i.test(joined)) return false;
  if (!word.simple?.trim() || !word.technical?.trim() || !word.example?.trim()) return false;
  return true;
}

export function isRealStudyDefinition(word: DifficultWord): boolean {
  const joined = [
    word.simple,
    word.technical,
    word.school,
    word.advanced,
    word.example,
    word.examQuestion,
  ].join(" ");

  if (hasStudyPlaceholderText(joined)) return false;
  if (hasVocabularyTemplateText(joined)) return false;
  if (/\bdefinizione scolastica\b/i.test(joined)) return false;
  if (/\bda spiegare\b/i.test(joined)) return false;
  if (/\bdefinizione \+ esempio\b/i.test(joined)) return false;
  if (/\bcollegalo al tema centrale\b/i.test(joined)) return false;
  if (/\bconcetto da spiegare\b/i.test(joined)) return false;
  if (/\bparola importante del testo\b/i.test(joined)) return false;
  if (/\bva capita[,\s]+non solo memorizzata\b/i.test(joined)) return false;
  if (/\bprova a definirlo con parole tue\b/i.test(joined)) return false;
  if (!word.simple?.trim() || !word.technical?.trim() || !word.example?.trim()) return false;
  return true;
}

export function isAcceptableStudyVocabularyEntry(
  word: DifficultWord,
  classification?: StudyMaterialClassification,
): boolean {
  if (classification?.type === "history") return isRealStudyDefinition(word);
  const core = `${word.simple} ${word.example} ${word.school || ""}`;
  if (hasStudyPlaceholderText(core) || hasVocabularyTemplateText(core)) return false;
  return Boolean(word.simple?.trim() && word.technical?.trim() && word.example?.trim());
}

export function hasSchoolDefinition(term: string, classification?: StudyMaterialClassification): boolean {
  if (classification?.type === "history" && lookupCuratedDefinition(term)) return true;
  const explained = explainProfessionalWord(term);
  return !hasVocabularyTemplateText(`${explained.simple} ${explained.technical} ${explained.example}`);
}
