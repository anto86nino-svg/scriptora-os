/**
 * Book Forge wizard — genre/format lock pipeline.
 * Every genre change passes concept dominance → format dominance → inferGenreFromText (format-locked).
 */

import { applyFormatDominance, resolveDominantFormat } from "@/lib/book-format-dominance";
import {
  analyzeConceptFromIdea,
  hasLiteraryRomanceSignals,
  resolveConceptDominance,
  type LiteraryRomanceGenreContext,
} from "@/lib/concept-dominance";
import { inferGenreFromText, type GenreInference } from "@/lib/book-creation-os/genre-inference";
import { studioGenresFromRegistry } from "@/lib/book-type-engine";
import type { Genre } from "@/types/book";
import type { AutoDetectionProposal } from "./auto-detection-engine";

export type WizardGenreContext = {
  title?: string;
  idea?: string;
  genre?: string;
  subgenre?: string;
  bookTypeId?: string;
  category?: string;
  subcategory?: string;
  bookFormat?: string;
  genreManuallyLocked?: boolean;
};

const STUDIO = studioGenresFromRegistry();

function studioEntryForGenre(genre: string, bookTypeId?: string) {
  if (bookTypeId) {
    const byId = STUDIO.find((g) => g.id === bookTypeId);
    if (byId) return byId;
  }
  const normalized = genre.toLowerCase();
  return STUDIO.find((g) => g.id === normalized || g.genre === normalized);
}

export function resolveWizardBookFormat(ctx: WizardGenreContext): string | undefined {
  const concept = analyzeConceptFromIdea(ctx.idea || "", {
    genre: ctx.genre,
    tags: ctx.subgenre,
  });
  if (concept.bookFormat) return concept.bookFormat;

  const resolved = resolveDominantFormat({
    bookFormat: ctx.bookFormat,
    bookTypeId: ctx.bookTypeId,
    genre: ctx.genre,
    subgenre: ctx.subgenre,
    subcategory: ctx.subcategory,
    category: ctx.category,
  });
  return resolved.dominantFormat || undefined;
}

export function buildWizardDetectedLabel(
  inference: GenreInference,
  idea: string,
  ctx: Pick<WizardGenreContext, "genre" | "subgenre" | "subcategory" | "bookTypeId"> = {},
): string {
  const romanceContext: LiteraryRomanceGenreContext = {
    genre: ctx.genre,
    subgenre: ctx.subgenre,
    subcategory: ctx.subcategory,
    bookTypeId: ctx.bookTypeId,
  };
  if (hasLiteraryRomanceSignals(idea, romanceContext)) {
    return "Literary Romance";
  }
  return inference.label;
}

function mergeConceptGenreIntoInference(
  base: GenreInference,
  conceptGenre: string,
  title: string,
  idea: string,
  bookFormat?: string,
): GenreInference {
  const entry = studioEntryForGenre(conceptGenre, base.bookTypeId);
  const locked = inferGenreFromText(title, idea, bookFormat || base.bookFormat);
  if (!entry) {
    return { ...locked, genre: conceptGenre as Genre, label: locked.label };
  }
  return {
    ...locked,
    bookTypeId: entry.id,
    genre: entry.genre,
    category: entry.category,
    subcategory: entry.defaultSubcategory,
    subgenre: locked.subgenre || entry.defaultSubcategory,
    level1: locked.level1,
    label: locked.label,
  };
}

