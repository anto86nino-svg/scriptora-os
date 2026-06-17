import type { BookConfig } from "@/types/book";
import { computePremiumEditorialScores } from "@/lib/editorial-intelligence-premium";
import { computeMarketPremiumScores } from "@/lib/market-intelligence-premium";
import { getGenreProfile } from "@/lib/genre-intelligence";
import { resolveGenreBrainProfile } from "@/lib/GenreBrain";
import {
  evaluateEditorialUnderstanding,
  detectEditorialBookMode,
} from "./book-understanding-engine";
import { buildCanonFromState, isCanonComplete } from "./canon-genesis-engine";
import { buildForgeInterviewSeed, validateForgeHandoffForBlueprint } from "./forge-blueprint-handoff";
import { getCharactersCompletionReport } from "./character-forge-engine";
import { getForgeMemory, isSlotFilled } from "./interview-memory";
import { buildStoryRoomSnapshot } from "./story-room-engine";
import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { sanitizeDnaText } from "./dna-cleaner";

export type OrchestratorBrainId =
  | "character"
  | "canon"
  | "genre"
  | "tension"
  | "editorial"
  | "narrative"
  | "blueprint"
  | "market"
  | "memory";

export type BrainInsight = {
  brain: OrchestratorBrainId;
  label: string;
  status: "ok" | "warn" | "note";
  message: string;
};

export type AuthorDecisionEvaluation = {
  verdict: "works" | "caution" | "reconsider";
  headline: string;
  insights: BrainInsight[];
  refinement?: string;
};

export type DnaLockPremiumReport = {
  ready: boolean;
  insights: BrainInsight[];
  incoherences: string[];
  commercialNotes: string[];
};

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function pitchFromState(state: GuidedInterviewState): string {
  const ex = state.extracted ?? {};
  const memory = getForgeMemory(state);
  return [
    ex.promise,
    ex.centralConflict,
    ex.readerTransformation,
    ex.setting,
    ex.emotionalTone,
    memory.slotValues.protagonist,
    memory.slotValues.antagonist,
  ]
    .map(clean)
    .filter(Boolean)
    .join(" ");
}

function configFromState(state: GuidedInterviewState): Partial<BookConfig> {
  const ex = state.extracted ?? {};
  return {
    genre: (ex.genre ?? state.selectedGenre) as BookConfig["genre"],
    subcategory: ex.subgenre,
    language: ex.language,
    idea: ex.promise,
    title: ex.bookTitle ?? state.titleIntelligence?.definitiveTitle,
  };
}

function genreLabel(state: GuidedInterviewState): string {
  const ex = state.extracted ?? {};
  return clean(ex.genre ?? ex.genreDNA ?? state.selectedGenre ?? state.inferredProfile?.genre);
}

function lastUserMessage(state: GuidedInterviewState): string | undefined {
  const msgs = state.messages.filter((m) => m.role === "user");
  return msgs[msgs.length - 1]?.content?.trim();
}

