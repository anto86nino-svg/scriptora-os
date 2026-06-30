import type { BookBlueprint, BookConfig, Chapter, SubChapter } from "@/types/book";
import { getSubchaptersPerChapter } from "@/types/book";
import { resolveSubchapterTitle } from "@/lib/chapter-titles";
import { hasRealSubchapterContent } from "@/lib/manuscript/subchapter-content";

export type NarrativeSubchapterOutline = {
  title: string;
  summary: string;
  purpose?: string;
};

const PURPOSE_LABELS_IT = ["Evento", "Conseguenza", "Decisione", "Eco", "Svolta"];
const PURPOSE_LABELS_EN = ["Event", "Consequence", "Decision", "Echo", "Turn"];

const TECHNICAL_SUBCHAPTER_RE =
  /^(?:apertura|opening|pressione|pressure|scelta|choice|conseguenza|consequence|payoff|rivelazione|revelation|aftershock)$/i;

function isItalian(language?: string): boolean {
  return String(language || "").toLowerCase().includes("ital");
}

function purposeLabels(language?: string): string[] {
  return isItalian(language) ? PURPOSE_LABELS_IT : PURPOSE_LABELS_EN;
}

export function buildNarrativeSubchapterPurpose(index: number, language?: string): string {
  const labels = purposeLabels(language);
  return labels[index % labels.length]!;
}

const PURPOSE_TITLE_IT: Record<string, string> = {
  Evento: "L'evento che sposta tutto",
  Conseguenza: "La conseguenza emotiva",
  Decisione: "La decisione necessaria",
  Eco: "L'eco del capitolo",
  Svolta: "La svolta interiore",
};

const PURPOSE_TITLE_EN: Record<string, string> = {
  Event: "The event that shifts everything",
  Consequence: "The emotional consequence",
  Decision: "The necessary decision",
  Echo: "The chapter echo",
  Turn: "The inner turn",
};

export function ensureNarrativeSubchapterOutlines(
  subchapters: Array<Partial<NarrativeSubchapterOutline>>,
  chapterSummary: string,
  count: number,
  config: Partial<BookConfig>,
): NarrativeSubchapterOutline[] {
  const chapterTitleContext = {
    config,
    summary: chapterSummary,
    totalChapters: config.numberOfChapters,
  };
  const purposeTitleMap = isItalian(config.language) ? PURPOSE_TITLE_IT : PURPOSE_TITLE_EN;

  return Array.from({ length: count }, (_, index) => {
    const existing = subchapters[index] || {};
    const purpose = String(existing.purpose || buildNarrativeSubchapterPurpose(index, config.language)).trim();
    const rawTitle = String(existing.title || "").trim();
    const resolved = resolveSubchapterTitle(
      TECHNICAL_SUBCHAPTER_RE.test(rawTitle) ? "" : rawTitle,
      index,
      purpose,
      {
        ...chapterTitleContext,
        summary: String(existing.summary || chapterSummary),
      },
    );
    const title = TECHNICAL_SUBCHAPTER_RE.test(resolved) || /\b(apertura|pressione|payoff)\b/i.test(resolved)
      ? purposeTitleMap[purpose] || `${purpose}: ${chapterSummary.split(/[.!?]/)[0]?.trim() || "scena"}`
      : resolved;
    const summary = String(existing.summary || "").trim()
      || `${chapterSummary} ${isItalian(config.language) ? "Unità narrativa" : "Narrative unit"}: ${purpose}.`;
    return { title, summary, purpose };
  });
}

export function validateSubchapterOutline(outlines: NarrativeSubchapterOutline[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const purposes = outlines.map((outline) => String(outline.purpose || "").trim().toLowerCase()).filter(Boolean);
  const uniquePurposes = new Set(purposes);
  if (purposes.length && uniquePurposes.size < purposes.length) {
    issues.push("Sottocapitoli con purpose narrativo duplicato.");
  }
  outlines.forEach((outline, index) => {
    if (!String(outline.title || "").trim()) issues.push(`Sottocapitolo ${index + 1}: titolo mancante.`);
    if (!String(outline.summary || "").trim()) issues.push(`Sottocapitolo ${index + 1}: summary mancante.`);
    if (TECHNICAL_SUBCHAPTER_RE.test(String(outline.title || "").trim())) {
      issues.push(`Sottocapitolo ${index + 1}: etichetta tecnica invece di unità narrativa reale.`);
    }
  });
  return { valid: issues.length === 0, issues };
}

export function validateSubchapterNarrativeUnit(content: string): { valid: boolean; issues: string[] } {
  const text = String(content || "").trim();
  const issues: string[] = [];
  if (!hasRealSubchapterContent(text)) {
    issues.push("Contenuto troppo breve o placeholder.");
    return { valid: false, issues };
  }
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length < 2) issues.push("Manca sviluppo in più paragrafi.");
  if (!/[.!?…]["»”]?\s*$/.test(text)) issues.push("Chiusura narrativa debole.");
  return { valid: issues.length === 0, issues };
}

export function assembleChapterFromSubchapters(subchapters: SubChapter[]): string {
  return subchapters
    .map((sub) => String(sub.content || "").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function shouldUseRealSubchapterPipeline(config: BookConfig, blueprint?: BookBlueprint | null): boolean {
  const count = getSubchaptersPerChapter(config);
  if (count <= 0 || !config.subchaptersEnabled) return false;
  if (!blueprint?.chapterOutlines?.length) return false;
  return blueprint.chapterOutlines.some((outline) => Array.isArray(outline.subchapters) && outline.subchapters.length > 0);
}

export function enrichBlueprintSubchapterOutlines(blueprint: BookBlueprint, config: BookConfig): BookBlueprint {
  const count = getSubchaptersPerChapter(config);
  if (count <= 0) return blueprint;
  return {
    ...blueprint,
    chapterOutlines: blueprint.chapterOutlines.map((outline) => ({
      ...outline,
      subchapters: ensureNarrativeSubchapterOutlines(
        Array.isArray(outline.subchapters) ? outline.subchapters : [],
        outline.summary,
        count,
        config,
      ),
    })),
  };
}

export function buildSubchapterContextBlock(previousSubchapters: SubChapter[]): string {
  if (!previousSubchapters.length) return "";
  const lines = previousSubchapters.map((sub, index) =>
    `Subchapter ${index + 1} "${sub.title}": ${String(sub.content || "").slice(-400)}`,
  );
  return `PREVIOUS SUBCHAPTERS IN THIS CHAPTER (continue forward, do not repeat):\n${lines.join("\n")}`;
}

export function finalizeAssembledChapter(chapter: Chapter): Chapter {
  const subs = Array.isArray(chapter.subchapters) ? chapter.subchapters : [];
  return {
    ...chapter,
    content: assembleChapterFromSubchapters(subs),
    subchapters: subs,
  };
}
