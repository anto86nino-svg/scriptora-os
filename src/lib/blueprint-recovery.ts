import type { BookBlueprint, BookConfig } from "@/types/book";
import { getSubchaptersPerChapter } from "@/types/book";
import { getGenreBlueprint } from "@/lib/genre-intelligence";
import { isGenericChapterTitle, resolveChapterTitle } from "@/lib/chapter-titles";
import {
  buildBookKernelPromptBlock,
  resolveBookKernel,
  validateFormatCoherence,
  type FormatCoherenceReport,
} from "@/lib/book-intelligence";
import {
  normalizeBlueprintIntegrity,
  normalizeChapterOutlineExtras,
  normalizeSubchapterOutlineExtras,
} from "@/lib/BlueprintIntegrityEngine";
import {
  buildEntityAwareChapterScaffold,
  enrichBlueprintFromIdeaSeed,
  hasRichIdeaEntities,
} from "@/lib/blueprint-entity-enrichment";

export type BlueprintSource = "ai" | "repaired" | "config_fallback";

export class BlueprintValidationError extends Error {
  readonly errors: string[];
  readonly rawResponse?: string;

  constructor(message: string, errors: string[], rawResponse?: string) {
    super(message);
    this.name = "BlueprintValidationError";
    this.errors = errors;
    this.rawResponse = rawResponse;
  }
}

function cleanJsonFence(value: string): string {
  return String(value || "").replace(/```json\n?|```/gi, "").trim();
}

