import { buildDominantAutoDetectionProposal } from "./genre-lock-wizard";
import { resolveWizardGenreInference } from "./genre-lock-wizard";
import { getGuidedGenreAlternatives } from "@/lib/book-creation-os/genre-inference";

export const LONG_IDEA_THRESHOLD = 80;
export const SHORT_IDEA_THRESHOLD = LONG_IDEA_THRESHOLD;

export type AutoDetectionProposal = {
  genre: string;
  bookFormat: string;
  subgenre: string;
  tone: string;
  targetReader: string;
  protagonist?: string;
  setting?: string;
  bookTypeId: string;
  category: string;
  subcategory: string;
  confidence: "low" | "medium" | "high";
  detectedLabel: string;
  rationale: string;
};

export type AutoDetectionResult = {
  shouldPropose: boolean;
  proposal: AutoDetectionProposal | null;
  isShortIdea: boolean;
};

export type GenreHypothesis = {
  genre: string;
  bookTypeId: string;
  bookFormat: string;
  label: string;
  confidencePercent: number;
};

const CONFIDENCE_WEIGHT: Record<"low" | "medium" | "high", number> = {
  low: 1,
  medium: 2.5,
  high: 4,
};

function ideaLengthBoost(length: number): number {
  if (length >= 160) return 1.4;
  if (length >= 80) return 1.15;
  if (length >= 40) return 0.9;
  if (length >= 20) return 0.75;
  return 0.55;
}

function normalizeHypothesisPercents(hypotheses: GenreHypothesis[]): GenreHypothesis[] {
  if (!hypotheses.length) return [];
  const total = hypotheses.reduce((sum, h) => sum + h.confidencePercent, 0);
  if (total <= 0) return hypotheses;
  const scaled = hypotheses.map((h) => ({
    ...h,
    confidencePercent: Math.round((h.confidencePercent / total) * 100),
  }));
  const drift = 100 - scaled.reduce((sum, h) => sum + h.confidencePercent, 0);
  if (drift !== 0 && scaled[0]) {
    scaled[0] = { ...scaled[0], confidencePercent: scaled[0].confidencePercent + drift };
  }
  return scaled;
}

function shortIdeaKeywordHypotheses(idea: string): GenreHypothesis[] {
  const hay = idea.toLowerCase();
  const rules: Array<{ test: RegExp; genre: string; bookTypeId: string; label: string; weight: number }> = [
    { test: /fantasy|regno|magia|maledett|ombre|sangue|elfo|drago/i, genre: "fantasy", bookTypeId: "fantasy", label: "Fantasy", weight: 3 },
    { test: /horror|dark|gotico|paura|mostro|stazione|03:17/i, genre: "horror", bookTypeId: "horror", label: "Horror", weight: 3 },
    { test: /thriller|omicidio|detective|psicologic|morte|indag/i, genre: "thriller", bookTypeId: "thriller", label: "Thriller", weight: 3 },
    { test: /futuro|lettere|visioni|tempo|destino|profet/i, genre: "fantasy", bookTypeId: "fantasy", label: "Fantasy", weight: 2.5 },
    { test: /futuro|lettere|morte|notte|terribil/i, genre: "thriller", bookTypeId: "thriller", label: "Thriller", weight: 2 },
    { test: /ricett|cucina|mediterranea/i, genre: "cookbook", bookTypeId: "cookbook", label: "Cookbook", weight: 4 },
    { test: /poesia|poetic|liric|frammenti|aforismi/i, genre: "poetry", bookTypeId: "poetry", label: "Poesia", weight: 4 },
    { test: /romanzo contemporaneo|amore maturo|ritrovano/i, genre: "romance", bookTypeId: "literary", label: "Literary Romance", weight: 3 },
  ];

  return rules
    .filter((rule) => rule.test.test(hay))
    .map((rule) => ({
      genre: rule.genre,
      bookTypeId: rule.bookTypeId,
      bookFormat: rule.bookTypeId === "poetry" ? "poetry_collection" : "novel",
      label: rule.label,
      confidencePercent: rule.weight * 10,
    }));
}

