import type { GuidedInterviewState } from "./types";
import { createEmptyForgeMemory, getCriticalMissingSlots } from "./interview-memory";
import type { ExpressForgeInput, ExpressBookFormat, ExpressForgeResult, ForgeFieldProvenance } from "./express-forge-types";
import { resolveConceptDominance } from "@/lib/concept-dominance";
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
  if (/\b(poesia|poesia\s+gotica|raccolta\s+poetica|silloge|liriche|versi)\b/i.test(bag)) return "poetry_collection";
  if (/\b(memoir|memorie|autobiograf|viaggio interiore)\b/i.test(bag)) return "memoir";
  if (/\b(workbook|quaderno operativo|schede operativ)\b/i.test(bag)) return "workbook";
  if (/\b(study_material|materiale di studio|materiale studio)\b/i.test(bag)) return "study_material";
  if (/\b(self.?help|crescita personale)\b/i.test(bag)) return "self_help";
  return "novel";
}

function inferDefaultExpressGenre(
  bookFormat: ExpressBookFormat,
  ideaSeed: string,
  genre?: string,
): string {
  if (genre?.trim()) return genre.trim();
  const concept = resolveConceptDominance(ideaSeed, { genre });
  if (concept.genre) return concept.genre;
  if (bookFormat === "poetry_collection") return "poesia";
  if (bookFormat === "memoir") return "memoir";
  if (bookFormat === "workbook") return "workbook";
  if (bookFormat === "study_material") return "study_material";
  if (bookFormat === "self_help") return "self-help";
  if (bookFormat === "essay") return "saggio";
  const bag = ideaSeed.toLowerCase();
  if (/fantasy|magia|porta|ricordi|fine del mondo|destino|mille anni|high concept/.test(bag)) return "fantasy";
  if (/horror|gotico|paura/.test(bag)) return "horror";
  if (/thriller|giallo|crime|mystery/.test(bag)) return "thriller";
  if (/fantasy|magia/.test(bag)) return "fantasy";
  if (/sci\s*fi|science fiction|fantascienza|cyberpunk/.test(bag)) return "sci-fi";
  if (/friends to lovers|amici ad amanti/.test(bag)) return "friends to lovers";
  if (/enemies to lovers|nemici che si innamorano/.test(bag)) return "enemies to lovers";
  if (/dark romance|romance oscur/.test(bag)) return "dark romance";
  if (/romance|amore/.test(bag)) return "romance";
  if (/self.?help|crescita personale/.test(bag)) return "self-help";
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
  const inferredBookFormat = inferExpressBookFormat(input);
  const normalizedGenre = inferDefaultExpressGenre(inferredBookFormat, input.ideaSeed || input.protagonistSeed || "", input.genre);

  const normalizedInput: ExpressForgeInput = {
    ...input,
    bookFormat: inferredBookFormat,
    ideaSeed: input.ideaSeed || input.protagonistSeed || "",
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
