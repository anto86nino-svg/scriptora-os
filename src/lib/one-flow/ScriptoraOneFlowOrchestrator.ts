import type { BookBlueprint, BookConfig } from "@/types/book";
import type { GuidedInterviewState, InterviewQuestion } from "@/lib/guided-interview/types";
import type { ExpressForgeInput, ExpressBookFormat } from "@/lib/guided-interview/express-forge-types";
import { buildExpressForgeConfiguration } from "@/lib/guided-interview/express-forge-config";
import {
  applyExpressScenarioToState,
  ensureExpressWriterReadiness,
  repairForgeHandoffSeedForBlueprint,
} from "@/lib/guided-interview/express-book-package";
import {
  autoFillBookFoundationIfNeeded,
  confirmBookFoundationLock,
  generateTitleSubtitleOptions,
} from "@/lib/guided-interview/book-foundation-lock";
import { getBlueprintGateStatus, shouldBlockNarrativeQuestions } from "@/lib/guided-interview/blueprint-ready-gate";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getNextInterviewQuestion,
} from "@/lib/guided-interview/question-engine";
import { buildFinalBookReview } from "@/lib/guided-interview/final-book-review";
import { buildForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";
import { enrichBookConfigFromForgeSeed } from "@/lib/guided-interview/forge-writer-bridge";
import { hasRichIdeaEntities } from "@/lib/blueprint-entity-enrichment";
import { buildFallbackBlueprintFromConfig } from "@/lib/blueprint-recovery";
import { resolveNarrativePromise } from "@/lib/narrative-promise-intelligence";
import { regenerateTitleFromIdea } from "@/lib/title-intelligence-validation";
import { isInvalidGeneratedTitle } from "@/lib/title-intelligence-validation";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { normalizeBookConfig } from "@/lib/book-config-studio/defaults";

export type OneFlowPhase = "interview" | "proposal" | "ready";

export type AuthorProposal = {
  title: string;
  subtitle: string;
  promise: string;
  targetReader: string;
  tone: string;
  characters: string;
  premise: string;
  genre: string;
  rawIdea: string;
};

export type OneFlowSession = {
  rawIdea: string;
  genreHint?: string;
  language: string;
  state: GuidedInterviewState;
  phase: OneFlowPhase;
  questionsAsked: number;
  questionBudget: number;
  currentQuestion: InterviewQuestion | null;
  proposal: AuthorProposal | null;
  config: BookConfig | null;
  blueprint: BookBlueprint | null;
  blockingIssues: string[];
};

const CHIP_HINTS: Record<string, Partial<ExpressForgeInput>> = {
  Romanzo: { bookFormat: "novel", genre: "narrativa" },
  Thriller: { bookFormat: "novel", genre: "thriller" },
  Horror: { bookFormat: "novel", genre: "horror" },
  Fantasy: { bookFormat: "novel", genre: "fantasy" },
  Manuale: { bookFormat: "self_help", genre: "self-help" },
  Workbook: { bookFormat: "workbook", genre: "workbook" },
  Memoir: { bookFormat: "memoir", genre: "memoir" },
  "Raccolta poetica": { bookFormat: "poetry_collection", genre: "poesia" },
  Cookbook: { bookFormat: "cookbook", genre: "cookbook" },
  Ricettario: { bookFormat: "cookbook", genre: "cookbook" },
  "Libro di ricette": { bookFormat: "cookbook", genre: "cookbook" },
};

export function resolveQuestionBudget(idea: string): number {
  if (hasRichIdeaEntities(idea)) return 2;
  const trimmed = idea.trim();
  if (trimmed.length >= 80 || trimmed.split(/\s+/).length >= 14) return 5;
  if (trimmed.length >= 30 || trimmed.split(/\s+/).length >= 6) return 5;
  return 5;
}

export function mapGenreHintToExpressInput(hint?: string): Partial<ExpressForgeInput> {
  if (!hint) return {};
  const direct = CHIP_HINTS[hint];
  if (direct) return direct;
  const normalized = hint.trim().toLowerCase();
  if (normalized === "cookbook" || normalized === "ricettario" || normalized.includes("libro di ricette")) {
    return { bookFormat: "cookbook", genre: "cookbook" };
  }
  return {};
}

function pickCommercialPackage(result: ReturnType<typeof buildExpressForgeConfiguration>) {
  return result.packages.find((pkg) => pkg.variant === "commercial") ?? result.packages[1] ?? result.packages[0]!;
}

function lockExpressFoundation(state: GuidedInterviewState): GuidedInterviewState {
  let next = state;
  if (next.expressConfig?.controlLevel === "auto") {
    next = autoFillBookFoundationIfNeeded(next);
  }
  if (next.bookFoundation && !next.bookFoundationLocked) {
    next = confirmBookFoundationLock(next, next.bookFoundation);
  }
  return next;
}

function buildExpressInput(
  idea: string,
  opts: { genreHint?: string; language?: string } = {},
): ExpressForgeInput {
  const hint = mapGenreHintToExpressInput(opts.genreHint);
  return {
    bookFormat: (hint.bookFormat ?? "novel") as ExpressBookFormat,
    genre: hint.genre ?? "",
    language: opts.language ?? "Italiano",
    titleMode: "suggest",
    ideaSeed: idea.trim(),
    tone: "",
    length: "medio",
    controlLevel: "auto",
  };
}

function sessionPhase(state: GuidedInterviewState, questionsAsked: number, budget: number): OneFlowPhase {
  const gate = getBlueprintGateStatus(state);
  if (gate.isBlueprintReady || shouldBlockNarrativeQuestions(state)) return "proposal";
  if (questionsAsked >= budget) return "proposal";
  return "interview";
}

function resolveCurrentQuestion(state: GuidedInterviewState, phase: OneFlowPhase): InterviewQuestion | null {
  if (phase !== "interview") return null;
  const next = getNextInterviewQuestion(state);
  if (next.done) return null;
  return next.question ?? null;
}

export function buildAuthorProposalFromState(state: GuidedInterviewState, rawIdea: string): AuthorProposal {
  const review = buildFinalBookReview(state);
  const ex = state.extracted ?? {};
  return {
    title: review.title === "—" ? String(ex.bookTitle ?? "") : review.title,
    subtitle: review.subtitle === "—" ? String(ex.bookSubtitle ?? "") : review.subtitle,
    promise: review.promise === "—" ? String(ex.promise ?? "") : review.promise,
    targetReader: review.targetReader === "—" ? String(ex.targetReader ?? "") : review.targetReader,
    tone: String(ex.emotionalTone ?? ex.tone ?? state.selectedTone ?? ""),
    characters: review.characters === "—" ? "" : review.characters,
    premise: String(ex.editorialSynopsis ?? ex.openingHook ?? rawIdea).slice(0, 480),
    genre: review.genre === "—" ? String(state.selectedGenre ?? ex.genre ?? "") : review.genre,
    rawIdea,
  };
}

export function startOneFlowSession(
  idea: string,
  opts: { genreHint?: string; language?: string } = {},
): OneFlowSession {
  const trimmed = idea.trim();
  const budget = resolveQuestionBudget(trimmed);
  const expressResult = buildExpressForgeConfiguration(
    buildExpressInput(trimmed, opts),
    getInitialInterviewState({ chatFirst: true }),
  );
  const scenario = pickCommercialPackage(expressResult);
  let state = applyExpressScenarioToState(expressResult.state, scenario);
  state = lockExpressFoundation(state);

  const rich = hasRichIdeaEntities(trimmed);
  const phase = rich && getBlueprintGateStatus(state).isBlueprintReady ? "proposal" : sessionPhase(state, 0, budget);
  const proposal = phase === "proposal" ? buildAuthorProposalFromState(state, trimmed) : null;

  return {
    rawIdea: trimmed,
    genreHint: opts.genreHint,
    language: opts.language ?? "Italiano",
    state,
    phase,
    questionsAsked: 0,
    questionBudget: budget,
    currentQuestion: resolveCurrentQuestion(state, phase === "proposal" ? "interview" : phase),
    proposal,
    config: null,
    blueprint: null,
    blockingIssues: [],
  };
}

export function answerOneFlowQuestion(session: OneFlowSession, answer: string): OneFlowSession {
  const payload = answer.trim();
  if (!payload || !session.currentQuestion) return session;

  const updated = applyInterviewAnswer(session.state, payload, session.currentQuestion);
  let state = lockExpressFoundation(updated);
  const questionsAsked = session.questionsAsked + 1;
  const phase = sessionPhase(state, questionsAsked, session.questionBudget);
  const proposal = phase === "proposal" ? buildAuthorProposalFromState(state, session.rawIdea) : session.proposal;

  return {
    ...session,
    state,
    questionsAsked,
    phase,
    currentQuestion: resolveCurrentQuestion(state, phase),
    proposal,
  };
}

export function skipToProposalIfReady(session: OneFlowSession): OneFlowSession {
  const gate = getBlueprintGateStatus(session.state);
  if (!gate.isBlueprintReady && !shouldBlockNarrativeQuestions(session.state)) return session;
  const proposal = buildAuthorProposalFromState(session.state, session.rawIdea);
  return {
    ...session,
    phase: "proposal",
    currentQuestion: null,
    proposal,
  };
}

function patchStateFromProposal(state: GuidedInterviewState, proposal: AuthorProposal): GuidedInterviewState {
  return {
    ...state,
    extracted: {
      ...state.extracted,
      bookTitle: proposal.title,
      bookSubtitle: proposal.subtitle,
      promise: proposal.promise,
      targetReader: proposal.targetReader,
      emotionalTone: proposal.tone,
      tone: proposal.tone,
      editorialSynopsis: proposal.premise,
    },
    characters: proposal.characters
      ? state.characters
      : state.characters,
  };
}

export function applyProposalEditIntent(session: OneFlowSession, editText: string): OneFlowSession {
  const text = editText.trim().toLowerCase();
  if (!text || !session.proposal) return session;

  let proposal = { ...session.proposal };
  let state = { ...session.state };

  const genre = proposal.genre || state.selectedGenre || "narrativa";
  const idea = session.rawIdea;

  if (/pi[uù]\s*oscur|darker|pi[uù]\s*dark|gotico|inquietant/.test(text)) {
    proposal.tone = /inquietant/.test(text) ? "inquietante, claustrofobico" : "oscuro, disturbante, teso";
    state = {
      ...state,
      selectedTone: proposal.tone,
      extracted: { ...state.extracted, emotionalTone: proposal.tone, tone: proposal.tone },
    };
  }

  if (/commerc|titolo\s*forte|bestseller|vendibil/.test(text)) {
    const titles = generateTitleSubtitleOptions({
      genre,
      language: session.language,
      ideaSeed: idea,
      tone: proposal.tone,
      lengthPreset: "medio",
    });
    const commercial = titles.find((t) => !isInvalidGeneratedTitle(t.title, idea)) ?? titles[0];
    if (commercial) {
      proposal.title = commercial.title;
      proposal.subtitle = commercial.subtitle;
    } else {
      const regen = regenerateTitleFromIdea({
        genre,
        language: session.language,
        idea,
        tone: proposal.tone,
        titleSeed: proposal.title,
      });
      if (regen) {
        proposal.title = regen.title;
        proposal.subtitle = regen.subtitle;
      }
    }
  }

  if (/meno\s*personagg|fewer\s*char|cast\s*ridotto/.test(text)) {
    const trimmed = (state.characters ?? []).slice(0, 2);
    state = { ...state, characters: trimmed };
    const lead = trimmed.find((c) => c.role === "protagonist") ?? trimmed[0];
    proposal.characters = lead?.name
      ? `${lead.name}${trimmed[1]?.name ? ` · ${trimmed[1].name}` : ""}`
      : proposal.characters;
  }

  if (/pi[uù]\s*tension|more\s*tension|suspense|ritmo\s*alto/.test(text)) {
    const nextPromise = resolveNarrativePromise(idea, genre, proposal.promise);
    proposal.promise = nextPromise || `${proposal.promise} — ogni capitolo aumenta la pressione fino a un punto di non ritorno.`;
    state = {
      ...state,
      extracted: { ...state.extracted, promise: proposal.promise },
    };
  }

  state = patchStateFromProposal(state, proposal);
  return {
    ...session,
    state,
    proposal,
    config: null,
    blueprint: null,
    phase: "proposal",
  };
}

export function prepareOneFlowWriterPackage(session: OneFlowSession): {
  session: OneFlowSession;
  payload: StudioLaunchPayload | null;
} {
  const readiness = ensureExpressWriterReadiness(session.state);
  if (!readiness.ready) {
    return {
      session: { ...session, blockingIssues: readiness.blockingIssues },
      payload: null,
    };
  }

  const seed = repairForgeHandoffSeedForBlueprint(buildForgeInterviewSeed(readiness.state));
  let config = enrichBookConfigFromForgeSeed(readiness.config, seed);
  const proposal = session.proposal ?? buildAuthorProposalFromState(readiness.state, session.rawIdea);

  config = normalizeBookConfig({
    ...config,
    title: proposal.title || config.title,
    subtitle: proposal.subtitle || config.subtitle,
    idea: session.rawIdea,
    promise: proposal.promise || config.promise,
    targetReader: proposal.targetReader || config.targetReader,
    tone: proposal.tone || config.tone,
    configStatus: "approved",
  });

  const blueprint = buildFallbackBlueprintFromConfig(config);

  const payload: StudioLaunchPayload = {
    config,
    blueprint,
    blueprintApproved: true,
    mode: "studio-approved",
  };

  return {
    session: {
      ...session,
      state: readiness.state,
      config,
      blueprint,
      phase: "ready",
      blockingIssues: [],
    },
    payload,
  };
}

export function canStartWritingFromSession(session: OneFlowSession): boolean {
  return session.phase === "ready" && Boolean(session.blueprint) && Boolean(session.config);
}
