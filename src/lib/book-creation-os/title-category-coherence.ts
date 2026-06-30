import type { Genre } from "@/types/book";
import { resolveLevel1FromBookTypeId } from "@/lib/book-config-engine";
import type { Level1BookType } from "@/lib/book-config-engine/types";
import { resolveBookTypeById } from "@/lib/book-type-engine/taxonomy";
import { inferGenreFromText, type GenreInference } from "./genre-inference";

export type TitleCategoryCoherenceLevel = "high" | "medium" | "low";

export type TitleCategoryCoherenceInput = {
  title?: string;
  subtitle?: string;
  idea?: string;
  genre: Genre;
  category: string;
  subcategory: string;
  subgenre?: string;
  bookTypeId?: string;
};

export type TitleCategoryCoherenceResult = {
  level: TitleCategoryCoherenceLevel;
  score: number;
};

const NONFICTION_TITLE_SIGNALS =
  /manuale|guida\s+(?:alla|al|pratica|completa|definitiva)|ricett|friggitrice|air\s*fryer|cookbook|workbook|handbook|marketing|leadership|produttivit|mindset|business|definitiv[oa]/i;

const FICTION_SUBGENRE_SIGNALS =
  /romance|romantico|emozional|amore|thriller|horror|fantasy|fantasi|mistero|narrativ|contemporane|women|donne|letterari|literary/i;

const NARRATIVE_LEVEL1: Level1BookType = "romanzo";

const PRACTICAL_LEVEL1 = new Set<Level1BookType>([
  "manuale",
  "educazione",
  "business",
  "marketing",
  "self-help",
]);

function selectedLevel1(input: TitleCategoryCoherenceInput): Level1BookType {
  if (input.bookTypeId) return resolveLevel1FromBookTypeId(input.bookTypeId);
  const hay = `${input.genre} ${input.category} ${input.subcategory} ${input.subgenre || ""}`.toLowerCase();
  if (/cookbook|ricett|recipe/i.test(hay)) return "manuale";
  if (/manual|guida|workbook/i.test(hay)) return "manuale";
  if (/self.?help|mindset/i.test(hay)) return "self-help";
  if (/business|marketing|leadership/i.test(hay)) return "business";
  if (/education|didatt|studio/i.test(hay)) return "educazione";
  if (/poetry|poesia/i.test(hay)) return "poesia";
  if (/fiction|romance|thriller|fantasy|horror|literary/i.test(hay)) return "romanzo";
  return resolveLevel1FromBookTypeId(undefined);
}

function isNarrativeSelection(input: TitleCategoryCoherenceInput): boolean {
  if (input.bookTypeId) {
    const def = resolveBookTypeById(input.bookTypeId);
    if (def?.family === "narrative") return true;
  }
  return selectedLevel1(input) === NARRATIVE_LEVEL1;
}

function isPracticalSelection(input: TitleCategoryCoherenceInput): boolean {
  return PRACTICAL_LEVEL1.has(selectedLevel1(input));
}

function titleHasNonfictionSignals(title: string): boolean {
  return NONFICTION_TITLE_SIGNALS.test(title.trim());
}

function looksMetaphoricalFictionTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return false;
  if (titleHasNonfictionSignals(trimmed)) return false;
  return !/guida|manuale|ricett|marketing|leadership|workbook|handbook/i.test(trimmed);
}

function inferenceMatchesSelection(inference: GenreInference, input: TitleCategoryCoherenceInput): boolean {
  if (input.bookTypeId && inference.bookTypeId === input.bookTypeId) return true;
  if (inference.genre === input.genre) return true;
  const inferenceLevel1 = inference.level1;
  const selectionLevel1 = selectedLevel1(input);
  if (inferenceLevel1 === selectionLevel1) return true;
  if (inferenceLevel1 === NARRATIVE_LEVEL1 && selectionLevel1 === NARRATIVE_LEVEL1) return true;
  return false;
}

function ideaSupportsNarrativeSelection(input: TitleCategoryCoherenceInput): boolean {
  const anchor = `${input.idea || ""} ${input.subgenre || ""} ${input.subcategory || ""}`.trim();
  if (!anchor) return false;
  if (!isNarrativeSelection(input)) return false;

  const ideaInference = inferGenreFromText("", anchor);
  if (ideaInference.level1 === NARRATIVE_LEVEL1) return true;
  if (FICTION_SUBGENRE_SIGNALS.test(anchor)) return true;
  return inferenceMatchesSelection(ideaInference, input);
}

