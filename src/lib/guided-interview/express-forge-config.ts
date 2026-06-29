import type { GuidedInterviewState } from "./types";
import { createEmptyForgeMemory, getCriticalMissingSlots } from "./interview-memory";
import type { ExpressForgeInput, ExpressBookFormat, ExpressForgeResult, ForgeFieldProvenance } from "./express-forge-types";
import { resolveConceptDominance, sanitizeUserConceptInput, inferNarrativeGenreFromIdea, isSparseConceptInput, shouldUseEntityDrivenScaffold } from "@/lib/concept-dominance";
import {
  buildExpressBookScenarios,
  type ExpressBookScenario,
} from "./express-book-package";

function prov(
  value: string,
  source: ForgeFieldProvenance["source"],
  confidence: number,
): ForgeFieldProvenance {
  return { value, source, confidence };
}

function inferExpressBookFormat(input: ExpressForgeInput): ExpressBookFormat {
  if (input.bookFormat) return input.bookFormat;
  const bag = `${input.genre} ${input.ideaSeed}`;
  const sanitized = sanitizeUserConceptInput(input.ideaSeed || "");
  if (isSparseConceptInput(sanitized) || /\b(libro\s+sul|libro\s+sulla|libro\s+su)\b/i.test(sanitized)) {
    return "poetry_collection";
  }
  if (/\b(poesia|poesia\s+gotica|raccolta\s+poetica|silloge|liriche|versi)\b/i.test(bag)) return "poetry_collection";
  if (/\b(memoir|memorie|autobiograf|viaggio interiore)\b/i.test(bag)) return "memoir";
  if (/\b(workbook|quaderno operativo|schede operativ)\b/i.test(bag)) return "workbook";
  if (/\b(study_material|materiale di studio|materiale studio)\b/i.test(bag)) return "study_material";
  if (/\b(cookbook|ricettario|ricette|cucina)\b/i.test(bag)) return "cookbook";
  if (/\b(manuale pratico|fotografia digitale|esposizione|diaframma)\b/i.test(bag)) return "self_help";
  return "novel";
}

function inferDefaultExpressGenre(
  bookFormat: ExpressBookFormat,
  ideaSeed: string,
  genre?: string,
): string {
  const sanitized = sanitizeUserConceptInput(ideaSeed);
  const concept = resolveConceptDominance(sanitized, { genre });
  if (concept.genre) return concept.genre;
  const inferred = inferNarrativeGenreFromIdea(sanitized);
  if (inferred) return inferred;
  if (genre?.trim()) return genre.trim();
  if (isSparseConceptInput(sanitized)) return "poesia";
  if (bookFormat === "poetry_collection") return "poesia";
  if (bookFormat === "memoir") return "memoir";
  if (bookFormat === "workbook") return "workbook";
  if (bookFormat === "study_material") return "study_material";
  if (bookFormat === "self_help") return "self-help";
  if (bookFormat === "essay") return "saggio";
  const bag = sanitized.toLowerCase();
  if (/fantasy|magia|porta nel cuore|mille anni|memoria ancestrale|fine del mondo|high concept/.test(bag) && !shouldUseEntityDrivenScaffold(sanitized)) return "fantasy";
  if (/horror|gotico|paura/.test(bag)) return "horror";
  if (/thriller|giallo|crime|mystery|soprannatural/.test(bag)) return "thriller";
  if (/citt[aà]\s+sommersa|disgelo|ghiaccio|nascost\w*\s+sotto|prigione\s+(di\s+)?ghiaccio|tecnolog\w*\s+impossibil|entit[aà]\s+antica|trecento\s+anni|sette\s+giorni/.test(bag)) return "sci-fi";
  if (/sci\s*fi|science fiction|fantascienza|cyberpunk/.test(bag)) return "sci-fi";
  if (/friends to lovers|amici ad amanti/.test(bag)) return "friends to lovers";
  if (/enemies to lovers|nemici che si innamorano/.test(bag)) return "enemies to lovers";
  if (/dark romance|romance oscur/.test(bag)) return "dark romance";
  if (/romance|amore/.test(bag)) return "romance";
  if (/business|ristorant|chiosco|fatturato|imprend/.test(bag)) return "business";
  if (/manuale|manual|fotograf|esposizione|diaframma/.test(bag)) return "manual";
  if (/memoir|autobiograf/.test(bag)) return "memoir";
  if (/workbook|quaderno/.test(bag)) return "workbook";
  if (/poesia|poetry/.test(bag)) return "poesia";
  return bookFormat === "novel" ? "narrativa" : bookFormat;
}

