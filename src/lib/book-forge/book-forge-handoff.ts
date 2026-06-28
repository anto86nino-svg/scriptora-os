import type { BookBlueprint, BookCharacter, BookConfig, Genre, Language } from "@/types/book";
import { resolveUniversalBookStudio, type UniversalBookStudioId } from "@/lib/book-intelligence/universal-book-studios";

export type BookForgeSource =
  | "title-domination"
  | "kdp-launch"
  | "bestseller-radar"
  | "keyword-gold"
  | "market-os"
  | "dashboard-cta"
  | "preset-forge"
  | "one-flow"
  | "guided-interview"
  | "auto-bestseller"
  | "book-idea-tools"
  | "character-studio";

export type BookForgeSlot =
  | "title"
  | "subtitle"
  | "authorName"
  | "language"
  | "marketplace"
  | "bookType"
  | "category"
  | "subcategory"
  | "genre"
  | "subgenre"
  | "niche"
  | "targetReader"
  | "promise"
  | "tone"
  | "style"
  | "chapterCount"
  | "bookLength"
  | "structureMode"
  | "characters"
  | "plot"
  | "conflict"
  | "transformation"
  | "keywords"
  | "comparableBooks"
  | "commercialAngle"
  | "blueprint"
  | "authorIdentity";

export type BookForgeStartStep =
  | "book-foundation"
  | "character-forge"
  | "plot-forge"
  | "structure-forge"
  | "poetry-forge"
  | "manual-forge"
  | "blueprint-generation"
  | "blueprint-approval"
  | "writer";

export type BookForgePrefill = Partial<BookConfig> & {
  studioId?: UniversalBookStudioId | string;
  studioName?: string;
  studioGenerator?: string;
  studioBlueprint?: string;
  studioQualityGate?: string;
  studioExportProfile?: string;
  marketplace?: string;
  bookType?: string;
  niche?: string;
  promise?: string;
  style?: string;
  chapterCount?: number;
  structureMode?: string;
  plot?: string;
  conflict?: string;
  transformation?: string;
  keywords?: string[];
  comparableBooks?: string[];
  commercialAngle?: string;
  blueprint?: BookBlueprint | null;
  blueprintApproved?: boolean;
  approvedSlots?: BookForgeSlot[];
  canonicalSource?: BookForgeSource;
};

export interface BookForgeHandoff {
  id: string;
  source: BookForgeSource;
  prefill: BookForgePrefill;
  completedSlots: BookForgeSlot[];
  missingSlots: BookForgeSlot[];
  recommendedStartStep: BookForgeStartStep;
  lockReason: string;
  createdAt: string;
}

const SUPPORTED_SLOTS: BookForgeSlot[] = [
  "title",
  "subtitle",
  "authorName",
  "language",
  "marketplace",
  "bookType",
  "category",
  "subcategory",
  "genre",
  "subgenre",
  "niche",
  "targetReader",
  "promise",
  "tone",
  "style",
  "chapterCount",
  "bookLength",
  "structureMode",
  "characters",
  "plot",
  "conflict",
  "transformation",
  "keywords",
  "comparableBooks",
  "commercialAngle",
  "blueprint",
  "authorIdentity",
];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasText(value: unknown, min = 2): boolean {
  return text(value).length >= min;
}

function hasArray(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => hasText(item) || (item && typeof item === "object"));
}

function hasCharacters(value: unknown): boolean {
  return Array.isArray(value) && value.some((character) => hasText((character as BookCharacter)?.name));
}

function normalizeGenre(value: unknown): string {
  return text(value).toLowerCase().replace(/[_\s]+/g, "-");
}

function resolveStudioIdForHandoff(prefill: BookForgePrefill): UniversalBookStudioId {
  if (prefill.studioId) return prefill.studioId as UniversalBookStudioId;
  return resolveUniversalBookStudio({
    config: prefill,
    idea: text(prefill.idea || prefill.promise || prefill.commercialAngle || prefill.subtitle),
    explicitBookFormat: prefill.bookFormat || prefill.bookTypeId || prefill.bookType,
  }).studio.id;
}