export function computeTitleCategoryCoherence(
  input: TitleCategoryCoherenceInput,
): TitleCategoryCoherenceResult {
  const title = String(input.title || "").trim();
  const subtitle = String(input.subtitle || "").trim();
  const idea = String(input.idea || "").trim();
  const semanticAnchor = `${idea} ${input.subgenre || ""} ${input.subcategory || ""} ${subtitle}`.trim();

  const titleNonfiction = titleHasNonfictionSignals(title);
  const metaphoricalTitle = looksMetaphoricalFictionTitle(title);
  const narrativeSelected = isNarrativeSelection(input);
  const practicalSelected = isPracticalSelection(input);

  if (titleNonfiction && narrativeSelected) {
    return { level: "low", score: 18 };
  }

  if (metaphoricalTitle && practicalSelected && !ideaSupportsNarrativeSelection(input)) {
    return { level: "low", score: 22 };
  }

  if (semanticAnchor) {
    const ideaInference = inferGenreFromText("", semanticAnchor);
    if (inferenceMatchesSelection(ideaInference, input)) {
      return { level: "high", score: 92 };
    }
    if (narrativeSelected && ideaInference.level1 === NARRATIVE_LEVEL1) {
      return { level: "high", score: 86 };
    }
    if (FICTION_SUBGENRE_SIGNALS.test(semanticAnchor) && narrativeSelected) {
      return { level: "high", score: 84 };
    }
    if (practicalSelected && ideaInference.level1 !== NARRATIVE_LEVEL1 && ideaInference.confidence !== "low") {
      if (inferenceMatchesSelection(ideaInference, input)) {
        return { level: "high", score: 88 };
      }
    }
    if (
      practicalSelected
      && ideaInference.level1 === NARRATIVE_LEVEL1
      && ideaInference.confidence === "high"
      && !titleNonfiction
    ) {
      return { level: "medium", score: 52 };
    }
  }

  if (title) {
    const titleInference = inferGenreFromText(title, semanticAnchor || idea);
    if (inferenceMatchesSelection(titleInference, input)) {
      return { level: "high", score: 90 };
    }

    if (metaphoricalTitle && narrativeSelected) {
      return { level: "high", score: 82 };
    }

    if (
      titleInference.confidence === "high"
      && !inferenceMatchesSelection(titleInference, input)
      && !semanticAnchor
    ) {
      return { level: "medium", score: 50 };
    }

    if (
      titleInference.confidence === "high"
      && !inferenceMatchesSelection(titleInference, input)
      && semanticAnchor
      && narrativeSelected
      && titleInference.level1 === NARRATIVE_LEVEL1
    ) {
      return { level: "high", score: 80 };
    }

    if (titleNonfiction || titleInference.confidence === "high") {
      if (!inferenceMatchesSelection(titleInference, input)) {
        return { level: "low", score: 28 };
      }
    }
  }

  if (narrativeSelected && (metaphoricalTitle || !title)) {
    return { level: "high", score: 78 };
  }

  return { level: "high", score: 76 };
}

export function isConfigIncoherentWithInference(
  inference: GenreInference,
  category: string,
  genre: Genre,
  subcategory: string,
  context?: Partial<TitleCategoryCoherenceInput>,
): boolean {
  if (context && (context.title !== undefined || context.idea !== undefined || context.bookTypeId !== undefined)) {
    return computeTitleCategoryCoherence({
      title: context.title,
      subtitle: context.subtitle,
      idea: context.idea,
      genre,
      category,
      subcategory,
      subgenre: context.subgenre,
      bookTypeId: context.bookTypeId ?? inference.bookTypeId,
    }).level === "low";
  }

  const hay = `${category} ${subcategory} ${genre}`.toLowerCase();
  const fictionInference = inference.level1 === "romanzo";
  const nonfictionHay = /self.?help|mindset|non.?fiction|business|productiv|wellness/i.test(hay);
  const fictionHay =
    /fiction|horror|thriller|romance|fantasy|literary/i.test(hay)
    || ["horror", "thriller", "romance", "fantasy", "dark-romance", "philosophy", "sci-fi", "historical"].includes(genre);

  if (fictionInference && nonfictionHay && /mindset|self.?help|productiv/i.test(hay)) return true;
  if (!fictionInference && fictionHay && inference.level1 === "self-help") return true;
  if (inference.bookTypeId === "horror" && /mindset|self.?help|wellness/i.test(hay)) return true;
  if (inference.bookTypeId === "self-help" && /horror|thriller|dark romance|gothic/i.test(hay)) return true;

  if (inference.level1 === "romanzo" && fictionHay) return false;
  if (inference.genre === genre) return false;

  return inference.genre !== genre && inference.confidence === "high";
}
