import type { GuidedInterviewState, InterviewQuestion } from "./types";
import type { NarrativeDecisionRecord } from "./forge-evolution-types";
import { detectEditorialBookMode } from "./book-understanding-engine";
import { sanitizeDnaText } from "./dna-cleaner";

const MAX_DECISIONS = 12;
const MIN_DECISIONS = 3;

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function bag(state: GuidedInterviewState): string {
  const ex = state.extracted ?? {};
  return [ex.genre, ex.subgenre, ex.genreDNA, state.selectedGenre, state.inferredProfile?.genre]
    .map(clean)
    .join(" ")
    .toLowerCase();
}

type DecisionTemplate = {
  id: string;
  key: string;
  question: string;
  impact: string;
  match: RegExp;
};

const TEMPLATES: DecisionTemplate[] = [
  {
    id: "romance-fate",
    key: "protagonistFate",
    question: "Alla fine il protagonista riesce a salvarsi — o viene trascinato nell'oscurità?",
    impact: "Destino emotivo del protagonista",
    match: /romance|dark romance|amore|slow burn/,
  },
  {
    id: "thriller-culprit",
    key: "culpritFate",
    question: "Il colpevole viene scoperto — o resta nell'ombra?",
    impact: "Risoluzione del mistero",
    match: /thriller|giallo|noir|crime|mystery|horror/,
  },
  {
    id: "fantasy-kingdom",
    key: "kingdomFate",
    question: "Il regno — o il mondo che hai immaginato — sopravvive o crolla?",
    impact: "Destino del mondo",
    match: /fantasy|epic|regno|mondo|saga/,
  },
  {
    id: "selfhelp-pace",
    key: "transformationPace",
    question: "Il lettore deve trasformarsi gradualmente — o avere una svolta radicale?",
    impact: "Ritmo della trasformazione",
    match: /self-help|business|manuale|guida|saggio|nonfiction/,
  },
  {
    id: "poetry-ending",
    key: "lastPageFeeling",
    question: "Vuoi lasciare speranza o inquietudine nell'ultima pagina?",
    impact: "Respiro finale della raccolta",
    match: /poesia|poetry|lirica|versi/,
  },
  {
    id: "betrayal",
    key: "betrayal",
    question: "C'è un tradimento che cambia tutto — o la fiducia regge fino alla fine?",
    impact: "Arco di fiducia e tradimento",
    match: /romance|thriller|fantasy|narrativa|fiction/,
  },
  {
    id: "redemption",
    key: "redemption",
    question: "Qualcuno merita redenzione — o nessuno esce pulito?",
    impact: "Morale e redenzione",
    match: /romance|thriller|fantasy|literary|narrativa/,
  },
];

function pickTemplates(state: GuidedInterviewState): DecisionTemplate[] {
  const text = bag(state);
  const mode = detectEditorialBookMode(state);
  const hits = TEMPLATES.filter((t) => t.match.test(text));
  if (hits.length >= MIN_DECISIONS) return hits.slice(0, MAX_DECISIONS);

  const fallback: DecisionTemplate[] = [];
  if (mode === "fiction") {
    fallback.push(TEMPLATES[0], TEMPLATES[5], TEMPLATES[6]);
  } else if (mode === "nonfiction") {
    fallback.push(TEMPLATES[3]);
  } else if (mode === "poetry") {
    fallback.push(TEMPLATES[4]);
  } else {
    fallback.push(TEMPLATES[0], TEMPLATES[3]);
  }

  const merged = [...hits];
  for (const f of fallback) {
    if (!merged.some((m) => m.id === f.id)) merged.push(f);
  }
  return merged.slice(0, MAX_DECISIONS);
}

export function getNarrativeDecisionQuestions(state: GuidedInterviewState): InterviewQuestion[] {
  const answered = new Set((state.narrativeDecisions ?? []).filter((d) => d.answer).map((d) => d.id));
  const templates = pickTemplates(state);
  const pending = templates.filter((t) => !answered.has(t.id));
  if (pending.length === 0) return [];

  const next = pending[0];
  return [
    {
      id: `decision-${next.id}`,
      key: "narrativeDecision",
      question: next.question,
      helper: "Non serve la risposta perfetta. Serve una direzione vera.",
      placeholder: "Scegli il bivio che senti più giusto…",
    },
  ];
}

export function isNarrativeDecisionsComplete(state: GuidedInterviewState): boolean {
  const templates = pickTemplates(state);
  const answered = (state.narrativeDecisions ?? []).filter((d) => clean(d.answer).length >= 4);
  const minRequired = Math.min(templates.length, Math.max(MIN_DECISIONS, Math.ceil(templates.length * 0.6)));
  return answered.length >= minRequired;
}

export function applyNarrativeDecision(
  state: GuidedInterviewState,
  questionId: string,
  answer: string,
): NarrativeDecisionRecord[] {
  const templates = pickTemplates(state);
  const template = templates.find((t) => `decision-${t.id}` === questionId);
  const decisions = [...(state.narrativeDecisions ?? [])];
  const existing = decisions.find((d) => d.id === (template?.id ?? questionId.replace("decision-", "")));

  const record: NarrativeDecisionRecord = {
    id: template?.id ?? questionId,
    key: template?.key ?? "decision",
    question: template?.question ?? "Decisione narrativa",
    answer: clean(answer),
    impact: template?.impact,
  };

  if (existing) {
    Object.assign(existing, record);
  } else {
    decisions.push(record);
  }
  return decisions;
}
