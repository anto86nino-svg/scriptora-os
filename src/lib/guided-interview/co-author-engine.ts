import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { enrichCoAuthorWithOrchestrator } from "./forge-orchestrator";
import {
  type ForgeInterviewMemory,
  type ForgeSlotKey,
  detectBookMode,
  getForgeMemory,
  isSlotFilled,
} from "./interview-memory";

export type CoAuthorTurn = {
  memory: string;
  interpretation: string;
  proposal: string;
  decision: string;
  editorNote?: string;
};

export const FORBIDDEN_GENERIC_QUESTION_PATTERNS = [
  /parlami del libro/i,
  /raccontami meglio/i,
  /sviluppa l'idea/i,
  /dimmi di più/i,
  /spiegami meglio/i,
  /raccontami il libro come lo racconteresti a un amico/i,
  /da dove iniziamo\?$/i,
];

export type GenreExpertProfile = {
  id: string;
  focus: string[];
  interpretationLens: string;
  proposalStyle: string;
};

const GENRE_EXPERTS: Record<string, GenreExpertProfile> = {
  "dark-romance": {
    id: "dark-romance",
    focus: ["ossessione", "tensione", "desiderio", "pericolo"],
    interpretationLens: "il cuore della storia sembra stare tra desiderio e autodistruzione",
    proposalStyle: "potremo spingere il love interest verso una pericolosità elegante, non gratuita",
  },
  thriller: {
    id: "thriller",
    focus: ["suspense", "mistero", "pressione", "bugie"],
    interpretationLens: "la pressione nasce da una verità che qualcuno non può lasciar uscire",
    proposalStyle: "potremmo far pagare ogni indizio con una perdita concreta",
  },
  horror: {
    id: "horror",
    focus: ["paura", "regole", "atmosfera", "minaccia"],
    interpretationLens: "l'orrore funziona se esiste una regola chiara da infrangere",
    proposalStyle: "potremmo costruire una minaccia che contamina il quotidiano",
  },
  fantasy: {
    id: "fantasy",
    focus: ["worldbuilding", "magia", "destino", "costo del potere"],
    interpretationLens: "il mondo sembra reggersi su una ferita antica e su una regola infrangibile",
    proposalStyle: "potremmo dare a ogni potere un prezzo che il protagonista non vuole pagare",
  },
  "self-help": {
    id: "self-help",
    focus: ["trasformazione", "metodo", "risultato", "credibilità"],
    interpretationLens: "il lettore non cerca motivazione vuota, ma un percorso credibile",
    proposalStyle: "potremmo costruire un metodo in step con risultati verificabili",
  },
  poetry: {
    id: "poetry",
    focus: ["immagini", "ritmo", "simbolismo", "emozione"],
    interpretationLens: "la raccolta sembra orbitare attorno a un'immagine che torna come ossessione",
    proposalStyle: "potremmo far dialogare frammenti brevi e versi più lenti",
  },
  memoir: {
    id: "memoir",
    focus: ["esperienza", "significato", "trasformazione", "verità"],
    interpretationLens: "il libro sembra voler trasformare un'esperienza vissuta in significato condivisibile",
    proposalStyle: "potremmo costruire capitoli come tappe di una trasformazione reale, non come autobiografia piatta",
  },
  romance: {
    id: "romance",
    focus: ["desiderio", "vulnerabilità", "scelta", "conseguenze"],
    interpretationLens: "la storia vive nel momento in cui due persone non possono più fare finta di niente",
    proposalStyle: "potremmo trattenere la resa emotiva fino a un punto di non ritorno",
  },
  general: {
    id: "general",
    focus: ["conflitto", "trasformazione", "promessa"],
    interpretationLens: "il libro sembra chiedere una decisione che non può essere rimandata",
    proposalStyle: "potremmo rendere ogni scena una scelta con conseguenze",
  },
};

