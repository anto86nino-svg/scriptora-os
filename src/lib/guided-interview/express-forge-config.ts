import type { GuidedInterviewState } from "./types";
import { createEmptyForgeMemory, getCriticalMissingSlots } from "./interview-memory";
import type { ExpressForgeInput, ExpressForgeResult, ForgeFieldProvenance } from "./express-forge-types";
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

export function buildExpressForgeConfiguration(
  input: ExpressForgeInput,
  baseState?: GuidedInterviewState,
): ExpressForgeResult {
  const inferredBookFormat =
    input.bookFormat ??
    (/\b(poesia|poesia\s+gotica|raccolta\s+poetica|silloge|liriche|versi)\b/i.test(`${input.genre} ${input.ideaSeed}`)
      ? "poetry_collection"
      : "novel");

  const normalizedInput: ExpressForgeInput = {
    ...input,
    bookFormat: inferredBookFormat,
    ideaSeed: input.ideaSeed || input.protagonistSeed || "",
    language: input.language || "Italiano",
    genre: input.genre || (inferredBookFormat === "poetry_collection" ? "poesia" : "dark romance"),
    tone: input.tone || (inferredBookFormat === "poetry_collection" ? "poetico" : "oscuro"),
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
