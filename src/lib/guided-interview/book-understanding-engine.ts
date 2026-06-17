import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { sanitizeDnaText } from "./dna-cleaner";
import {
  buildGenreSignalComponents,
  evaluateGenreConvergence,
  genreAwareCanExplainBook,
  genreAwareReadyForUnderstanding,
} from "./genre-convergence-engine";

export type EditorialBookMode = "fiction" | "nonfiction" | "poetry" | "unknown";

export type EditorialContradiction = {
  id: string;
  label: string;
  signalA: string;
  signalB: string;
};

export type EditorialComponentScore = {
  score: number;
  weak: boolean;
  evidence: string[];
};

export type EditorialUnderstandingReport = {
  mode: EditorialBookMode;
  overallConfidence: number;
  components: Record<string, EditorialComponentScore>;
  contradictions: EditorialContradiction[];
  blindSpots: string[];
  canExplainBook: boolean;
  readyForBlueprint: boolean;
  nextQuestions: InterviewQuestion[];
};

const COMPONENT_MIN = 0.72;
const OVERALL_MIN = 0.95;

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function blob(state: GuidedInterviewState): string {
  const ex = state.extracted || {};
  const msgs = state.messages.filter((m) => m.role === "user").map((m) => m.content);
  return [
    ...msgs,
    state.selectedGenre,
    state.selectedBookType,
    state.inferredProfile?.genre,
    state.inferredProfile?.bookType,
    state.inferredProfile?.subgenre,
    ex.genreDNA,
    ex.genre,
    ex.subgenre,
    ex.promise,
    ex.centralConflict,
    ex.readerTransformation,
    ex.targetReader,
    ex.emotionalTone,
    ex.setting,
    ex.protagonistWound,
    ex.narrativeDrive,
    ex.bookType,
  ]
    .map(clean)
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export function detectEditorialBookMode(state: GuidedInterviewState): EditorialBookMode {
  const text = blob(state);
  if (/poesia|poetico|versi|raccolta poetica|lirica|sonetto/.test(text)) return "poetry";

  const fictionStrong =
    /romanzo|narrativa|fiction|romance|dark romance|thriller|horror|fantasy|giallo|noir|racconto|protagonist|slow burn|storia d'amore/.test(
      text,
    );
  const nonfictionStrong =
    /self-help|business|manuale|guida pratica|nonfiction|non-fiction|saggio|studio universit|metodo|framework|checklist/.test(
      text,
    ) && !/non saggio|not an essay|no essay/.test(text);

  if (fictionStrong && !nonfictionStrong) return "fiction";
  if (nonfictionStrong) return "nonfiction";
  if (fictionStrong) return "fiction";
  return "unknown";
}