export function resolveWizardGenreInference(
  title: string,
  idea: string,
  ctx: WizardGenreContext = {},
): GenreInference {
  const concept = analyzeConceptFromIdea(idea, { genre: ctx.genre, tags: ctx.subgenre });
  const dominance = resolveConceptDominance(idea, { genre: ctx.genre, tags: ctx.subgenre });
  const lockedFormat = ctx.genreManuallyLocked
    ? resolveWizardBookFormat({ ...ctx, title, idea })
    : concept.bookFormat || resolveWizardBookFormat({ ...ctx, title, idea });

  let inference = inferGenreFromText(title, idea, lockedFormat);

  if (!ctx.genreManuallyLocked && dominance.genre && dominance.genre !== inference.genre) {
    inference = mergeConceptGenreIntoInference(inference, dominance.genre, title, idea, lockedFormat);
  } else if (!ctx.genreManuallyLocked && concept.genre && concept.genre !== inference.genre) {
    inference = mergeConceptGenreIntoInference(inference, concept.genre, title, idea, lockedFormat);
  }

  if (ctx.genreManuallyLocked && ctx.genre) {
    const entry = studioEntryForGenre(ctx.genre, ctx.bookTypeId);
    if (entry) {
      inference = {
        ...inference,
        bookTypeId: entry.id,
        genre: entry.genre,
        category: ctx.category || entry.category,
        subcategory: ctx.subcategory || entry.defaultSubcategory,
      };
    }
  }

  const dominated = applyFormatDominance({
    bookFormat: lockedFormat || inference.bookFormat,
    bookTypeId: inference.bookTypeId,
    genre: inference.genre,
    subgenre: inference.subgenre || ctx.subgenre,
    subcategory: inference.subcategory,
    category: inference.category,
  });

  return {
    ...inference,
    bookFormat: (dominated.bookFormat || inference.bookFormat) as GenreInference["bookFormat"],
    bookTypeId: String(dominated.bookTypeId || inference.bookTypeId),
    genre: (dominated.genre || inference.genre) as Genre,
    label: buildWizardDetectedLabel(inference, idea, ctx),
  };
}

export function applyDominanceToWizardPatch<T extends Record<string, unknown>>(
  patch: T,
  ctx: WizardGenreContext,
): T {
  const dominated = applyFormatDominance({
    bookFormat: String(patch.bookFormat || ctx.bookFormat || ""),
    bookTypeId: String(patch.bookTypeId || ctx.bookTypeId || ""),
    genre: String(patch.genre || ctx.genre || ""),
    subgenre: String(patch.subgenre || ctx.subgenre || ""),
    subcategory: String(patch.subcategory || ctx.subcategory || ""),
    category: String(patch.category || ctx.category || ""),
  });
  return {
    ...patch,
    ...(dominated.bookFormat ? { bookFormat: dominated.bookFormat } : {}),
    ...(dominated.bookTypeId ? { bookTypeId: dominated.bookTypeId } : {}),
    ...(dominated.genre ? { genre: dominated.genre } : {}),
  };
}

export function buildDominantAutoDetectionProposal(
  idea: string,
  opts: {
    title?: string;
    existingGenre?: string;
    existingSubgenre?: string;
    existingBookTypeId?: string;
    genreManuallyLocked?: boolean;
  } = {},
): AutoDetectionProposal | null {
  const title = opts.title || "";
  const inference = resolveWizardGenreInference(title, idea, {
    title,
    idea,
    genre: opts.existingGenre,
    subgenre: opts.existingSubgenre,
    bookTypeId: opts.existingBookTypeId,
    genreManuallyLocked: opts.genreManuallyLocked,
  });

  const confidence: AutoDetectionProposal["confidence"] =
    idea.trim().length >= 160 && inference.confidence === "high"
      ? "high"
      : idea.trim().length >= 80 && inference.confidence !== "low"
        ? "medium"
        : "low";

  if (!inference.genre) return null;

  const concept = analyzeConceptFromIdea(idea, { genre: opts.existingGenre, tags: opts.existingSubgenre });
  const detectedLabel = buildWizardDetectedLabel(inference, idea, {
    genre: opts.existingGenre,
    subgenre: opts.existingSubgenre,
    bookTypeId: opts.existingBookTypeId,
  });

  const words = idea.trim().split(/\s+/).filter(Boolean).length;
  const confidenceLabel =
    confidence === "high" ? "alta" : confidence === "medium" ? "media" : "bassa";

  return {
    genre: inference.genre,
    bookFormat: inference.bookFormat,
    subgenre: opts.existingSubgenre?.trim() || inference.subgenre,
    tone: inference.tone,
    targetReader: inference.targetReader,
    protagonist: concept.protagonist,
    setting: concept.setting,
    bookTypeId: inference.bookTypeId,
    category: inference.category,
    subcategory: inference.subcategory,
    confidence,
    detectedLabel,
    rationale: `Ho rilevato: ${detectedLabel}. Da ${words} parole di idea — confidenza ${confidenceLabel}.`,
  };
}