export function consultForgeBrains(state: GuidedInterviewState): BrainInsight[] {
  const insights: BrainInsight[] = [];
  const editorial = evaluateEditorialUnderstanding(state);
  const canon = buildCanonFromState(state);
  const seed = buildForgeInterviewSeed(state);
  const handoff = validateForgeHandoffForBlueprint(seed);
  const genre = genreLabel(state);
  const charReport = getCharactersCompletionReport(state);
  const storyRoom = buildStoryRoomSnapshot(state);

  insights.push({
    brain: "character",
    label: "Character Intelligence",
    status: charReport.complete ? "ok" : "note",
    message: charReport.complete
      ? "Coerente con un protagonista abbastanza vivo."
      : "Il protagonista ha ancora zone da rendere credibili.",
  });

  insights.push({
    brain: "canon",
    label: "Canon Brain",
    status: isCanonComplete({ ...state, canon }) ? "ok" : "warn",
    message: isCanonComplete({ ...state, canon })
      ? `Canon narrativo con ${canon.story.facts.length} ancore ferme.`
      : "Canon ancora sottile — servono decisioni più nette.",
  });

  if (genre) {
    try {
      const profile = getGenreProfile(genre);
      resolveGenreBrainProfile({ config: configFromState(state) as BookConfig });
      insights.push({
        brain: "genre",
        label: "Genre Brain",
        status: "ok",
        message: `Lente ${genre}: privilegia ${profile.chapterBeats[0] ?? profile.readerPromise}.`,
      });
    } catch {
      insights.push({
        brain: "genre",
        label: "Genre Brain",
        status: "note",
        message: `Direzione ${genre} riconosciuta.`,
      });
    }
  }

  if (editorial.contradictions.length > 0) {
    insights.push({
      brain: "editorial",
      label: "Editorial Intelligence",
      status: "warn",
      message: editorial.contradictions[0]?.label ?? "Contraddizione editoriale da risolvere.",
    });
  } else {
    insights.push({
      brain: "editorial",
      label: "Editorial Intelligence",
      status: editorial.readyForBlueprint ? "ok" : "note",
      message: editorial.readyForBlueprint
        ? "Coerenza editoriale solida."
        : "Alcune zone del libro sono ancora morbide.",
    });
  }

  insights.push({
    brain: "narrative",
    label: "Narrative Intelligence",
    status: storyRoom.completionPct >= 45 ? "ok" : "note",
    message:
      storyRoom.completionPct >= 45
        ? "Story Room con spina dorsale narrativa emergente."
        : "Architettura narrativa ancora in costruzione.",
  });

  insights.push({
    brain: "blueprint",
    label: "Blueprint Integrity",
    status: handoff.ready ? "ok" : "warn",
    message: handoff.ready
      ? "Handoff pronto per blueprint."
      : `Prima del blueprint manca: ${handoff.missing.join(", ")}.`,
  });

  const pitch = pitchFromState(state);
  if (/possessiv|ossession|pericol|tensione|desiderio|minaccia|mistero|pressione/i.test(pitch)) {
    insights.push({
      brain: "tension",
      label: "Tension Engine",
      status: "ok",
      message: "Segnali di tensione emotiva o suspense nel concept.",
    });
  }

  if (pitch.length > 36) {
    const market = computeMarketPremiumScores({
      content: pitch,
      genre,
      language: state.extracted?.language,
    });
    if (market.bookTokPotential != null && market.bookTokPotential >= 60) {
      insights.push({
        brain: "market",
        label: "Market Intelligence",
        status: "note",
        message: "Appeal commerciale interessante per il genere.",
      });
    }
  }

  insights.push({
    brain: "memory",
    label: "Memory Consistency",
    status: editorial.contradictions.length === 0 ? "ok" : "warn",
    message:
      editorial.contradictions.length === 0
        ? "Nessuna deriva evidente tra le decisioni prese."
        : "Rischio di incoerenza tra memoria e nuove scelte.",
  });

  return insights;
}

export function evaluateAuthorDecision(
  state: GuidedInterviewState,
  answer: string,
  _questionKey?: string,
): AuthorDecisionEvaluation | null {
  const text = clean(answer);
  if (text.length < 8) return null;

  const insights: BrainInsight[] = [];
  const genre = genreLabel(state).toLowerCase();
  let verdict: AuthorDecisionEvaluation["verdict"] = "works";
  let refinement: string | undefined;

  if (/possessiv|ossess|pericolos|magnetico|controllo/i.test(text)) {
    insights.push({
      brain: "character",
      label: "Character Brain",
      status: "ok",
      message: "Coerente con una forza contraria magnetica.",
    });
    insights.push({
      brain: "tension",
      label: "Tension Engine",
      status: "ok",
      message: "Aumenta tensione romantica e attrito emotivo.",
    });
    if (/dark romance|romance/i.test(genre)) {
      insights.push({
        brain: "market",
        label: "Market Intelligence",
        status: "note",
        message: "Appeal commerciale interessante per dark romance.",
      });
    }
    if (/estremamente|sempre|solo lui|mai lascia|totale controllo/i.test(text)) {
      verdict = "caution";
      refinement =
        "Attenzione però a non renderlo monodimensionale. Potremmo nascondere una vulnerabilità che emerga più avanti.";
      insights.push({
        brain: "editorial",
        label: "Editorial Intelligence",
        status: "warn",
        message: "Rischio cliché del love interest perfettamente oscuro.",
      });
    }
  }

  if (/finale|muore|redenzione|tragedia|liber|devast/i.test(text)) {
    insights.push({
      brain: "narrative",
      label: "Narrative Intelligence",
      status: "ok",
      message: "Decisione finale con peso narrativo.",
    });
  }

  const editorialScores = computePremiumEditorialScores({
    content: text,
    genre,
    language: state.extracted?.language,
  });
  if (editorialScores.surgicalSuggestions.length > 0 && verdict === "works") {
    const hint = editorialScores.surgicalSuggestions[0];
    if (/generic|clich|piatto|prevedibil/i.test(hint)) {
      verdict = "caution";
      refinement = refinement ?? hint;
      insights.push({
        brain: "editorial",
        label: "Editorial Intelligence",
        status: "warn",
        message: hint,
      });
    }
  }

  if (insights.length === 0) return null;

  const headline =
    verdict === "works"
      ? "Funziona."
      : verdict === "caution"
        ? "Funziona — ma con attenzione."
        : "Rivediamo questa scelta.";

  return {
    verdict,
    headline,
    insights: insights.slice(0, 4),
    refinement,
  };
}