function stringifyField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(stringifyField).filter(Boolean).join("\n\n");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${key}: ${stringifyField(val)}`)
      .filter((line) => line.trim().length > 0)
      .join("\n");
  }
  return String(value);
}

function buildFallbackSubchapterTitle(chapterTitle: string, index: number, language: string): string {
  const italian = String(language || "").toLowerCase().includes("ital");
  const beats = italian
    ? ["Apertura", "Pressione", "Scelta", "Conseguenza", "Rivelazione", "Ferita", "Svolta", "Aftershock"]
    : ["Opening Move", "Pressure Point", "Choice", "Consequence", "Revelation", "Wound", "Turn", "Aftershock"];
  const beat = beats[index % beats.length];
  const cleanTitle = stringifyField(chapterTitle).replace(/^chapter\s+\d+[:.\-\s]*/i, "").trim();
  return cleanTitle ? `${cleanTitle} · ${beat}` : beat;
}

export function extractJsonFromText(raw: string): string | null {
  const cleaned = cleanJsonFence(raw);
  if (!cleaned) return null;

  const candidates: string[] = [cleaned];

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0) {
    if (end > start) candidates.push(cleaned.slice(start, end + 1));
    candidates.push(cleaned.slice(start));
  }

  for (const candidate of candidates) {
    const value = candidate.trim();
    if (!value) continue;

    try {
      JSON.parse(value);
      return value;
    } catch {
      const open = (value.match(/\{/g) || []).length;
      const close = (value.match(/\}/g) || []).length;
      if (open > close) {
        const repaired = value + "}".repeat(open - close);
        try {
          JSON.parse(repaired);
          return repaired;
        } catch {
          /* keep trying */
        }
      }
    }
  }

  return null;
}

export function normalizeBlueprintShape(raw: unknown, config: BookConfig): BookBlueprint {
  const source = raw && typeof raw === "object" ? raw as Partial<BookBlueprint> : {};
  const outlines = Array.isArray(source.chapterOutlines) ? source.chapterOutlines : [];
  const chapterOutlines = Array.from({ length: config.numberOfChapters }, (_, i) => {
    const item = outlines[i] || {};
    const summary = stringifyField((item as any).summary).trim()
      || (isItalian(config)
        ? `Sviluppa il capitolo ${i + 1} di "${config.title}" con focus pratico e progressivo.`
        : `Develop chapter ${i + 1} of "${config.title}" with practical progressive focus.`);
    const title = resolveChapterTitle(stringifyField((item as any).title).trim(), i, {
      config,
      summary,
      totalChapters: config.numberOfChapters,
    });
    const rawSubs = Array.isArray((item as any).subchapters) ? (item as any).subchapters : [];
    const subchapterCount = getSubchaptersPerChapter(config);
    const subchapters = subchapterCount > 0
      ? Array.from({ length: subchapterCount }, (_, j) => {
          const sub = rawSubs[j] || {};
          const fallbackTitle = buildFallbackSubchapterTitle(title, j, config.language);
          return {
            title: stringifyField(sub?.title).trim() || fallbackTitle,
            summary: stringifyField(sub?.summary).trim()
              || `${summary} ${isItalian(config) ? "Focus:" : "Focus:"} ${fallbackTitle.toLowerCase()}.`,
            ...normalizeSubchapterOutlineExtras(sub),
          };
        })
      : undefined;

    const extras = normalizeChapterOutlineExtras(item);
    return subchapters?.length ? { title, summary, ...extras, subchapters } : { title, summary, ...extras };
  });

  const themes = Array.isArray(source.themes)
    ? source.themes.map(stringifyField).map((x) => x.trim()).filter(Boolean)
    : [];

  return {
    overview: stringifyField(source.overview).trim()
      || (isItalian(config)
        ? `Panoramica strutturale per "${config.title}" — ${config.genre}, tono ${config.tone}.`
        : `Structural overview for "${config.title}" — ${config.genre}, tone ${config.tone}.`),
    chapterOutlines,
    themes: themes.length ? themes : [config.genre, config.tone].filter(Boolean),
    emotionalArc: stringifyField(source.emotionalArc).trim()
      || (isItalian(config)
        ? `Progressione emotiva coerente con ${config.genre} e la promessa del libro.`
        : `Emotional progression aligned with ${config.genre} and the book promise.`),
    integrity: normalizeBlueprintIntegrity((source as any).integrity || (source as any).blueprintIntegrity, config, chapterOutlines),
  };
}

function isItalian(config: BookConfig): boolean {
  return String(config.language || "").toLowerCase().includes("ital");
}

function normalizeForValidation(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function validateBlueprintMatchesFormat(candidate: BookBlueprint, config: BookConfig): string[] {
  const errors: string[] = [];
  const haystack = normalizeForValidation(
    [
      candidate.overview,
      candidate.emotionalArc,
      ...(candidate.themes || []),
      ...(candidate.chapterOutlines || []).flatMap((outline) => [
        outline.title,
        outline.summary,
        ...(outline.subchapters || []).flatMap((sub) => [sub.title, sub.summary]),
      ]),
    ].filter(Boolean).join("\n"),
  );
  const format = String(config.bookFormat || "").toLowerCase().trim();

  if (
    format === "cookbook" &&
    (/tradizione filosofica/.test(haystack) || /implicazione esistenziale/.test(haystack))
  ) {
    errors.push("cookbook contiene marcatori filosofici vietati (Tradizione filosofica / Implicazione esistenziale)");
  }
  if (format === "poetry_collection" && /capitolo 1 normalita/.test(haystack)) {
    errors.push("poetry_collection contiene pattern narrativo vietato (Capitolo 1 Normalità)");
  }
  if (format === "workbook" && /hero journey|escalation|plot twist/.test(haystack)) {
    errors.push("workbook contiene pattern narrativi vietati (Hero journey / Escalation / Plot twist)");
  }
  if (format === "manual" && /protagonista|romance arc/.test(haystack)) {
    errors.push("manual contiene pattern fiction vietati (Protagonista / Romance arc)");
  }
  return errors;
}

export function getBlueprintValidationErrors(candidate: BookBlueprint, config: BookConfig): string[] {
  const errors: string[] = [];
  if (!String(candidate.overview || "").trim() || candidate.overview.trim().length < 20) {
    errors.push("overview troppo corta o mancante");
  }
  if (!Array.isArray(candidate.chapterOutlines) || candidate.chapterOutlines.length !== config.numberOfChapters) {
    errors.push(`servono esattamente ${config.numberOfChapters} capitoli nella struttura`);
  }
  candidate.chapterOutlines?.forEach((outline, index) => {
    const title = String(outline.title || "").trim();
    const summary = String(outline.summary || "").trim();
    if (!title || isGenericChapterTitle(title)) {
      errors.push(`capitolo ${index + 1}: titolo generico o mancante`);
    }
    if (!summary || summary === "To be generated" || summary.length < 12) {
      errors.push(`capitolo ${index + 1}: riassunto troppo debole`);
    }
  });
  errors.push(...validateBlueprintMatchesFormat(candidate, config));
  return errors;
}

export function isBlueprintRecoverable(rawResponse: string): boolean {
  const json = extractJsonFromText(rawResponse);
  if (!json) return false;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (Array.isArray(parsed.chapterOutlines) && parsed.chapterOutlines.length > 0) return true;
    if (parsed.overview || parsed.themes) return true;
    return false;
  } catch {
    return false;
  }
}

export function repairBlueprintResponse(
  rawResponse: string,
  config: BookConfig,
): { candidate: BookBlueprint | null; source: BlueprintSource; errors: string[] } {
  const json = extractJsonFromText(rawResponse);
  if (!json) {
    return { candidate: null, source: "ai", errors: ["risposta AI non contiene JSON valido"] };
  }
  try {
    const parsed = JSON.parse(json);
    const normalized = normalizeBlueprintShape(parsed, config);
    const errors = getBlueprintValidationErrors(normalized, config);
    if (!errors.length) {
      return { candidate: normalized, source: "repaired", errors: [] };
    }
    return { candidate: null, source: "repaired", errors };
  } catch {
    return { candidate: null, source: "ai", errors: ["JSON non parsabile dopo estrazione"] };
  }
}

export function buildFallbackBlueprintFromConfig(config: BookConfig): BookBlueprint {
  const idea = String((config as BookConfig & { idea?: string }).idea || "").trim();
  if (hasRichIdeaEntities(idea)) {
    const scaffold = buildEntityAwareChapterScaffold(idea, config.numberOfChapters);
    const chapterOutlines = scaffold.map((beat, i) => ({
      title: resolveChapterTitle(beat.title, i, { config, totalChapters: config.numberOfChapters, summary: beat.summary }),
      summary: beat.summary,
    }));
    return enrichBlueprintFromIdeaSeed(normalizeBlueprintShape({
      overview: `Struttura narrativa ancorata all'idea per "${config.title}". Ogni capitolo sviluppa elementi concreti del seed originale.`,
      chapterOutlines,
      themes: [config.genre, config.tone, "mistero", "memoria"].filter(Boolean),
      emotionalArc: `Progressione emotiva legata all'idea originale — non template generico di genere.`,
    }, config), config, idea);
  }

  const kernel = resolveBookKernel({ config });
  const editorial = getGenreBlueprint(config.genre, config.subcategory);
  const italian = isItalian(config);
  const scaffold = kernel.bookFormat === "poetry_collection"
    ? (italian
      ? ["La ferita", "Il nome del buio", "Quello che resta acceso", "Rinascita"]
      : ["The Wound", "The Name of the Dark", "What Still Burns", "Return"])
    : kernel.bookFormat === "workbook"
      ? (italian
        ? ["Diagnosi", "Schede guidate", "Pratica", "Verifica", "Piano personale"]
        : ["Assessment", "Guided Worksheets", "Practice", "Review", "Personal Plan"])
      : kernel.bookFormat === "study_material" || kernel.bookFormat === "academic_summary"
        ? (italian
          ? ["Obiettivi", "Concetti chiave", "Esempi", "Ripasso", "Verifica"]
          : ["Objectives", "Key Concepts", "Examples", "Review", "Assessment"])
        : editorial.structure.length
          ? editorial.structure
          : (italian
            ? ["Fondamenta", "Metodo", "Pratica", "Approfondimento", "Integrazione", "Sintesi"]
            : ["Foundations", "Method", "Practice", "Deep Dive", "Integration", "Synthesis"]);

  const sectionTitle = (beat: string, index: number): string => {
    if (kernel.bookFormat === "poetry_collection") {
      const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][index] || String(index + 1);
      return italian ? `Parte ${roman} — ${beat}` : `Part ${roman} — ${beat}`;
    }
    if (kernel.bookFormat === "short_story_collection") return italian ? `Racconto ${index + 1} — ${beat}` : `Story ${index + 1} — ${beat}`;
    if (kernel.bookFormat === "workbook") return italian ? `Scheda ${index + 1} — ${beat}` : `Worksheet ${index + 1} — ${beat}`;
    if (kernel.educationalMode) return italian ? `Modulo ${index + 1} — ${beat}` : `Module ${index + 1} — ${beat}`;
    if (!kernel.narrativeMode) return italian ? `Modulo ${index + 1} — ${beat}` : `Module ${index + 1} — ${beat}`;
    return beat;
  };

  const sectionSummary = (beat: string, index: number): string => {
    if (kernel.bookFormat === "poetry_collection") {
      return italian
        ? `Sezione poetica ${index + 1} — ${beat}: organizza poesie autonome, immagini ricorrenti, voce lirica e progressione emotiva della raccolta.`
        : `Poetry section ${index + 1} — ${beat}: organize standalone poems, recurring images, lyric voice and emotional progression for the collection.`;
    }
    if (kernel.bookFormat === "workbook") {
      return italian
        ? `Scheda ${index + 1} — ${beat}: domande guidate, esercizi, spazio risposta e verifica del progresso.`
        : `Worksheet ${index + 1} — ${beat}: guided questions, exercises, answer space and progress check.`;
    }
    if (kernel.educationalMode) {
      return italian
        ? `Modulo ${index + 1} — ${beat}: obiettivo, spiegazione, esempio, ripasso, quiz/flashcard e verifica.`
        : `Module ${index + 1} — ${beat}: objective, explanation, example, recap, quiz/flashcards and assessment.`;
    }
    if (!kernel.narrativeMode) {
      return italian
        ? `Modulo ${index + 1} — ${beat}: promessa pratica, spiegazione chiara, esempi, esercizi, checklist e azioni concrete.`
        : `Module ${index + 1} — ${beat}: practical promise, clear explanation, examples, exercises, checklists and concrete actions.`;
    }
    return italian
      ? `Capitolo ${index + 1} — ${beat}: struttura base dalla configurazione (${config.genre}). Da raffinare con AI.`
      : `Chapter ${index + 1} — ${beat}: base structure from configuration (${config.genre}). Refine with AI.`;
  };

  const chapterOutlines = Array.from({ length: config.numberOfChapters }, (_, i) => {
    const beat = scaffold[i % scaffold.length] || `Step ${i + 1}`;
    const rawTitle = sectionTitle(beat, i);
    const title = kernel.bookFormat === "poetry_collection" || !kernel.narrativeMode
      ? rawTitle
      : resolveChapterTitle(rawTitle, i, { config, totalChapters: config.numberOfChapters });
    const summary = sectionSummary(beat, i);
    return { title, summary };
  });

  return normalizeBlueprintShape({
    overview: italian
      ? `Struttura base creata dalla configurazione per "${config.title}". Blueprint: ${kernel.blueprintType}. Formato bloccato: ${kernel.bookFormat}. Promessa: ${kernel.commercialPromise}.`
      : `Base structure created from configuration for "${config.title}". Blueprint: ${kernel.blueprintType}. Locked format: ${kernel.bookFormat}. Promise: ${kernel.commercialPromise}.`,
    chapterOutlines,
    themes: [kernel.bookFormat, config.genre, config.tone, config.subcategory || config.category].filter(Boolean),
    emotionalArc: italian
      ? `${kernel.commercialPromise}. Struttura: ${kernel.allowedStructures.join(" → ")}.`
      : `${kernel.commercialPromise}. Structure: ${kernel.allowedStructures.join(" → ")}.`,
  }, config);
}