export function isPoetryHandoff(prefill: BookForgePrefill): boolean {
  if (resolveStudioIdForHandoff(prefill) === "poetry") return true;
  const blob = [
    prefill.bookTypeId,
    prefill.bookType,
    prefill.genre,
    prefill.category,
    prefill.subcategory,
    prefill.subgenre,
    prefill.niche,
  ].map(normalizeGenre).join(" ");
  return /\bpoetry|poesia|poet|songbook|lyrics\b/.test(blob);
}

export function isManualHandoff(prefill: BookForgePrefill): boolean {
  const studioId = resolveStudioIdForHandoff(prefill);
  if (studioId === "professional_guide" || studioId === "transformation" || studioId === "memoir") return true;
  const blob = [
    prefill.bookTypeId,
    prefill.bookType,
    prefill.genre,
    prefill.category,
    prefill.subcategory,
    prefill.subgenre,
    prefill.niche,
  ].map(normalizeGenre).join(" ");
  return /\bmanual|manuale|handbook|technical|guide|software-guide|ai-tools-guide\b/.test(blob);
}

export function isFictionHandoff(prefill: BookForgePrefill): boolean {
  if (resolveStudioIdForHandoff(prefill) === "narrative") return true;
  if (isPoetryHandoff(prefill) || isManualHandoff(prefill)) return false;
  const blob = [
    prefill.bookTypeId,
    prefill.bookType,
    prefill.genre,
    prefill.category,
    prefill.subcategory,
    prefill.subgenre,
  ].map(normalizeGenre).join(" ");
  if (/\bself-help|business|education|manual|nonfiction|non-fiction|cookbook|technical|software|health|fitness|productivity\b/.test(blob)) {
    return false;
  }
  return /\bfiction|romanzo|romance|thriller|fantasy|horror|sci-fi|historical|dark-romance|literary|children|fairy\b/.test(blob);
}

function hasSlot(prefill: BookForgePrefill, slot: BookForgeSlot): boolean {
  switch (slot) {
    case "title": return hasText(prefill.title);
    case "subtitle": return hasText(prefill.subtitle);
    case "authorName": return hasText(prefill.authorName || prefill.author || prefill.writerName);
    case "language": return hasText(prefill.language);
    case "marketplace": return hasText(prefill.marketplace || prefill.amazonMarketplace);
    case "bookType": return hasText(prefill.bookType || prefill.bookTypeId);
    case "category": return hasText(prefill.category);
    case "subcategory": return hasText(prefill.subcategory);
    case "genre": return hasText(prefill.genre);
    case "subgenre": return hasText(prefill.subgenre);
    case "niche": return hasText(prefill.niche);
    case "targetReader": return hasText(prefill.targetReader, 8);
    case "promise": return hasText(prefill.promise || prefill.subtitle, 8);
    case "tone": return hasText(prefill.tone);
    case "style": return hasText(prefill.style || prefill.authorStyle);
    case "chapterCount": return Number(prefill.chapterCount || prefill.numberOfChapters) > 0;
    case "bookLength": return hasText(prefill.bookLength);
    case "structureMode": return hasText(prefill.structureMode) || prefill.subchaptersEnabled != null || Number(prefill.subchaptersPerChapter) > 0;
    case "characters": return hasCharacters(prefill.characters);
    case "plot": return hasText(prefill.plot || prefill.idea, 18);
    case "conflict": return hasText(prefill.conflict, 8);
    case "transformation": return hasText(prefill.transformation || prefill.promise, 8);
    case "keywords": return hasArray(prefill.keywords);
    case "comparableBooks": return hasArray(prefill.comparableBooks);
    case "commercialAngle": return hasText(prefill.commercialAngle, 8);
    case "blueprint": return Boolean(prefill.blueprint?.chapterOutlines?.length);
    case "authorIdentity": return Boolean(prefill.authorIdentity || prefill.authorIdentityId);
    default: return false;
  }
}

