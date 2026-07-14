import type { BookBlueprint, BookConfig, Chapter, SubChapter } from "@/types/book";
import { getSubchaptersPerChapter } from "@/types/book";
import { resolveSubchapterTitle } from "@/lib/chapter-titles";
import {
  distributeChapterContentToSubchapters,
  hasRealSubchapterContent,
  resyncSubchapterContentsFromChapter,
} from "@/lib/manuscript/subchapter-content";
import {
  analyzeSubchapterContinuity,
  buildContinuityRepairPromptBlock,
  buildSubchapterHandoffPromptBlock,
  CONTINUITY_SCORE_THRESHOLD,
  reconstructSubchapterSequence,
  type SubchapterContinuityAnalysis,
} from "@/lib/writer/subchapter-continuity-engine";
import { extractDeliveredRevelations } from "@/lib/writer/chapter-continuity-assembly";
import { repairSubchapterSplitBoundaries, detectSubchapterBoundaryIssues } from "@/lib/writer/clean-text-pass";

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
  const repaired = repairSubchapterSplitBoundaries(subchapters);
  return repaired.subchapters.reduce((assembled, sub, index) => {
    const content = String(sub.content || "").trim();
    if (!content) return assembled;
    const previousBoundary = index - 1;
    const shouldJoinTight = repaired.issues.some((issue) => issue.boundaryIndex === previousBoundary && issue.repaired);
    if (!assembled) return content;
    return `${assembled}${shouldJoinTight ? " " : "\n\n"}${content}`;
  }, "").trim();
}

export function hasSubchapterBoundaryCorruption(subchapters: Array<Pick<SubChapter, "content">>): boolean {
  return detectSubchapterBoundaryIssues(subchapters).length > 0;
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
  const lastSub = previousSubchapters[previousSubchapters.length - 1]!;
  const handoff = buildSubchapterHandoffPromptBlock(lastSub);
  const lastEnding = String(lastSub.content || "").trim().slice(-600);
  const revelations = extractDeliveredRevelations(previousSubchapters);
  const revelationBlock = revelations.length
    ? `INFORMAZIONI GIÀ RIVELATE AL LETTORE (NON reintrodurre):\n${revelations.map((r) => `- ${r}`).join("\n")}`
    : "";

  const stateLocation = /\b(?:a casa|in casa|at home)\b/i.test(lastEnding.slice(-200))
    ? "casa"
    : /\b(?:porta|soglia|entr[òo])\b/i.test(lastEnding.slice(-200))
      ? "soglia/ingresso"
      : /\b(?:incontr|appuntamento)\b/i.test(lastEnding.slice(-200))
        ? "incontro in corso o appena concluso"
        : "scena in corso";

  const lines = previousSubchapters.map((sub, index) =>
    `Subchapter ${index + 1} "${sub.title}" (closing): ${String(sub.content || "").slice(-400)}`,
  );

  return [
    handoff,
    `LAST 600 CHARS OF PREVIOUS SUBCHAPTER:\n"""${lastEnding}"""`,
    `SCENE STATE: location/situation ≈ ${stateLocation}; continue forward from this exact moment.`,
    revelationBlock,
    `PREVIOUS SUBCHAPTERS IN THIS CHAPTER (continue forward, do NOT repeat):\n${lines.join("\n")}`,
    "REGOLA: NON reintrodurre informazioni già rivelate al lettore. NON ripetere eventi già narrati.",
  ].filter(Boolean).join("\n\n");
}

export function auditSubchapterContinuity(
  subchapters: SubChapter[],
  context?: { language?: string },
): SubchapterContinuityAnalysis {
  return analyzeSubchapterContinuity({ subchapters }, context);
}