/** Clarity/specificity/coherence — NOT length. */
export function scoreEditorialTextQuality(text: string): number {
  const t = clean(text).toLowerCase();
  if (!t) return 0;

  let score = 0.18;

  const genericOnly =
    /^(un |una |il |lo )?(romanzo|storia|libro|dark romance|thriller|fantasy|manuale|saggio)(\s|$)/.test(t) &&
    t.length < 48;
  if (genericOnly) return 0.22;

  const depthSignals = t.match(
    /(perché|perche|quando|dove|chi |lei |lui |protagonist|segreto|ferita|paura|desiderio|ossessione|perdere|rischio|conseguenza|trasformazione|prima|dopo|fine|ma |mentre|tuttavia|non può|non puo|deve|morire|amare|tradire|scoprire|cambiare)/g,
  );
  score += Math.min(0.42, (depthSignals?.length ?? 0) * 0.09);

  if (/esempio:|come se|immagina|sento|sento elementi/.test(t)) score += 0.06;
  if (/\b(non |mai |sempre |solo |ancora )/.test(t)) score += 0.04;

  const evocativeTone = t.match(
    /(sensuale|pericoloso|lento|elegante|doloroso|claustrofobico|gotico|inquietante|magnetico|tossico|intimo|epico|poetico|disturbante|pratico|diretto|caldo|empatico|incoraggiante|tensione|ambiguo|ossessione|redenzione|presagi|ombre)/g,
  );
  score += Math.min(0.3, (evocativeTone?.length ?? 0) * 0.05);
  if ((evocativeTone?.length ?? 0) >= 4) score = Math.max(score, 0.76);

  if (
    /\b(slow burn|dark romance adulto|thriller psicologico|narrativa gotica|self-help pratico|manuale pratico|fantasy epico|romanzo gotico)\b/.test(
      t,
    )
  ) {
    score = Math.max(score, 0.74);
  }

  if (/(ferita|segreto|perdere|rischio|vuole fuggire|posta in gioco|conflitto inevitabile)/.test(t) && t.length > 48) {
    score = Math.max(score, 0.78);
  }

  if (
    /(lettore|problema|bloccato|frustrazione|stress|procrastin|responsabilit|energia mentale)/.test(t) &&
    t.length > 35
  ) {
    score = Math.max(score, 0.78);
  }

  if (/(lettric|lettor|adulti che amano|fan di|professionisti|studenti|imprenditor|autori indie)/.test(t) && t.length > 35) {
    score = Math.max(score, 0.78);
  }

  if (
    /(fa desiderare|deve chiudere|resta addosso|trasformazione concreta|promessa|esperienza che il lettore|metodo semplice|ritrovare controllo)/.test(
      t,
    ) &&
    t.length > 40
  ) {
    score = Math.max(score, 0.78);
  }

  if (/(non avrebbe dovuto trovare|mistero|indagine|verità nascosta|paranoia|colpevole|trappola)/.test(t) && t.length > 28) {
    score = Math.max(score, 0.8);
  }
  if (/(città che non|regno|mondo.*regol|magia|destino|prezzo.*mondo|sopravvivere)/.test(t) && t.length > 28) {
    score = Math.max(score, 0.8);
  }
  if (/(nostalgia|memoria|malincon|versi|poesia|liric|emotiv)/.test(t) && t.length > 20) {
    score = Math.max(score, 0.8);
  }
  if (/(tecnolog|memori.*cancell|ricordi.*cancell|conseguenz.*umana)/.test(t) && t.length > 24) {
    score = Math.max(score, 0.8);
  }
  if (/(omicidio|stanza chiusa|delitto|impossibile.*stanza|indagine)/.test(t) && t.length > 24) {
    score = Math.max(score, 0.8);
  }

  // Long vague answers must not inflate confidence.
  if (t.length > 180 && score < 0.45) score = Math.min(score + 0.04, 0.48);

  return Math.min(1, Math.max(0, score));
}

function component(
  texts: Array<string | undefined>,
  extraEvidence: string[] = [],
): EditorialComponentScore {
  const evidence = [...texts.map(clean).filter(Boolean), ...extraEvidence].filter(Boolean);
  if (evidence.length === 0) return { score: 0, weak: true, evidence: [] };
  const scores = evidence.map(scoreEditorialTextQuality);
  const score = scores.length ? Math.max(...scores) : 0;
  return { score, weak: score < COMPONENT_MIN, evidence };
}