export function wizardInferenceForAutofill(
  config: {
    title?: string;
    idea?: string;
    genre?: string;
    subgenre?: string;
    bookTypeId?: string;
    category?: string;
    subcategory?: string;
    bookFormat?: string;
  },
  genreManuallyLocked = false,
): GenreInference {
  return resolveWizardGenreInference(config.title || "", config.idea || "", {
    title: config.title,
    idea: config.idea,
    genre: config.genre,
    subgenre: config.subgenre,
    bookTypeId: config.bookTypeId,
    category: config.category,
    subcategory: config.subcategory,
    bookFormat: config.bookFormat,
    genreManuallyLocked,
  });
}

/** Forbidden genre stacks for regression checks on wizard path. */
export function assertWizardGenreIntegrity(
  idea: string,
  proposal: Pick<AutoDetectionProposal, "genre" | "bookFormat" | "detectedLabel" | "bookTypeId">,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const hay = `${idea} ${proposal.genre} ${proposal.bookFormat} ${proposal.detectedLabel}`.toLowerCase();

  if (/ricett|cucina|mediterranea/.test(idea.toLowerCase())) {
    if (proposal.bookFormat !== "cookbook" && proposal.genre !== "cookbook") {
      errors.push("Cookbook idea must stay cookbook format.");
    }
    if (/philosophy|literary fiction|fantasy|romance/.test(hay) && proposal.bookFormat === "cookbook") {
      /* ok — hay includes idea words */
    } else if (/philosophy|literary fiction/.test(`${proposal.genre} ${proposal.detectedLabel}`)) {
      errors.push("Cookbook must not drift to literary fiction.");
    }
  }

  if (/03:17|stazione ferroviaria/.test(idea.toLowerCase())) {
    if (proposal.genre === "romance" || /romance template/i.test(proposal.detectedLabel)) {
      errors.push("Horror station idea must not become romance.");
    }
    if (proposal.genre !== "horror" && proposal.genre !== "thriller") {
      errors.push("03:17 horror idea should resolve horror or thriller.");
    }
  }

  if (/elias|porta nel cuore|mille anni|fine del mondo/.test(idea.toLowerCase())) {
    if (proposal.genre === "sci-fi" && !/ghiaccio|città sommersa|cartograf/i.test(idea.toLowerCase())) {
      errors.push("Elias fantasy must not become sci-fi without ice-city signals.");
    }
    if (/philosophy|romance/.test(`${proposal.detectedLabel}`) && !/literary romance/i.test(proposal.detectedLabel)) {
      if (proposal.genre === "philosophy") {
        errors.push("Elias fantasy must not fall back to philosophy.");
      }
    }
  }

  if (/marta|03:17|visioni dal futuro|thriller soprannatural/i.test(idea.toLowerCase())) {
    if (proposal.genre === "fantasy") {
      errors.push("Marta 03:17 must be thriller, not fantasy.");
    }
  }

  if (/amore maturo|spostati|romanzo contemporaneo emozional/i.test(idea.toLowerCase())) {
    if (proposal.genre === "fantasy" || /fantasy/i.test(proposal.detectedLabel)) {
      errors.push("Literary romance must not become fantasy.");
    }
    if (proposal.genre === "philosophy" && !/literary romance/i.test(proposal.detectedLabel)) {
      errors.push("Literary romance should show Literary Romance label.");
    }
  }

  return { ok: errors.length === 0, errors };
}
