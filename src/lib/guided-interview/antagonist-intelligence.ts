import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { detectEditorialBookMode } from "./book-understanding-engine";
import { getCharactersCompletionReport } from "./character-forge-engine";
import { sanitizeDnaText } from "./dna-cleaner";

export type AntagonistForceType =
  | "human-villain"
  | "system"
  | "society"
  | "trauma"
  | "time"
  | "illness"
  | "self"
  | "none";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

const FORCE_PATTERNS: Array<{ type: AntagonistForceType; match: RegExp }> = [
  { type: "human-villain", match: /villain|antagonista|nemico|lui|lei|persona|love interest|ex|marito|madre|padre|fratello/i },
  { type: "system", match: /sistema|istituzione|stato|burocrazia|azienda|scuola|chiesa|regime|corporazione/i },
  { type: "society", match: /società|paese|famiglia|classe|tradizione|gossip|giudizio|convenzione/i },
  { type: "trauma", match: /trauma|ferita|passato|abuso|lutto|memoria|fantasma/i },
  { type: "time", match: /tempo|scadenza|orologio|invecchia|mancanza di tempo|deadline/i },
  { type: "illness", match: /malattia|cancro|depressione|dipendenza|mentale|corpo|salute/i },
  { type: "self", match: /sé stess|se stess|colpa|autodistruzione|sabot|impedirsi|non riesce/i },
  { type: "none", match: /nessun antagonista|senza villain|non c'è un nemico|forza interna sola/i },
];

export function classifyAntagonistForce(text: string): AntagonistForceType {
  const bag = clean(text).toLowerCase();
  if (!bag) return "human-villain";
  for (const entry of FORCE_PATTERNS) {
    if (entry.match.test(bag)) return entry.type;
  }
  if (/forza|ostacol|oppone|contrari|minaccia|blocca/i.test(bag)) return "human-villain";
  return "human-villain";
}

export function resolveAntagonistForce(state: GuidedInterviewState): AntagonistForceType | undefined {
  return state.antagonistForce;
}

export function shouldAskHumanAntagonistDetails(state: GuidedInterviewState): boolean {
  const force = resolveAntagonistForce(state);
  return force === "human-villain" || force === undefined;
}

export function getAntagonistForceLabel(type: AntagonistForceType): string {
  const map: Record<AntagonistForceType, string> = {
    "human-villain": "Villain umano",
    system: "Sistema",
    society: "Società",
    trauma: "Trauma",
    time: "Tempo",
    illness: "Malattia",
    self: "Sé stesso",
    none: "Nessun antagonista classico",
  };
  return map[type];
}

export function getAntagonistClassificationQuestion(
  state: GuidedInterviewState,
): InterviewQuestion | null {
  if (detectEditorialBookMode(state) !== "fiction") return null;
  if (resolveAntagonistForce(state)) return null;
  const report = getCharactersCompletionReport(state);
  if (report.required && !report.complete) return null;

  return {
    id: "antagonist-force-classify",
    key: "antagonistForce",
    question: "Cosa oppone davvero al protagonista — non assumo un villain classico.",
    helper: "Scegli la forza contraria più vera. Adatterò le domande a questa scelta.",
    placeholder: "Raccontamelo con parole tue…",
    quickSuggestions: [
      { label: "Persona pericolosa", value: "Un villain umano con volontà propria e magnetismo." },
      { label: "Sistema", value: "Un sistema o istituzione che schiaccia il protagonista." },
      { label: "Società / famiglia", value: "Società, famiglia o convenzioni che impediscono la scelta vera." },
      { label: "Trauma", value: "Un trauma o ferita del passato che torna a mordere." },
      { label: "Sé stesso", value: "Il protagonista è il vero ostacolo — autodistruzione o paura." },
      { label: "Nessun villain", value: "Non c'è un antagonista classico — la storia combatte altro." },
    ],
  };
}

export function getNonHumanAntagonistQuestion(
  state: GuidedInterviewState,
): InterviewQuestion | null {
  const force = resolveAntagonistForce(state);
  if (!force || force === "human-villain") return null;
  if (state.extracted?.antagonistForce && clean(state.extracted.antagonistForce).length >= 12) {
    return null;
  }

  const prompts: Partial<Record<AntagonistForceType, InterviewQuestion>> = {
    system: {
      id: "antagonist-force-system",
      key: "antagonistForce",
      question: "Come questo sistema schiaccia il protagonista — con quali regole o conseguenze concrete?",
      helper: "Serve una forza opposta credibile, non un'etichetta astratta.",
    },
    society: {
      id: "antagonist-force-society",
      key: "antagonistForce",
      question: "Quale pressione sociale o familiare rende impossibile la scelta del protagonista?",
      helper: "Chi o cosa giudica, blocca, esclude?",
    },
    trauma: {
      id: "antagonist-force-trauma",
      key: "antagonistForce",
      question: "Quale trauma torna a interferire — e in quale momento della storia pesa di più?",
      helper: "La ferita deve avere un costo narrativo visibile.",
    },
    time: {
      id: "antagonist-force-time",
      key: "antagonistForce",
      question: "Quale scadenza o perdita di tempo rende urgente la storia?",
      helper: "Il tempo deve costare qualcosa di concreto.",
    },
    illness: {
      id: "antagonist-force-illness",
      key: "antagonistForce",
      question: "Come malattia o fragilità corporea limita il protagonista — e cosa lo costringe a scegliere?",
      helper: "Evita il melodramma facile: serve una regola narrativa chiara.",
    },
    self: {
      id: "antagonist-force-self",
      key: "antagonistForce",
      question: "Quale parte di sé il protagonista deve affrontare — paura, colpa, autosabotaggio?",
      helper: "Il conflitto interno deve generare decisioni, non solo introspezione.",
    },
    none: {
      id: "antagonist-force-none",
      key: "antagonistForce",
      question: "Se non c'è un villain classico, cosa genera comunque attrito e conseguenze?",
      helper: "Ogni storia ha una forza che resiste al cambiamento.",
    },
  };

  return prompts[force] ?? null;
}