export function formatAdvisorEvaluation(evaluation: AuthorDecisionEvaluation): string {
  const lines = [evaluation.headline];
  for (const insight of evaluation.insights) {
    const prefix =
      insight.status === "warn" ? "Attenzione" : insight.label.replace(/ Intelligence$/, "");
    lines.push(`${prefix}: ${insight.message}`);
  }
  if (evaluation.refinement) lines.push(evaluation.refinement);
  return lines.join("\n");
}

export function getPassiveCommercialNotes(state: GuidedInterviewState): string[] {
  const notes: string[] = [];
  const pitch = pitchFromState(state);
  const genre = genreLabel(state);
  const title = clean(
    state.extracted?.bookTitle ?? state.titleIntelligence?.definitiveTitle ?? "",
  );
  const promise = clean(state.extracted?.promise ?? "");

  if (pitch.length > 30) {
    const market = computeMarketPremiumScores({
      content: pitch,
      genre,
      language: state.extracted?.language,
    });
    if (market.bookTokPotential != null && market.bookTokPotential >= 62) {
      notes.push("Questo concept ha forte potenziale BookTok.");
    }
    if (market.genreAlignment < 55 && market.genreAlignmentNote) {
      notes.push(market.genreAlignmentNote);
    }
  }

  if (promise.length > 28 && title.length > 0 && title.length < 12) {
    notes.push("Il titolo attuale sembra più debole del concept.");
  }

  return notes.slice(0, 2);
}

export function evaluateDnaLockPremium(state: GuidedInterviewState): DnaLockPremiumReport {
  const insights = consultForgeBrains(state);
  const incoherences = insights
    .filter((insight) => insight.status === "warn")
    .map((insight) => `${insight.label}: ${insight.message}`);
  const commercialNotes = getPassiveCommercialNotes(state);
  const editorial = evaluateEditorialUnderstanding(state);

  return {
    ready: incoherences.length === 0 && editorial.contradictions.length === 0,
    insights,
    incoherences,
    commercialNotes,
  };
}

export function canEnterFinalDecisionMode(state: GuidedInterviewState): boolean {
  if (detectEditorialBookMode(state) !== "fiction") {
    return Boolean(clean(state.extracted?.method) || clean(state.extracted?.promise));
  }

  const memory = getForgeMemory(state);
  const protagonistReady =
    getCharactersCompletionReport(state).complete || isSlotFilled(memory, "protagonist");
  const conflictReady = isSlotFilled(memory, "centralConflict");
  const structureReady =
    isSlotFilled(memory, "chapterCount") ||
    isSlotFilled(memory, "indexOutline") ||
    isSlotFilled(memory, "pov");

  return protagonistReady && conflictReady && structureReady;
}

export function buildOrchestratorEditorNote(
  state: GuidedInterviewState,
  question: InterviewQuestion,
): string | undefined {
  const answer = lastUserMessage(state);
  if (!answer) return undefined;

  const evaluation = evaluateAuthorDecision(state, answer, question.key);
  if (evaluation) return formatAdvisorEvaluation(evaluation);

  const notes = getPassiveCommercialNotes(state);
  if (notes.length > 0 && state.messages.filter((m) => m.role === "user").length % 4 === 0) {
    return notes[0];
  }

  return undefined;
}

export function enrichCoAuthorWithOrchestrator(
  state: GuidedInterviewState,
  message: string,
  question: InterviewQuestion,
): string {
  const note = buildOrchestratorEditorNote(state, question);
  if (!note) return message;
  if (message.includes(note)) return message;
  const parts = message.split("\n\n");
  if (parts.length >= 3) {
    parts.splice(3, 0, note);
    return parts.filter(Boolean).join("\n\n");
  }
  return `${message}\n\n${note}`;
}