function completedSlotsFor(prefill: BookForgePrefill): BookForgeSlot[] {
  return SUPPORTED_SLOTS.filter((slot) => hasSlot(prefill, slot));
}

function missingSlotsFor(prefill: BookForgePrefill): BookForgeSlot[] {
  return SUPPORTED_SLOTS.filter((slot) => !hasSlot(prefill, slot));
}

function hasFoundation(prefill: BookForgePrefill): boolean {
  const hasNiche = hasSlot(prefill, "niche") || hasSlot(prefill, "subcategory") || hasSlot(prefill, "subgenre");
  return hasSlot(prefill, "title") && hasSlot(prefill, "genre") && hasNiche;
}

function hasCharacterStudioFoundation(prefill: BookForgePrefill): boolean {
  return (
    hasSlot(prefill, "genre") &&
    hasSlot(prefill, "characters") &&
    (hasSlot(prefill, "conflict") || hasSlot(prefill, "plot"))
  );
}

function hasCharacterStudioBlueprintFoundation(prefill: BookForgePrefill): boolean {
  return (
    hasCharacterStudioFoundation(prefill) &&
    hasSlot(prefill, "title") &&
    hasSlot(prefill, "subtitle") &&
    hasSlot(prefill, "promise") &&
    hasSlot(prefill, "targetReader") &&
    hasSlot(prefill, "structureMode") &&
    hasSlot(prefill, "chapterCount")
  );
}

function isCharacterStudioHandoff(input: BookForgeHandoff | BookForgePrefill): boolean {
  return "source" in input && input.source === "character-studio";
}

export function resolveBookForgeStartStep(input: BookForgeHandoff | BookForgePrefill): BookForgeStartStep {
  const prefill = "prefill" in input ? input.prefill : input;
  const fromCharacterStudio = isCharacterStudioHandoff(input);

  if (prefill.blueprintApproved) return "writer";
  if (hasSlot(prefill, "blueprint")) return "blueprint-approval";

  if (fromCharacterStudio && hasCharacterStudioFoundation(prefill)) {
    return hasCharacterStudioBlueprintFoundation(prefill) ? "blueprint-generation" : "plot-forge";
  }

  if (!hasFoundation(prefill)) return "book-foundation";

  const hasExplicitFormat =
    fromCharacterStudio ||
    hasText(prefill.bookFormat) ||
    hasText(prefill.bookTypeId) ||
    hasText(prefill.bookType);
  const poetry = isPoetryHandoff(prefill);
  if (poetry && hasExplicitFormat) {
    return hasSlot(prefill, "structureMode") && hasSlot(prefill, "promise")
      ? "blueprint-generation"
      : "poetry-forge";
  }

  const manual = isManualHandoff(prefill);
  if (manual && hasExplicitFormat) {
    return hasSlot(prefill, "structureMode") && hasSlot(prefill, "transformation")
      ? "blueprint-generation"
      : "manual-forge";
  }

  if (isFictionHandoff(prefill)) {
    if (!hasSlot(prefill, "characters")) return "character-forge";
    if (!hasSlot(prefill, "plot") || !hasSlot(prefill, "conflict")) return "plot-forge";
  } else if (!hasSlot(prefill, "transformation") || !hasSlot(prefill, "structureMode")) {
    return "structure-forge";
  }

  return "blueprint-generation";
}

function lockReasonFor(prefill: BookForgePrefill, startStep: BookForgeStartStep): string {
  if (startStep === "writer") return "Blueprint già approvato: il percorso converge direttamente sul Writer.";
  if (startStep === "blueprint-approval") return "Blueprint già presente ma non approvato: serve conferma autore.";
  if (startStep === "book-foundation") {
    return "Mancano titolo, genere o nicchia: Book Forge deve completare le fondamenta.";
  }
  if (startStep === "character-forge") return "Fondamenta commerciali presenti; mancano personaggi fiction validi.";
  if (startStep === "plot-forge") return "Titolo, genere e personaggi presenti; manca trama/conflitto.";
  if (startStep === "structure-forge") return "Metadata presenti; manca struttura o trasformazione nonfiction.";
  if (startStep === "poetry-forge") return "Preset poesia rilevato: evita personaggi/trama da romanzo.";
  if (startStep === "manual-forge") return "Preset manuale rilevato: completa struttura pratica senza logiche romance/thriller/fantasy.";
  return `Slot completati: ${completedSlotsFor(prefill).join(", ") || "nessuno"}.`;
}