export function repairSubchapterContinuityIfNeeded(
  chapter: Chapter,
  context?: { language?: string },
): { chapter: Chapter; analysis: SubchapterContinuityAnalysis; repaired: boolean } {
  const subs = Array.isArray(chapter.subchapters) ? chapter.subchapters : [];
  const analysis = analyzeSubchapterContinuity({ subchapters: subs }, context);
  const hasCritical = analysis.errors.some((e) => e.severity === "critical");
  const needsRepair = analysis.score < CONTINUITY_SCORE_THRESHOLD || hasCritical;

  if (!needsRepair || subs.length < 2) {
    return { chapter, analysis, repaired: false };
  }

  const reconstruction = reconstructSubchapterSequence(analysis, subs);
  if (reconstruction.improvedScore <= analysis.score && !reconstruction.reordered) {
    return { chapter, analysis, repaired: false };
  }

  const repairedSubs: SubChapter[] = reconstruction.subchapters.map((sub, index) => ({
    title: sub.title || subs[index]?.title || "",
    content: sub.content,
  }));

  return {
    chapter: finalizeAssembledChapter({ ...chapter, subchapters: repairedSubs }),
    analysis: {
      ...analysis,
      score: reconstruction.improvedScore,
      correctedStructure: reconstruction.subchapters,
      narrativePatch: reconstruction.patchPlan,
    },
    repaired: true,
  };
}

export { buildContinuityRepairPromptBlock, CONTINUITY_SCORE_THRESHOLD };

export function finalizeAssembledChapter(chapter: Chapter): Chapter {
  const subs = Array.isArray(chapter.subchapters) ? chapter.subchapters : [];
  return {
    ...chapter,
    content: assembleChapterFromSubchapters(subs),
    subchapters: subs,
  };
}

function normalizeBeatTitleKey(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SCAFFOLD_SUBCHAPTER_BEAT_KEYS = new Set(
  [
    ...PURPOSE_LABELS_IT,
    ...PURPOSE_LABELS_EN,
    ...Object.values(PURPOSE_TITLE_IT),
    ...Object.values(PURPOSE_TITLE_EN),
  ].map(normalizeBeatTitleKey),
);

/** Purpose-derived scaffold titles repeat per chapter by design — not AI duplicate beats. */
export function isScaffoldSubchapterBeatTitle(title: string): boolean {
  return SCAFFOLD_SUBCHAPTER_BEAT_KEYS.has(normalizeBeatTitleKey(title));
}

export function syncChapterContentWithSubchapters(
  chapter: Pick<Chapter, "title" | "content" | "subchapters">,
  chapterIndex = 0,
): Chapter {
  const subs = Array.isArray(chapter.subchapters) ? chapter.subchapters : [];
  const content = String(chapter.content || "").trim();
  if (!subs.length) {
    return { ...chapter, content, subchapters: subs };
  }
  const syncedSubs = resyncSubchapterContentsFromChapter(content, subs, chapterIndex);
  return {
    ...chapter,
    subchapters: syncedSubs,
    content,
  };
}

export function resolveGeneratedChapterAssembly(input: {
  useSubchapterPipeline: boolean;
  generatedChapter: Pick<Chapter, "content" | "subchapters">;
  finalContent: string;
  chapterIndex: number;
  expectedCount: number;
  outlineSubchapters?: Array<Partial<SubChapter>>;
  existingSubchapters?: SubChapter[];
}): { content: string; subchapters: SubChapter[] } {
  const pipelineSubs = Array.isArray(input.generatedChapter.subchapters)
    ? input.generatedChapter.subchapters
    : [];
  const hasPipelineSubs = pipelineSubs.some((sub) => hasRealSubchapterContent(sub.content));

  const subchapters = input.useSubchapterPipeline && hasPipelineSubs
    ? pipelineSubs
    : distributeChapterContentToSubchapters({
        chapterContent: input.finalContent,
        chapterIndex: input.chapterIndex,
        expectedCount: input.expectedCount,
        existingSubchapters: hasPipelineSubs
          ? pipelineSubs
          : input.existingSubchapters,
        outlineSubchapters: input.outlineSubchapters,
      });

  const hasResolvedSubs = subchapters.some((sub) => hasRealSubchapterContent(sub.content));
  const content = hasResolvedSubs
    ? assembleChapterFromSubchapters(subchapters)
    : input.finalContent;

  return { content, subchapters };
}