export function detectEditorialContradictions(state: GuidedInterviewState): EditorialContradiction[] {
  const text = blob(state);
  const hits: EditorialContradiction[] = [];

  const rules: Array<{ id: string; label: string; a: RegExp; b: RegExp; bGuard?: RegExp }> = [
    {
      id: "dark-vs-light",
      label: "tono oscuro vs tono leggero",
      a: /dark romance|oscuro|tossico|doloroso|inquietante|horror|gotico|paura/,
      b: /leggero|divertente|spensierato|comico|feel-good|allegro/,
    },
    {
      id: "fiction-vs-essay",
      label: "narrativa vs saggio",
      a: /romanzo|narrativa|fiction|romance|thriller|fantasy|protagonist|storia d'amore/,
      b: /\b(saggio|filosofia|manuale teorico|lezione|argomentativo)\b/,
      bGuard: /non (deve diventare |e |è |essere )?(un )?(saggio|manuale|filosofia)|not (an? )?(essay|manual)/,
    },
    {
      id: "thriller-vs-cozy",
      label: "tensione vs comfort",
      a: /thriller|horror|suspense|paura|minaccia|omicidio|indagine/,
      b: /cozy|rilassante|caldo e accogliente|senza tensione/,
    },
    {
      id: "slow-vs-fast",
      label: "slow burn vs ritmo compulsivo",
      a: /slow burn|lento|graduale|atmosferic/,
      b: /compulsivo|adrenalina|page turner|velocissimo|ritmo altissimo/,
    },
  ];

  for (const rule of rules) {
    if (rule.a.test(text) && rule.b.test(text)) {
      if (rule.bGuard?.test(text)) continue;
      hits.push({
        id: rule.id,
        label: rule.label,
        signalA: rule.a.source,
        signalB: rule.b.source,
      });
    }
  }

  return hits;
}

function hasCharacterDepth(state: GuidedInterviewState): EditorialComponentScore {
  const ex = state.extracted || {};
  const text = [ex.protagonistWound, ex.centralConflict, ex.narrativeDrive, blob(state)].join(" ");
  const signals = text.match(/(ferita|wound|desiderio|desire|paura|fear|ossessione|contraddizione|menzogna|bisogno|vuoto|tradimento)/gi);
  return component([text], signals?.slice(0, 4) ?? []);
}

function hasEndingLock(state: GuidedInterviewState): EditorialComponentScore {
  const ex = state.extracted || {};
  const text = [ex.readerTransformation, ex.promise, ex.centralConflict].join(" ");
  const changeSignals = text.match(/(cambia|trasform|diventa|impara|capisce|perde|guadagna|fine|finale|redenzione|caduta|rinascita)/gi);
  return component([text], changeSignals?.slice(0, 3) ?? []);
}

function genreCertainty(state: GuidedInterviewState): EditorialComponentScore {
  const ex = state.extracted || {};
  const genre =
    clean(ex.genreDNA) ||
    clean(ex.subgenre) ||
    clean(ex.genre) ||
    clean(state.inferredProfile?.subgenre) ||
    clean(state.inferredProfile?.genre) ||
    clean(state.selectedGenre);
  const inferenceConf = state.inferredProfile?.confidence ?? 0;
  const quality = scoreEditorialTextQuality(genre);
  const score = Math.min(
    1,
    inferenceConf > 0 ? quality * 0.65 + inferenceConf * 0.35 : quality,
  );
  return {
    score,
    weak: score < COMPONENT_MIN,
    evidence: genre ? [genre] : [],
  };
}

function canExplainBook(state: GuidedInterviewState, components: Record<string, EditorialComponentScore>): boolean {
  const required = ["concept", "conflict", "promise", "reader", "transformation"];
  const toneOk =
    (components.tone?.score ?? 0) >= COMPONENT_MIN ||
    (components.atmosphere?.score ?? 0) >= COMPONENT_MIN;
  return required.every((k) => (components[k]?.score ?? 0) >= COMPONENT_MIN) && toneOk;
}

function q(id: string, key: string, question: string, helper?: string): InterviewQuestion {
  return { id, key, question, helper, placeholder: "Rispondi come parleresti a un editor…" };
}

function buildContradictionQuestion(c: EditorialContradiction): InterviewQuestion {
  return q(
    `contradiction-${c.id}`,
    "genreDNA",
    "Sto vedendo due direzioni diverse nel libro. Quale rappresenta davvero il cuore della storia?",
    `Segnale in tensione: ${c.label}. Non serve scegliere una etichetta — dimmi quale anima è quella vera.`,
  );
}