export function buildBookForgeHandoff(
  source: BookForgeSource,
  collectedData: BookForgePrefill,
): BookForgeHandoff {
  const prefill: BookForgePrefill = { ...collectedData };
  if (prefill.marketplace && !prefill.amazonMarketplace) prefill.amazonMarketplace = prefill.marketplace;
  if (prefill.chapterCount && !prefill.numberOfChapters) prefill.numberOfChapters = prefill.chapterCount;
  const explicitFormat = prefill.bookFormat || prefill.bookTypeId || prefill.bookType;
  const { studio, kernel } = resolveUniversalBookStudio({
    config: prefill,
    idea: text(prefill.idea || prefill.promise || prefill.commercialAngle || prefill.subtitle),
    explicitBookFormat: explicitFormat,
  });
  prefill.studioId = prefill.studioId || studio.id;
  prefill.studioName = prefill.studioName || studio.visibleName;
  prefill.studioGenerator = prefill.studioGenerator || studio.generatorName;
  prefill.studioBlueprint = prefill.studioBlueprint || studio.blueprintName;
  prefill.studioQualityGate = prefill.studioQualityGate || studio.qualityGateName;
  prefill.studioExportProfile = prefill.studioExportProfile || studio.exportProfile;
  if (explicitFormat || source === "character-studio") {
    prefill.bookFormat = prefill.bookFormat || kernel.bookFormat;
  }
  prefill.blueprintType = prefill.blueprintType || kernel.blueprintType;
  prefill.generationStrategy = prefill.generationStrategy || kernel.generationStrategy;
  prefill.contentMode = prefill.contentMode || kernel.contentMode;

  if (source === "character-studio") {
    const canonicalSlots: BookForgeSlot[] = [
      "title",
      "subtitle",
      "language",
      "bookType",
      "category",
      "subcategory",
      "genre",
      "subgenre",
      "niche",
      "targetReader",
      "promise",
      "tone",
      "style",
      "chapterCount",
      "bookLength",
      "structureMode",
      "characters",
      "plot",
      "conflict",
      "transformation",
      "commercialAngle",
    ];
    prefill.approvedSlots = Array.from(
      new Set([
        ...(prefill.approvedSlots ?? []),
        ...canonicalSlots.filter((slot) => hasSlot(prefill, slot)),
      ]),
    );
    prefill.canonicalSource = "character-studio";
  }

  const completedSlots = completedSlotsFor(prefill);
  const missingSlots = missingSlotsFor(prefill);
  const draftHandoff: BookForgeHandoff = {
    id: `book-forge-handoff-${source}-${Date.now()}`,
    source,
    prefill,
    completedSlots,
    missingSlots,
    recommendedStartStep: "book-foundation",
    lockReason: "",
    createdAt: new Date().toISOString(),
  };
  const recommendedStartStep = resolveBookForgeStartStep(draftHandoff);
  return {
    ...draftHandoff,
    recommendedStartStep,
    lockReason: lockReasonFor(prefill, recommendedStartStep),
  };
}

function preferExisting<T>(current: T | undefined, incoming: T | undefined): T | undefined {
  if (Array.isArray(current) && current.length > 0) return current;
  if (typeof current === "string" && current.trim()) return current;
  if (typeof current === "number" && Number.isFinite(current) && current > 0) return current;
  if (typeof current === "boolean") return current;
  if (current && typeof current === "object") return current;
  return incoming;
}

