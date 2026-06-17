import type { GuidedInterviewState, InterviewQuestion } from "./types";

export interface ConceptReadinessReport {
  ready: boolean;
  score: number;
  missing: string[];
  strengths: string[];
  nextQuestions: InterviewQuestion[];
}

function clean(value?: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function wordCount(value?: unknown): number {
  const text = clean(value);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function hasSignal(value?: unknown, minWords = 7): boolean {
  return wordCount(value) >= minWords;
}

function bag(state: GuidedInterviewState): string {
  const ex = state.extracted || {};
  return [
    state.selectedGenre,
    state.selectedBookType,
    state.inferredProfile?.genre,
    state.inferredProfile?.bookType,
    state.inferredProfile?.subgenre,
    ex.bookType,
    ex.genre,
    ex.subgenre,
    ex.genreDNA,
    ex.promise,
    ex.readerTransformation,
    ex.centralConflict,
    ex.targetReader,
    ex.emotionalTone,
    ex.setting,
    ex.structurePreference,
  ].map(clean).join(" ").toLowerCase();
}

function isFictionLike(state: GuidedInterviewState): boolean {
  return /romanzo|narrativa|fiction|romance|dark romance|thriller|horror|fantasy|sci-fi|crime|noir|giallo|racconto|novel/.test(bag(state));
}

function isRomanceLike(state: GuidedInterviewState): boolean {
  return /romance|dark romance|slow burn|amore|desiderio|relazione|ossessione|proibito|possessiv/.test(bag(state));
}

function isNonfictionLike(state: GuidedInterviewState): boolean {
  return /self-help|business|manuale|guida|saggio|nonfiction|non-fiction|studio|education|didattic|filosofia|divulgativo/.test(bag(state));
}

function hasGenreDriftRisk(state: GuidedInterviewState): boolean {
  const text = bag(state);
  const saysFiction = isFictionLike(state);

  // "non saggio" / "not essay" is an anti-drift boundary, not a drift signal.
  const antiEssayBoundary =
    /non (deve diventare |e |è |essere )?(un )?(saggio|manuale|filosofia|lezione|teoria)|not (an? )?(essay|manual)|no essay|non-fiction vietata/.test(text);

  const namedTheorySignals = /heidegger|freud|lacan|nietzsche|kant|merleau-ponty|schopenhauer|esperimento mentale/.test(text);
  const structuralEssaySignals = /struttura argomentativa|capitoli teorici|lezioni teoriche|analisi filosofica astratta|saggio filosofico/.test(text);
  const genericEssaySignals = /\b(saggio|filosofia|manuale|lezione|teoria|argomentativo|divulgativo)\b/.test(text) && !antiEssayBoundary;

  const essaySignals = namedTheorySignals || structuralEssaySignals || genericEssaySignals;
  const practicalSignals = /metodo|framework|esercizio|checklist|passo pratico|guida/.test(text);

  if (saysFiction && essaySignals) return true;
  if (isRomanceLike(state) && practicalSignals) return true;
  return false;
}

function q(
  id: string,
  key: InterviewQuestion["key"],
  question: string,
  placeholder: string,
): InterviewQuestion {
  return { id, key, question, placeholder } as InterviewQuestion;
}

function buildMissingQuestion(field: string, state: GuidedInterviewState): InterviewQuestion {
  const romance = isRomanceLike(state);
  const fiction = isFictionLike(state);
  const nonfiction = isNonfictionLike(state);

  switch (field) {
    case "genre":
      return q(
        "concept-gate-genre",
        "genreDNA" as InterviewQuestion["key"],
        "Prima di andare al blueprint devo bloccare il genere: che libro stiamo davvero costruendo, senza possibilità di equivoco?",
        "Esempio: dark romance adulto slow burn; thriller psicologico; fantasy epico; self-help pratico; manuale per studenti.",
      );

    case "core":
      return q(
        "concept-gate-core",
        "centralConflict" as InterviewQuestion["key"],
        fiction
          ? "Qual è il motore inevitabile della storia? Voglio il conflitto che costringe i personaggi a muoversi."
          : "Qual è il problema centrale che questo libro deve risolvere o illuminare meglio di tutti gli altri?",
        fiction
          ? "Esempio: lei vuole liberarsi da lui, ma lui è l’unico che può salvarla dal segreto che la distrugge."
          : "Esempio: il lettore non riesce a cambiare perché confonde motivazione, identità e abitudini.",
      );

    case "reader":
      return q(
        "concept-gate-reader",
        "targetReader" as InterviewQuestion["key"],
        "Chi deve sentirsi colpito da questo libro al punto da pensare: ‘è stato scritto per me’?",
        romance
          ? "Esempio: lettrici dark romance adulte che amano ossessione, potere, vulnerabilità e confini morali."
          : "Esempio: autori indie, studenti, imprenditori, persone bloccate emotivamente, fan di thriller psicologici.",
      );

    case "promise":
      return q(
        "concept-gate-promise",
        "promise" as InterviewQuestion["key"],
        "Qual è la promessa precisa del libro? Non il tema: l’esperienza che il lettore compra.",
        romance
          ? "Esempio: una storia tossica, elegante e irresistibile che fa desiderare due persone anche quando non dovrebbero stare insieme."
          : nonfiction
            ? "Esempio: capire un problema, applicare un metodo e uscire con una trasformazione concreta."
            : "Esempio: paura crescente, meraviglia epica, ossessione romantica, redenzione emotiva.",
      );

    case "tone":
      return q(
        "concept-gate-tone",
        "emotionalTone" as InterviewQuestion["key"],
        "Che temperatura deve avere il libro? Dimmi come deve sentirsi addosso, non solo di cosa parla.",
        romance
          ? "Esempio: sensuale, pericoloso, lento, magnetico, moralmente ambiguo, doloroso ma elegante."
          : "Esempio: teso, intimo, epico, chirurgico, poetico, pratico, inquietante, luminoso.",
      );

    case "world":
      return q(
        "concept-gate-world",
        "setting" as InterviewQuestion["key"],
        "Dove vive questo libro? Voglio un luogo o un contesto che non sembri generico.",
        fiction
          ? "Esempio: club privati e hotel di lusso, provincia gotica, accademia d’élite, regno in rovina, città piena di segreti."
          : "Esempio: vita quotidiana del lettore, scuola, business reale, studio personale, ambiente professionale.",
      );

    case "structure":
      return q(
        "concept-gate-structure",
        "structurePreference" as InterviewQuestion["key"],
        "Che forma deve avere il libro per funzionare davvero?",
        fiction
          ? "Esempio: slow burn in 18 capitoli, escalation thriller, viaggio fantasy, doppio POV, climax al 75%."
          : "Esempio: percorso in step, capitoli brevi con esercizi, teoria + esempi + applicazione, guida progressiva.",
      );

    case "boundary":
      return q(
        "concept-gate-boundary",
        "genreDNA" as InterviewQuestion["key"],
        "Ultimo controllo anti-errore: cosa NON deve diventare questo libro?",
        romance
          ? "Esempio: non deve diventare un saggio filosofico, non deve diventare romance dolce, non deve perdere ossessione e tensione."
          : "Esempio: non deve diventare manuale freddo, non deve diventare romanzo, non deve diventare teoria astratta.",
      );

    default:
      return q(
        "concept-gate-final",
        "genreDNA" as InterviewQuestion["key"],
        "Mi manca ancora un dettaglio decisivo: cosa devo assolutamente capire prima di costruire il libro?",
        "Scrivilo liberamente, anche in modo imperfetto.",
      );
  }
}

export function evaluateConceptReadiness(state: GuidedInterviewState): ConceptReadinessReport {
  const ex = state.extracted || {};
  const missing: string[] = [];
  const strengths: string[] = [];

  const genreSignal = clean(state.selectedGenre || state.inferredProfile?.genre || ex.genre || ex.subgenre || ex.genreDNA);
  const hasGenreSignal =
    genreSignal.length >= 3 ||
    /romance|dark|thriller|horror|fantasy|poetry|poesia|self-help|business|manual|manuale|education|studio|fiction|romanzo|saggio/i.test(genreSignal);

  if (hasGenreSignal) strengths.push("genre");
  else missing.push("genre");

  if (hasSignal(ex.centralConflict, isFictionLike(state) ? 10 : 8)) strengths.push("core");
  else missing.push("core");

  if (hasSignal(ex.targetReader, 7)) strengths.push("reader");
  else missing.push("reader");

  if (hasSignal(ex.promise, 8) || hasSignal(ex.readerTransformation, 8)) strengths.push("promise");
  else missing.push("promise");

  if (hasSignal(ex.emotionalTone, 6)) strengths.push("tone");
  else missing.push("tone");

  if (isFictionLike(state)) {
    if (hasSignal(ex.setting, 6)) strengths.push("world");
    else missing.push("world");
  }

  if (hasSignal(ex.structurePreference, 5) || hasSignal(ex.bookLength, 2) || hasSignal(ex.chapters, 1)) {
    strengths.push("structure");
  } else {
    missing.push("structure");
  }

  if (hasGenreDriftRisk(state)) missing.push("boundary");

  const total = strengths.length + missing.length || 1;
  const rawScore = Math.round((strengths.length / total) * 100);
  const confidence = Math.round(Math.min(100, Math.max(rawScore, (state.confidence || 0) * 100)));
  const requiredScore = isFictionLike(state) ? 86 : 82;

  const uniqueMissing = Array.from(new Set(missing));
  const ready = confidence >= requiredScore && uniqueMissing.length === 0;

  return {
    ready,
    score: confidence,
    missing: uniqueMissing,
    strengths,
    nextQuestions: uniqueMissing.slice(0, 3).map((field) => buildMissingQuestion(field, state)),
  };
}

export function shouldContinueInterviewBeforeBlueprint(state: GuidedInterviewState): boolean {
  return !evaluateConceptReadiness(state).ready;
}