function buildBlindSpotQuestion(spot: string, mode: EditorialBookMode): InterviewQuestion {
  const fiction: Record<string, InterviewQuestion> = {
    conflict: q(
      "blind-conflict",
      "centralConflict",
      "Se questo personaggio resta fermo, cosa perde davvero: una persona, una parte di sé, una possibilità, o la verità?",
      "Pensa a una scena concreta dove la scelta diventa inevitabile.",
    ),
    protagonist: q(
      "blind-protagonist",
      "protagonistWound",
      "Immagina di incontrare il personaggio principale in un bar. Dopo dieci minuti con lui, cosa capiresti della sua anima?",
    ),
    wound: q(
      "blind-wound",
      "protagonistWound",
      "Qual è la ferita che genera tutto? Non il plot — la crepa interiore che rende inevitabile questa storia.",
    ),
    transformation: q(
      "blind-transformation",
      "readerTransformation",
      "Quando il lettore chiude il libro, cosa deve sentire nel corpo — non cosa deve aver capito?",
    ),
    ending: q(
      "blind-ending",
      "readerTransformation",
      "Chi cambia, come cambia, e perché proprio adesso non può più restare uguale?",
    ),
    genre: q(
      "blind-genre",
      "genreDNA",
      "Da quello che mi hai raccontato sento una direzione editoriale emergere. Ti rappresenta, oppure sto leggendo male il cuore del libro?",
    ),
  };

  const nonfiction: Record<string, InterviewQuestion> = {
    conflict: q(
      "blind-problem",
      "centralConflict",
      "Quale problema del lettore è così urgente che questo libro deve esistere adesso?",
    ),
    promise: q(
      "blind-promise",
      "promise",
      "Cosa promette questo libro che centinaia di altri sullo stesso tema non promettono?",
    ),
    method: q(
      "blind-method",
      "genreDNA",
      "Che metodo o percorso concreto porterà il lettore dal punto A al punto B?",
    ),
    transformation: q(
      "blind-result",
      "readerTransformation",
      "Quale risultato finale, misurabile o vivido, deve ottenere il lettore?",
    ),
  };

  const poetry: Record<string, InterviewQuestion> = {
    tone: q(
      "blind-poetry-tone",
      "emotionalTone",
      "Che esperienza emotiva deve attraversare il lettore pagina dopo pagina?",
    ),
    theme: q(
      "blind-poetry-theme",
      "promise",
      "Quale immagine, dolore o verità ritorna come un'ossessione in questa raccolta?",
    ),
    promise: q(
      "blind-poetry-promise",
      "promise",
      "Quale messaggio o verità emotiva deve restare al lettore dopo l'ultimo verso?",
    ),
  };

  const map = mode === "nonfiction" ? nonfiction : mode === "poetry" ? poetry : fiction;
  return map[spot] ?? q(`blind-${spot}`, "centralConflict", "Mi manca ancora un pezzo decisivo. Raccontamelo con una scena o un'immagine concreta.");
}

export function getEditorialDepthQuestions(state: GuidedInterviewState): InterviewQuestion[] {
  const report = evaluateEditorialUnderstanding(state);
  return report.nextQuestions.slice(0, 4);
}

function relevantComponentKeys(mode: EditorialBookMode): string[] {
  const shared = ["genre", "concept", "conflict", "promise", "tone", "reader", "transformation", "commercial"];
  if (mode === "fiction") return [...shared, "protagonist", "wound", "ending", "atmosphere"];
  if (mode === "nonfiction") return [...shared];
  if (mode === "poetry") return ["genre", "concept", "tone", "promise", "reader", "transformation", "atmosphere"];
  return shared;
}