export function mergeHandoffIntoBookConfig(config: BookConfig, handoff: BookForgeHandoff): BookConfig {
  const p = handoff.prefill;
  return {
    ...config,
    title: preferExisting(config.title, p.title) || config.title,
    subtitle: preferExisting(config.subtitle, p.subtitle || p.promise) || config.subtitle,
    authorName: preferExisting(config.authorName, p.authorName || p.author) || config.authorName,
    author: preferExisting(config.author, p.author || p.authorName) || config.author,
    writerName: preferExisting(config.writerName, p.writerName) || config.writerName,
    language: preferExisting(config.language, p.language as Language) || config.language,
    amazonMarketplace: preferExisting(config.amazonMarketplace, p.amazonMarketplace || p.marketplace) || config.amazonMarketplace,
    bookTypeId: preferExisting(config.bookTypeId, p.bookTypeId || p.bookType) || config.bookTypeId,
    genre: preferExisting(config.genre, p.genre as Genre) || config.genre,
    category: preferExisting(config.category, p.category) || config.category,
    subcategory: preferExisting(config.subcategory, p.subcategory || p.niche) || config.subcategory,
    subgenre: preferExisting(config.subgenre, p.subgenre || p.niche) || config.subgenre,
    targetReader: preferExisting(config.targetReader, p.targetReader) || config.targetReader,
    tone: preferExisting(config.tone, p.tone || p.style) || config.tone,
    authorStyle: preferExisting(config.authorStyle, p.authorStyle || p.style) || config.authorStyle,
    bookLength: preferExisting(config.bookLength, p.bookLength) || config.bookLength,
    numberOfChapters: preferExisting(config.numberOfChapters, p.numberOfChapters || p.chapterCount) || config.numberOfChapters,
    subchaptersEnabled: preferExisting(config.subchaptersEnabled, p.subchaptersEnabled) ?? config.subchaptersEnabled,
    subchaptersPerChapter: preferExisting(config.subchaptersPerChapter, p.subchaptersPerChapter) || config.subchaptersPerChapter,
    characters: preferExisting(config.characters, p.characters) || config.characters,
    authorIdentity: preferExisting(config.authorIdentity, p.authorIdentity) || config.authorIdentity,
    authorIdentityId: preferExisting(config.authorIdentityId, p.authorIdentityId) || config.authorIdentityId,
    idea: preferExisting(
      config.idea,
      [
        p.idea,
        p.plot && `Trama: ${p.plot}`,
        p.conflict && `Conflitto: ${p.conflict}`,
        p.transformation && `Trasformazione: ${p.transformation}`,
        p.commercialAngle && `Angolo commerciale: ${p.commercialAngle}`,
        p.keywords?.length ? `Keyword: ${p.keywords.join(", ")}` : "",
        p.comparableBooks?.length ? `Comparable: ${p.comparableBooks.join(", ")}` : "",
      ].filter(Boolean).join("\n\n"),
    ) || config.idea,
  };
}

export function validateBookForgeHandoff(handoff: BookForgeHandoff): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!handoff.source) errors.push("source mancante");
  if (!handoff.prefill || typeof handoff.prefill !== "object") errors.push("prefill mancante");
  if (!Array.isArray(handoff.completedSlots)) errors.push("completedSlots non valido");
  if (!Array.isArray(handoff.missingSlots)) errors.push("missingSlots non valido");
  if (!handoff.recommendedStartStep) errors.push("recommendedStartStep mancante");
  if (handoff.recommendedStartStep === "writer" && !handoff.prefill.blueprintApproved) {
    errors.push("writer richiede blueprintApproved=true");
  }
  return { ok: errors.length === 0, errors };
}

export function bookForgeStartStepToStudioStep(step: BookForgeStartStep): number {
  if (step === "character-forge") return 3;
  if (step === "plot-forge") return 5;
  if (step === "structure-forge" || step === "poetry-forge" || step === "manual-forge") return 2;
  if (step === "blueprint-generation") return 6;
  if (step === "blueprint-approval") return 7;
  return 0;
}

export function openBookForgeWithHandoff(
  navigate: (to: string, options?: { state?: unknown }) => void,
  handoff: BookForgeHandoff,
): void {
  navigate("/dashboard", { state: { openForge: true, bookForgeHandoff: handoff } });
}