export function detectGenreWithConfidence(
  idea: string,
  opts: {
    title?: string;
    existingGenre?: string;
    existingSubgenre?: string;
    existingBookTypeId?: string;
    genreManuallyLocked?: boolean;
  } = {},
): GenreHypothesis[] {
  const trimmed = idea.trim();
  if (trimmed.length < 6) return [];

  const title = opts.title || "";
  const primary = resolveWizardGenreInference(title, trimmed, {
    title,
    idea: trimmed,
    genre: opts.existingGenre,
    subgenre: opts.existingSubgenre,
    bookTypeId: opts.existingBookTypeId,
    genreManuallyLocked: opts.genreManuallyLocked,
  });

  const candidates = getGuidedGenreAlternatives(primary);
  const lengthBoost = ideaLengthBoost(trimmed.length);
  const scored = new Map<string, GenreHypothesis>();

  for (const candidate of candidates) {
    const key = `${candidate.genre}:${candidate.bookTypeId}`;
    const base = CONFIDENCE_WEIGHT[candidate.confidence] * lengthBoost * 10;
    const existing = scored.get(key);
    if (!existing || base > existing.confidencePercent) {
      scored.set(key, {
        genre: candidate.genre,
        bookTypeId: candidate.bookTypeId,
        bookFormat: candidate.bookFormat,
        label: candidate.label,
        confidencePercent: base,
      });
    }
  }

  for (const keywordHypothesis of shortIdeaKeywordHypotheses(trimmed)) {
    const key = `${keywordHypothesis.genre}:${keywordHypothesis.bookTypeId}`;
    const existing = scored.get(key);
    if (!existing || keywordHypothesis.confidencePercent > existing.confidencePercent) {
      scored.set(key, keywordHypothesis);
    }
  }

  const primaryKey = `${primary.genre}:${primary.bookTypeId}`;
  const primaryScore = (CONFIDENCE_WEIGHT[primary.confidence] * lengthBoost + 1.5) * 12;
  const currentPrimary = scored.get(primaryKey);
  scored.set(primaryKey, {
    genre: primary.genre,
    bookTypeId: primary.bookTypeId,
    bookFormat: primary.bookFormat,
    label: primary.label,
    confidencePercent: Math.max(currentPrimary?.confidencePercent || 0, primaryScore),
  });

  return normalizeHypothesisPercents(
    [...scored.values()].sort((a, b) => b.confidencePercent - a.confidencePercent).slice(0, 4),
  );
}

export function analyzeLongIdeaForProposal(
  idea: string,
  opts: {
    existingGenre?: string;
    existingSubgenre?: string;
    existingBookTypeId?: string;
    genreManuallyLocked?: boolean;
    title?: string;
  } = {},
): AutoDetectionResult {
  const trimmed = idea.trim();
  const isShortIdea = trimmed.length < LONG_IDEA_THRESHOLD;

  if (trimmed.length < 6) {
    return { shouldPropose: false, proposal: null, isShortIdea };
  }

  const proposal = buildDominantAutoDetectionProposal(trimmed, {
    title: opts.title,
    existingGenre: opts.existingGenre,
    existingSubgenre: opts.existingSubgenre,
    existingBookTypeId: opts.existingBookTypeId,
    genreManuallyLocked: opts.genreManuallyLocked,
  });

  if (!proposal) {
    return { shouldPropose: false, proposal: null, isShortIdea };
  }

  return { shouldPropose: true, proposal, isShortIdea };
}

export function mergeProposalWithExisting<T extends Record<string, string | undefined>>(
  existing: T,
  proposal: AutoDetectionProposal,
  fields: (keyof T)[],
): T {
  const next = { ...existing };
  const map: Record<string, string> = {
    genre: proposal.genre,
    subgenre: proposal.subgenre,
    tone: proposal.tone,
    targetReader: proposal.targetReader,
    bookTypeId: proposal.bookTypeId,
    category: proposal.category,
    subcategory: proposal.subcategory,
  };
  for (const field of fields) {
    const current = String(existing[field] || "").trim();
    const incoming = String(map[String(field)] || "").trim();
    if (!current && incoming) {
      next[field] = incoming as T[keyof T];
    }
  }
  return next;
}