function resolveGenreExpert(memory: ForgeInterviewMemory): GenreExpertProfile {
  const bag = [
    memory.slotValues.genre,
    memory.slotValues.bookType,
    memory.slotValues.subgenre,
    memory.slotValues.rawIdea,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/dark romance|dark-romance/.test(bag)) return GENRE_EXPERTS["dark-romance"];
  if (/thriller|mistero|noir|giallo/.test(bag)) return GENRE_EXPERTS.thriller;
  if (/horror|gotico|gothic/.test(bag)) return GENRE_EXPERTS.horror;
  if (/fantasy|magia|regno/.test(bag)) return GENRE_EXPERTS.fantasy;
  if (/self-help|bloccato|metodo/.test(bag)) return GENRE_EXPERTS["self-help"];
  if (/poesia|poetry|verso/.test(bag)) return GENRE_EXPERTS.poetry;
  if (/memoir|autobiograf|vissut|esperienza vera/.test(bag)) return GENRE_EXPERTS.memoir;
  if (/romance|amore/.test(bag)) return GENRE_EXPERTS.romance;
  return GENRE_EXPERTS.general;
}

function clip(text: string, max = 120): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function buildMemoryLine(memory: ForgeInterviewMemory): string {
  const parts: string[] = [];
  if (isSlotFilled(memory, "language")) parts.push(`in ${memory.slotValues.language}`);
  const direction =
    memory.slotValues.subgenre || memory.slotValues.genre || memory.slotValues.bookType;
  if (direction) parts.push(String(direction));
  if (isSlotFilled(memory, "setting")) parts.push(`ambientato in ${clip(String(memory.slotValues.setting), 40)}`);
  if (isSlotFilled(memory, "protagonist")) {
    parts.push(`con ${clip(String(memory.slotValues.protagonist), 50)}`);
  }

  if (parts.length === 0) {
    return isSlotFilled(memory, "rawIdea")
      ? `Stiamo costruendo: ${clip(String(memory.slotValues.rawIdea), 90)}.`
      : "Stiamo aprendo il taccuino del libro.";
  }

  return `Quindi stiamo costruendo ${parts.join(", ")}.`;
}

function buildInterpretation(memory: ForgeInterviewMemory, expert: GenreExpertProfile): string {
  const mode = detectBookMode(memory);
  const conflict = String(memory.slotValues.centralConflict ?? "");
  const raw = String(memory.slotValues.rawIdea ?? "");

  if (mode === "nonfiction") {
    if (isSlotFilled(memory, "problem") && conflict !== raw) {
      return `Mi sembra che il problema centrale sia: ${clip(String(memory.slotValues.problem), 110)}.`;
    }
    if (isSlotFilled(memory, "promise")) {
      const promise = String(memory.slotValues.promise ?? "");
      if (promise !== raw && promise.length > 16) {
        return `La promessa che sento è: ${clip(promise, 110)}.`;
      }
    }
    return `Mi sembra che ${expert.interpretationLens}.`;
  }

  if (isSlotFilled(memory, "centralConflict") && conflict !== raw) {
    return `Mi sembra che il motore della storia sia: ${clip(conflict, 110)}.`;
  }
  if (isSlotFilled(memory, "promise")) {
    const promise = String(memory.slotValues.promise ?? "");
    if (promise !== raw && promise.length > 16) {
      return `La promessa che sento è: ${clip(promise, 110)}.`;
    }
  }
  return `Mi sembra che ${expert.interpretationLens}.`;
}

function buildProposal(
  memory: ForgeInterviewMemory,
  expert: GenreExpertProfile,
  question: InterviewQuestion,
): string {
  const intent = question.id;

  if (intent.includes("antagonist") || intent.includes("characters")) {
    const pro = memory.slotValues.protagonist;
    if (/dark|romance|ossessione/i.test(String(memory.slotValues.genre ?? ""))) {
      return "Una possibilità: il love interest non è solo magnetico — è anche la minaccia emotiva più credibile.";
    }
    return pro
      ? "Potremmo far scontrare il protagonista con una forza contraria che conosce la sua ferita meglio di chiunque altro."
      : `${expert.proposalStyle}.`;
  }

  if (intent.includes("ending") || intent.includes("plot")) {
    return "Potremmo spingere il finale verso una scelta irreversibile — redenzione, tragedia o crepa aperta.";
  }

  if (intent.includes("tone")) {
    return "Potremmo tenere il tono elegante e pericoloso, senza scivolare nel melodramma facile.";
  }

  if (intent.includes("structure") || intent.includes("index")) {
    return "Potremmo impostare un indice che segue l'escalation emotiva, non solo la cronologia.";
  }

  if (intent.includes("story-scene") || intent.includes("scene")) {
    return "Potremmo ancorare questa scena a un dettaglio concreto — un gesto, un oggetto, un silenzio — che il lettore non dimentica.";
  }

  if (intent.includes("story-arc") || intent.startsWith("arc")) {
    return "Potremmo far pagare questo nodo dell'arco con una perdita visibile, non solo con una spiegazione.";
  }

  if (intent.includes("story-ending") || intent.startsWith("ending")) {
    return "Potremmo rendere il finale moralmente costoso — una scelta che nessuno può annullare.";
  }

  return expert.proposalStyle.charAt(0).toUpperCase() + expert.proposalStyle.slice(1) + ".";
}

