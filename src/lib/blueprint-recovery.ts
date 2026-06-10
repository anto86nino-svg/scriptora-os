import type { BookBlueprint, BookConfig } from "@/types/book";
import { getSubchaptersPerChapter } from "@/types/book";
import { getGenreBlueprint } from "@/lib/genre-intelligence";
import { isGenericChapterTitle, resolveChapterTitle } from "@/lib/chapter-titles";
import {
  normalizeBlueprintIntegrity,
  normalizeChapterOutlineExtras,
  normalizeSubchapterOutlineExtras,
} from "@/lib/BlueprintIntegrityEngine";

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
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    /* continue */
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = cleaned.slice(start, end + 1);
    try {
      JSON.parse(slice);
      return slice;
    } catch {
      return null;
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
  const editorial = getGenreBlueprint(config.genre, config.subcategory);
  const scaffold = editorial.structure.length
    ? editorial.structure
    : (isItalian(config)
      ? ["Fondamenta", "Metodo", "Pratica", "Approfondimento", "Integrazione", "Sintesi"]
      : ["Foundations", "Method", "Practice", "Deep Dive", "Integration", "Synthesis"]);
  const chapterOutlines = Array.from({ length: config.numberOfChapters }, (_, i) => {
    const beat = scaffold[i % scaffold.length] || `Step ${i + 1}`;
    const title = resolveChapterTitle(`${beat}`, i, { config, totalChapters: config.numberOfChapters });
    const summary = isItalian(config)
      ? `Capitolo ${i + 1} — ${beat}: struttura base dalla configurazione (${config.genre}). Da raffinare con AI.`
      : `Chapter ${i + 1} — ${beat}: base structure from configuration (${config.genre}). Refine with AI.`;
    return { title, summary };
  });

  return normalizeBlueprintShape({
    overview: isItalian(config)
      ? `Struttura base creata dalla configurazione per "${config.title}". Non è un blueprint AI completo: puoi raffinarla capitolo per capitolo o rigenerare con AI. Genere: ${config.genre}. Promessa: ${config.subtitle || config.title}.`
      : `Base structure created from configuration for "${config.title}". This is not a full AI blueprint — refine per chapter or regenerate with AI. Genre: ${config.genre}. Promise: ${config.subtitle || config.title}.`,
    chapterOutlines,
    themes: [config.genre, config.tone, config.subcategory || config.category].filter(Boolean),
    emotionalArc: isItalian(config)
      ? "Progressione pratica e chiara — da raffinare con AI."
      : "Clear practical progression — refine with AI.",
  }, config);
}

export function resolveBlueprintFromAiResponse(
  rawResponse: string,
  config: BookConfig,
): { ok: true; blueprint: BookBlueprint; source: BlueprintSource } | { ok: false; errors: string[] } {
  const repaired = repairBlueprintResponse(rawResponse, config);
  if (repaired.candidate) {
    return { ok: true, blueprint: repaired.candidate, source: repaired.source };
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