export function evaluateEditorialUnderstanding(state: GuidedInterviewState): EditorialUnderstandingReport {
  const ex = state.extracted || {};
  const mode = detectEditorialBookMode(state);
  const contradictions = detectEditorialContradictions(state);

  const baseComponents: Record<string, EditorialComponentScore> = {
    genre: genreCertainty(state),
    concept: component([ex.genreDNA, ex.promise, ex.centralConflict, state.messages.find((m) => m.role === "user")?.content]),
    conflict: component([ex.centralConflict, ex.narrativeDrive]),
    promise: component([ex.promise, ex.readerTransformation]),
    tone: component([ex.emotionalTone]),
    atmosphere: component([ex.setting, ex.emotionalTone]),
    reader: component([ex.targetReader]),
    transformation: component([ex.readerTransformation, ex.promise]),
    protagonist: component([ex.protagonistWound, ex.centralConflict]),
    wound: hasCharacterDepth(state),
    ending: hasEndingLock(state),
    commercial: component([ex.targetReader, ex.genreDNA, ex.commercialGoal]),
  };

  const genreSignals = buildGenreSignalComponents(state);
  const components = { ...baseComponents, ...genreSignals };

  const modeBlindSpots: string[] = [];
  if (components.conflict.weak) modeBlindSpots.push("conflict");
  if (mode === "fiction") {
    if (components.protagonist.weak) modeBlindSpots.push("protagonist");
    if (components.wound.weak) modeBlindSpots.push("wound");
    if (components.ending.weak) modeBlindSpots.push("ending");
    if (components.atmosphere.weak) modeBlindSpots.push("atmosphere");
  }
  if (mode === "nonfiction") {
    if (components.promise.weak) modeBlindSpots.push("promise");
    if (components.genre.weak) modeBlindSpots.push("method");
    if (components.transformation.weak) modeBlindSpots.push("transformation");
  }
  if (mode === "poetry") {
    if (components.tone.weak) modeBlindSpots.push("tone");
    if (components.promise.weak) modeBlindSpots.push("theme");
  }
  if (components.genre.weak) modeBlindSpots.push("genre");
  if (components.reader.weak) modeBlindSpots.push("reader");
  if (components.transformation.weak && mode !== "poetry") modeBlindSpots.push("transformation");

  const convergence = evaluateGenreConvergence(state, mode, baseComponents, modeBlindSpots);
  const blindSpots = convergence.effectiveBlindSpots;

  const overallConfidence = convergence.genreAwareConfidence;
  const explainOk = genreAwareCanExplainBook(
    components,
    convergence.profile,
    mode,
    convergence.coreQuartetStrong,
  );
  const contradictionsResolved = contradictions.length === 0;

  const readyForBlueprint =
    genreAwareReadyForUnderstanding(convergence, components, contradictionsResolved) && explainOk;

  const nextQuestions: InterviewQuestion[] = [];
  const userAnswers = state.messages.filter((m) => m.role === "user").length;
  const minAnswersForBlindSpots = 3;

  for (const c of contradictions.slice(0, 1)) {
    nextQuestions.push(buildContradictionQuestion(c));
  }

  const shouldGateBlindSpots = state.chatFirst && userAnswers < minAnswersForBlindSpots;

  const spotsToAsk = shouldGateBlindSpots
    ? []
    : convergence.saturated || convergence.loopDetected
      ? blindSpots.slice(0, 1)
      : blindSpots.slice(0, 3);

  for (const spot of spotsToAsk) {
    const question = buildBlindSpotQuestion(spot, mode);
    if (!nextQuestions.some((item) => item.id === question.id)) nextQuestions.push(question);
  }

  if (nextQuestions.length === 0 && !readyForBlueprint && !convergence.saturated && !shouldGateBlindSpots) {
    const altKey = convergence.profile.blindSpotPriority.find((s) => !blindSpots.includes(s));
    if (altKey) {
      nextQuestions.push(buildBlindSpotQuestion(altKey, mode));
    } else {
      nextQuestions.push(
        q(
          "editorial-depth-fallback",
          "centralConflict",
          "Perché questa storia deve esistere — e non un'altra tra mille simili?",
          "Non il tema. La ragione emotiva o editoriale che la rende inevitabile.",
        ),
      );
    }
  }

  return {
    mode,
    overallConfidence,
    components,
    contradictions,
    blindSpots,
    canExplainBook: explainOk,
    readyForBlueprint,
    nextQuestions,
  };
}

export function calculateEditorialConfidenceV2(state: GuidedInterviewState): number {
  return evaluateEditorialUnderstanding(state).overallConfidence;
}