export function resolveBlueprintFromAiResponse(
  rawResponse: string,
  config: BookConfig,
): { ok: true; blueprint: BookBlueprint; source: BlueprintSource } | { ok: false; errors: string[] } {
  const repaired = repairBlueprintResponse(rawResponse, config);
  const idea = String((config as BookConfig & { idea?: string }).idea || "").trim();
  if (repaired.candidate) {
    const blueprint = enrichBlueprintFromIdeaSeed(repaired.candidate, config, idea);
    return { ok: true, blueprint, source: repaired.source };
  }
  return { ok: false, errors: repaired.errors };
}

export function buildBlueprintCorrectivePrompt(config: BookConfig, previousErrors: string[]): string {
  return `La risposta precedente non rispettava lo schema richiesto.
Errori: ${previousErrors.join("; ")}.
Restituisci SOLO un oggetto JSON valido, senza markdown, senza testo prima o dopo.
Campi obbligatori: overview (string), chapterOutlines (array di esattamente ${config.numberOfChapters} elementi con title e summary), themes (array), emotionalArc (string).
Lingua obbligatoria: ${config.language}.
Titoli capitolo specifici e non generici (mai "Capitolo 1" o "Chapter 1" da soli).`;
}

export function buildFormatCoherenceCorrectivePrompt(
  config: BookConfig,
  report: FormatCoherenceReport,
): string {
  const issueSummary = report.issues
    .map((issue) => `- ${issue.message}${issue.evidence?.length ? ` (${issue.evidence.slice(0, 3).join("; ")})` : ""}`)
    .join("\n");
  return `FORMAT COHERENCE REPAIR — CRITICAL
The previous blueprint violates the locked book format. Repair it completely.

${buildBookKernelPromptBlock(config)}

Issues detected:
${issueSummary}

Rules:
- Remove ALL forbidden fiction/narrative structures if this is not a novel.
- Respect the format structure model exactly.
- Keep exactly ${config.numberOfChapters} chapter outlines.
- Return ONLY valid JSON with overview, chapterOutlines, themes, emotionalArc.
- Language: ${config.language}.
- Do NOT use numbered chapter titles like "Capitolo 1" for poetry collections.`;
}

export async function enforceBlueprintFormatCoherence(
  config: BookConfig,
  blueprint: BookBlueprint,
  source: BlueprintSource,
  retry?: () => Promise<BookBlueprint | null>,
): Promise<{ blueprint: BookBlueprint; source: BlueprintSource }> {
  const report = validateFormatCoherence(config, blueprint);
  if (report.passed) {
    return { blueprint, source };
  }

  if (retry) {
    try {
      const repairedBlueprint = await retry();
      if (repairedBlueprint) {
        const repairReport = validateFormatCoherence(config, repairedBlueprint);
        if (repairReport.passed) {
          return { blueprint: repairedBlueprint, source: "repaired" };
        }
      }
    } catch {
      /* silent — fall through to safe fallback */
    }
  }

  console.warn("Format coherence gate failed — using safe config fallback", {
    issues: report.issues.map((issue) => issue.kind),
    title: config.title,
    format: report.kernel.bookFormat,
  });

  return {
    blueprint: buildFallbackBlueprintFromConfig(config),
    source: "config_fallback",
  };
}