function inferDefaultExpressTone(bookFormat: ExpressBookFormat, genre: string): string {
  if (bookFormat === "poetry_collection" || /poesia|poetry/i.test(genre)) return "poetico";
  if (bookFormat === "memoir" || /memoir/i.test(genre)) return "riflessivo";
  if (bookFormat === "workbook" || /workbook/i.test(genre)) return "pratico";
  if (bookFormat === "study_material" || /study_material|materiale di studio/i.test(genre)) return "didattico";
  if (bookFormat === "self_help" || /self-help/i.test(genre)) return "pratico";
  if (/horror|thriller|dark romance/i.test(genre)) return "oscuro";
  return "emozionale";
}

export function buildExpressForgeConfiguration(
  input: ExpressForgeInput,
  baseState?: GuidedInterviewState,
): ExpressForgeResult {
  const sanitizedIdea = sanitizeUserConceptInput(input.ideaSeed || input.protagonistSeed || "");
  const inferredBookFormat = inferExpressBookFormat({ ...input, ideaSeed: sanitizedIdea });
  const normalizedGenre = inferDefaultExpressGenre(inferredBookFormat, sanitizedIdea, input.genre);

  const normalizedInput: ExpressForgeInput = {
    ...input,
    bookFormat: inferredBookFormat,
    ideaSeed: sanitizedIdea,
    language: input.language || "Italiano",
    genre: normalizedGenre,
    tone: input.tone || inferDefaultExpressTone(inferredBookFormat, normalizedGenre),
    length: input.length || "medio",
    controlLevel: input.controlLevel || "scenarios",
    titleMode: input.titleMode || "suggest",
  };

  const packages = buildExpressBookScenarios(normalizedInput);
  const memory = createEmptyForgeMemory();
  const provenance: Record<string, ForgeFieldProvenance> = {};

  provenance.bookFormat = prov(normalizedInput.bookFormat, "user", 0.95);
  provenance.genre = prov(normalizedInput.genre, "user", 0.95);
  provenance.language = prov(normalizedInput.language, "user", 0.95);
  provenance.rawIdea = prov(normalizedInput.ideaSeed, "user", 0.95);
  provenance.tone = prov(normalizedInput.tone, "user", 0.9);

  const autoFilledFields = packages[0]
    ? [
        "title",
        "subtitle",
        "hook",
        "editorialSynopsis",
        "protagonist",
        "antagonist",
        "setting",
        "centralConflict",
        "stakes",
        "chapterCount",
        "characters",
        "storyRoom",
        "canon",
      ]
    : [];

  const state: GuidedInterviewState = {
    ...(baseState ?? {
      completed: false,
      currentStep: 0,
      confidence: 0.82,
      messages: [],
      extracted: {},
      chatFirst: true,
    }),
    extracted: {
      ...(baseState?.extracted ?? {}),
      genre: normalizedInput.genre,
      language: normalizedInput.language,
      tone: normalizedInput.tone,
      bookType:
        normalizedInput.bookFormat === "poetry_collection"
          ? "poetry_collection"
          : normalizedInput.bookFormat,
      bookFormat: normalizedInput.bookFormat,
      bookTitle: normalizedInput.title,
      bookSubtitle: normalizedInput.subtitle,
      rawIdea: normalizedInput.ideaSeed,
    },
    forgeMode: "express",
    expressConfig: normalizedInput,
    forgeMemory: memory,
    slotProvenance: provenance,
    selectedGenre: normalizedInput.genre,
    selectedBookType:
      normalizedInput.bookFormat === "poetry_collection"
        ? "poetry_collection"
        : normalizedInput.bookFormat,
    selectedTone: normalizedInput.tone,
    selectedLength: normalizedInput.length,
    blueprintScenarios: packages,
    messages: [
      ...(baseState?.messages ?? []),
      {
        id: `express-user-${Date.now()}`,
        role: "user",
        content: `Studio Express: ${normalizedInput.genre} — ${normalizedInput.ideaSeed}`,
        createdAt: Date.now(),
      },
      {
        id: `express-assistant-${Date.now()}`,
        role: "assistant",
        content:
          normalizedInput.controlLevel === "auto"
            ? "Scriptora ha preparato 3 libri possibili. Scegli quello più vicino al tuo cuore narrativo."
            : "Ecco 3 concept completi. Scegli, correggi o rendi più oscuro/commerciale.",
        createdAt: Date.now() + 1,
      },
    ],
  };

  return {
    state,
    memory,
    candidateBlueprintScenarios: packages,
    packages,
    missingCriticalFields: getCriticalMissingSlots(memory).map(String),
    autoFilledFields,
    provenance,
  };
}

export type { ExpressBookScenario };