function buildEditorNote(memory: ForgeInterviewMemory): string | undefined {
  const warnings = memory.slotValues.forbiddenElements;
  if (Array.isArray(warnings) && warnings.length > 0) return undefined;

  const tone = String(memory.slotValues.tone ?? "");
  const genre = String(memory.slotValues.genre ?? memory.slotValues.bookType ?? "");
  if (/dark romance|thriller/i.test(genre) && /dolce|leggero|feel-good/i.test(tone)) {
    return "Attenzione editoriale: questo tono rischia di indebolire la tensione che il genere promette.";
  }
  if (/tragedia|devastante/i.test(String(memory.slotValues.endingDirection ?? "")) && /commercial|leggero/i.test(tone)) {
    return "Questo finale potrebbe risultare prevedibile se non lo rendiamo moralmente costoso.";
  }
  return undefined;
}

export function isForbiddenGenericQuestion(text: string): boolean {
  return FORBIDDEN_GENERIC_QUESTION_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

export function sanitizeDecisionQuestion(text: string, fallback: string): string {
  if (!text.trim() || isForbiddenGenericQuestion(text)) return fallback;
  return text.trim();
}

export function composeCoAuthorTurn(
  state: GuidedInterviewState,
  question: InterviewQuestion,
): CoAuthorTurn {
  const memory = getForgeMemory(state);
  const expert = resolveGenreExpert(memory);
  const editorNote = buildEditorNote(memory);

  const decision = sanitizeDecisionQuestion(
    question.question,
    "Quale strada senti più vera per il libro adesso?",
  );

  return {
    memory: buildMemoryLine(memory),
    interpretation: buildInterpretation(memory, expert),
    proposal: buildProposal(memory, expert, question),
    decision,
    editorNote,
  };
}

export function formatCoAuthorMessage(turn: CoAuthorTurn): string {
  const blocks = [
    turn.memory,
    turn.interpretation,
    turn.proposal,
    turn.decision,
  ];
  if (turn.editorNote) blocks.splice(3, 0, turn.editorNote);
  return blocks.filter(Boolean).join("\n\n");
}

export function enrichQuestionWithCoAuthor(
  state: GuidedInterviewState,
  question: InterviewQuestion,
): InterviewQuestion {
  if (question.id === "welcome-opening" || question.id === "assistant-opening") {
    return question;
  }

  const turn = composeCoAuthorTurn(state, question);
  const formatted = formatCoAuthorMessage(turn);
  return {
    ...question,
    question: enrichCoAuthorWithOrchestrator(state, formatted, question),
    helper: question.helper,
  };
}

export function getDnaLockHeadline(ready: boolean): string {
  return ready ? "Il libro che ho capito" : "Stiamo ancora costruendo il libro insieme";
}

export function getDnaLockConfirmPrompt(): string {
  return "È davvero questo il libro che vuoi scrivere?";
}

export function slotLabelForArchitect(slot: ForgeSlotKey): string {
  const map: Partial<Record<ForgeSlotKey, string>> = {
    language: "Lingua",
    genre: "Genere",
    subgenre: "Sottogenere",
    tone: "Tono",
    audience: "Target",
    protagonist: "Protagonista",
    antagonist: "Antagonista",
    centralConflict: "Conflitto",
    promise: "Promessa",
    endingDirection: "Finale",
    narrativeArc: "Arco narrativo",
    chapterCount: "Capitoli",
    title: "Titolo",
    subtitle: "Sottotitolo",
    indexOutline: "Indice",
    method: "Metodo",
    problem: "Problema",
    outcome: "Trasformazione",
  };
  return map[slot] ?? slot;
}
