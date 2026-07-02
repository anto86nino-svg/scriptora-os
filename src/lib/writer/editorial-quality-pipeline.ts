import type { BookBlueprint, BookConfig, Chapter, FrontMatter, BackMatter } from "@/types/book";
import { isLiteraryRomanceGenreContext } from "@/lib/concept-dominance";
import { hasRichIdeaEntities, isGenericBlueprintBeat } from "@/lib/blueprint-entity-enrichment";
import {
  applyNarrativeCleanupPass,
  applyNarrativeCleanupToChapter,
  type NarrativeCleanupContext,
} from "@/lib/writer/narrative-cleanup-pass";
import { applyRepetitionGuard } from "@/lib/writer/repetition-guard";
import { applyEditorialNovelModePass, isEditorialNovelModeGenre } from "@/lib/writer/editorial-novel-mode";
import {
  applyTraditionalEditorLocalPrep,
  shouldApplyTraditionalEditorPass,
} from "@/lib/writer/traditional-editor-pass";
import { validateNarrativeTimeline } from "@/lib/writer/narrative-timeline-validator";
import { runNarrativeContinuityGate } from "@/lib/writer/narrative-continuity-gate";
import { detectNarrativeCorruption } from "@/lib/writer/narrative-cleanup-pass";
import { assembleChapterFromSubchapters, isScaffoldSubchapterBeatTitle } from "@/lib/writer/subchapter-pipeline";
import { resyncSubchapterContentsFromChapter } from "@/lib/manuscript/subchapter-content";

export type EditorialContentKind = "chapter" | "subchapter" | "front_matter" | "back_matter";

export type EditorialQualityPipelineContext = NarrativeCleanupContext & {
  config?: Partial<BookConfig>;
  contentKind?: EditorialContentKind;
  synopsis?: string;
  overview?: string;
  chapterIndex?: number;
};

export type EditorialQualityPipelineResult = {
  text: string;
  fixesApplied: number;
  issues: string[];
  timelineValid: boolean;
  continuityPass?: boolean;
  needsTraditionalEditorAi: boolean;
};

const BACKWARD_ARC_LABELS = [
  "ritorno alla normalità",
  "ritorno alla normalita",
  "back to normal",
  "return to normal",
  "prima ancora",
  "ancora all'inizio",
  "flashback implicito",
  "torna indietro",
  "regressione emotiva",
];

const PHILOSOPHY_BEAT_MARKERS = [
  "tradizione filosofica",
  "implicazione esistenziale",
  "paradosso ontologico",
  "riflessione metafisica",
  "ontological paradox",
  "philosophical tradition",
  "existential implication",
];

const MATTER_MIN_LENGTHS: Record<string, number> = {
  dedication: 8,
  letterToReader: 40,
  aboutAuthor: 30,
  howToUse: 20,
  conclusion: 40,
  authorNote: 20,
  callToAction: 15,
  reviewRequest: 15,
};

function normalizeHay(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleKey(value: string): string {
  return normalizeHay(value).replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

function isRomanceGenre(config: Partial<BookConfig>): boolean {
  const hay = normalizeHay(`${config.genre || ""} ${config.subcategory || ""} ${config.subgenre || ""}`);
  return /\b(romance|romantico|romantica)\b/.test(hay)
    && !/\b(dark\s*romance|horror|thriller)\b/.test(hay);
}

export function buildMaximumEditorialQualityPromptBlock(
  config: Partial<BookConfig>,
  opts: { contentKind?: EditorialContentKind; language?: string } = {},
): string {
  const language = opts.language || config.language || "Italian";
  const isItalian = language.toLowerCase().includes("ital");
  const literaryRomance = isEditorialNovelModeGenre(config);
  const kindLabel = opts.contentKind === "front_matter"
    ? "front matter"
    : opts.contentKind === "back_matter"
      ? "back matter"
      : opts.contentKind === "subchapter"
        ? "subchapter"
        : "chapter";

  const romanceShowDontTell = literaryRomance
    ? (isItalian
      ? "- Romance letterario italiano: mostra, non raccontare — emozione tramite gesto, ritmo, oggetto, silenzio, non etichette."
      : "- Literary romance: show don't tell — emotion through gesture, rhythm, object and silence, not labels.")
    : "";

  if (isItalian) {
    return `MASSIMA QUALITÀ EDITORIALE — ${kindLabel.toUpperCase()} (obbligatorio):
- NON ripetere scene, dialoghi o riflessioni già scritte in questo testo o nei capitoli precedenti.
- NON tornare indietro nel tempo senza marcatore esplicito di flashback (es. «anni prima», «quel giorno»).
- Vietati paragrafi isolati di una sola frase in stile social — ogni paragrafo è un'unità narrativa completa.
- Solo slancio narrativo in avanti: ogni scena deve produrre una conseguenza per la successiva.
- Vietate ripetizioni di gesti cliché (mano sul viso, guardare fuori finestra, «il silenzio cadde») — max una volta per capitolo.
- Nessuna ripetizione di metafore, tic fisici o formule emotive già usate.
${romanceShowDontTell}`;
  }

  return `MAXIMUM EDITORIAL QUALITY — ${kindLabel.toUpperCase()} (mandatory):
- NO repetition of scenes, dialogues or reflections already written in this text or prior chapters.
- NO backward time without an explicit flashback marker (e.g. "years earlier", "that day").
- NO isolated one-sentence paragraphs in social-media style — each paragraph is a complete narrative unit.
- Forward narrative momentum only: every scene must produce a consequence for the next.
- NO repeated gesture clichés (hand on face, looking out the window, "silence fell") — max once per chapter.
- NO repeated metaphors, physical tics or emotional formulas already used.
${romanceShowDontTell}`;
}

export function runEditorialQualityPipeline(
  text: string,
  context: EditorialQualityPipelineContext = {},
): EditorialQualityPipelineResult {
  const issues: string[] = [];
  let fixesApplied = 0;
  let result = String(text || "").trim();
  if (!result) {
    return {
      text: result,
      fixesApplied: 0,
      issues: [],
      timelineValid: true,
      needsTraditionalEditorAi: false,
    };
  }

  const cleanup = applyNarrativeCleanupPass(result, context);
  result = cleanup.text;
  fixesApplied += cleanup.fixesApplied;
  issues.push(...cleanup.issues.map((issue) => issue.message));

  const repetition = applyRepetitionGuard(result);
  result = repetition.text;
  fixesApplied += repetition.fixesApplied;
  issues.push(...repetition.issues.map((issue) => issue.message));

  const timeline = validateNarrativeTimeline(result);
  if (!timeline.valid) {
    issues.push(...timeline.issues.map((issue) => issue.message));
  }

  if (isEditorialNovelModeGenre(context.config || {})) {
    const novelPass = applyEditorialNovelModePass(result);
    if (novelPass !== result) fixesApplied += 1;
    result = novelPass;
  }

  const needsTraditionalEditorAi = shouldApplyTraditionalEditorPass(context.config || {});
  if (needsTraditionalEditorAi) {
    const prepped = applyTraditionalEditorLocalPrep(result);
    if (prepped !== result) fixesApplied += 1;
    result = prepped;
  }

  return {
    text: result,
    fixesApplied,
    issues,
    timelineValid: timeline.valid,
    needsTraditionalEditorAi,
  };
}

export function runEditorialQualityPipelineOnChapter(
  chapter: Chapter,
  context: EditorialQualityPipelineContext = {},
): { chapter: Chapter; result: EditorialQualityPipelineResult; continuityPass: boolean } {
  const cleaned = applyNarrativeCleanupToChapter(chapter, context);
  const chapterIndex = context.chapterIndex ?? 0;
  let subs = (cleaned.subchapters || []).map((sub) => {
    const pipeline = runEditorialQualityPipeline(String(sub.content || ""), {
      ...context,
      contentKind: "subchapter",
    });
    return { ...sub, content: pipeline.text };
  });

  let content = assembleChapterFromSubchapters(subs);
  const fullPipeline = runEditorialQualityPipeline(content, {
    ...context,
    contentKind: "chapter",
  });

  if (fullPipeline.text !== content) {
    subs = resyncSubchapterContentsFromChapter(fullPipeline.text, subs, chapterIndex);
    content = assembleChapterFromSubchapters(subs);
  }

  const assembled: Chapter = {
    ...cleaned,
    subchapters: subs,
    content,
  };

  const gate = runNarrativeContinuityGate(assembled, { language: context.language });
  return {
    chapter: assembled,
    result: { ...fullPipeline, text: content },
    continuityPass: gate.pass,
  };
}

export function validateBlueprintEditorialQuality(
  blueprint: BookBlueprint,
  config: BookConfig,
): string[] {
  const errors: string[] = [];
  const idea = String((config as BookConfig & { idea?: string }).idea || "").trim();
  const outlines = blueprint.chapterOutlines || [];
  const titleKeys = new Map<string, number>();
  const beatKeys = new Map<string, number>();

  outlines.forEach((outline, index) => {
    const titleKey = normalizeTitleKey(outline.title || "");
    if (titleKey) {
      const first = titleKeys.get(titleKey);
      if (first != null) {
        errors.push(`titoli capitolo duplicati: "${outline.title}" (cap. ${first + 1} e ${index + 1})`);
      } else {
        titleKeys.set(titleKey, index);
      }
    }

    if (idea && hasRichIdeaEntities(idea)) {
      if (isGenericBlueprintBeat(outline.title || "") || isGenericBlueprintBeat(outline.summary || "")) {
        errors.push(`capitolo ${index + 1}: beat generico su idea entity-rich`);
      }
    }

    for (const sub of outline.subchapters || []) {
      const beatKey = normalizeTitleKey(sub.title || "");
      const hasScaffoldPurpose = Boolean(String(sub.purpose || "").trim());
      if (!beatKey || hasScaffoldPurpose || isScaffoldSubchapterBeatTitle(sub.title || "")) continue;
      const firstBeat = beatKeys.get(beatKey);
      if (firstBeat != null) {
        errors.push(`beat duplicato tra capitoli: "${sub.title}" (cap. ${firstBeat + 1} e ${index + 1})`);
      } else {
        beatKeys.set(beatKey, index);
      }
    }
  });

  const arcHay = normalizeHay([
    blueprint.emotionalArc,
    ...(blueprint.themes || []),
    ...outlines.map((outline, index) => `${index}:${outline.title} ${outline.summary}`),
  ].join("\n"));

  for (let i = 1; i < outlines.length; i += 1) {
    const prevTitle = normalizeHay(outlines[i - 1]?.title || "");
    const currTitle = normalizeHay(outlines[i]?.title || "");
    const prevSummary = normalizeHay(outlines[i - 1]?.summary || "");
    const currSummary = normalizeHay(outlines[i]?.summary || "");

    const backwardInTitle = BACKWARD_ARC_LABELS.some((label) => currTitle.includes(normalizeHay(label)));
    const backwardInSummary = BACKWARD_ARC_LABELS.some((label) => currSummary.includes(normalizeHay(label)));
    const lateRegression = i >= Math.floor(outlines.length / 2)
      && (backwardInTitle || backwardInSummary)
      && !prevTitle.includes("flashback")
      && !currTitle.includes("flashback");

    if (lateRegression) {
      errors.push(`capitolo ${i + 1}: etichetta ad arco regressivo senza flashback esplicito`);
    }
  }

  if (isRomanceGenre(config) || isLiteraryRomanceGenreContext({
    genre: config.genre,
    subcategory: config.subcategory,
    subgenre: config.subgenre,
    bookTypeId: config.bookTypeId,
  })) {
    for (const marker of PHILOSOPHY_BEAT_MARKERS) {
      if (arcHay.includes(normalizeHay(marker))) {
        errors.push(`romance: beat filosofico vietato (${marker})`);
        break;
      }
    }
  }

  return errors;
}

function splitParagraphs(text: string): string[] {
  return String(text || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function hasSynopsisOverlap(field: string, synopsis: string): boolean {
  const fieldHay = normalizeHay(field);
  const synopsisHay = normalizeHay(synopsis);
  if (!fieldHay || !synopsisHay || synopsisHay.length < 40) return false;

  const words = synopsisHay.split(" ").filter((word) => word.length > 4);
  if (words.length < 6) return false;

  let consecutive = 0;
  for (let i = 0; i <= words.length - 6; i += 1) {
    const chunk = words.slice(i, i + 6).join(" ");
    if (fieldHay.includes(chunk)) {
      consecutive += 1;
      if (consecutive >= 1) return true;
    }
  }

  return fieldHay.length > 80 && fieldHay.includes(synopsisHay.slice(0, Math.min(120, synopsisHay.length)));
}

export function validateFrontBackMatterQuality(
  matter: FrontMatter | BackMatter,
  opts: {
    kind: "front" | "back";
    synopsis?: string;
    overview?: string;
    language?: string;
  },
): string[] {
  const errors: string[] = [];
  const synopsis = opts.synopsis || opts.overview || "";
  const entries = Object.entries(matter as Record<string, string>);

  const paragraphFingerprints = new Map<string, string>();

  for (const [field, value] of entries) {
    const text = String(value || "").trim();
    if (!text) continue;

    const minLength = MATTER_MIN_LENGTHS[field];
    if (minLength && text.length < minLength) {
      errors.push(`${field}: contenuto troppo breve (min ${minLength} caratteri)`);
    }

    const corruption = detectNarrativeCorruption(text, { language: opts.language });
    if (corruption.length > 0) {
      errors.push(`${field}: frammenti corrotti (${corruption[0]?.kind})`);
    }

    if (synopsis && hasSynopsisOverlap(text, synopsis)) {
      errors.push(`${field}: ripete la sinossi del libro verbatim`);
    }

    for (const paragraph of splitParagraphs(text)) {
      const key = normalizeHay(paragraph);
      if (key.length < 40) continue;
      const prior = paragraphFingerprints.get(key);
      if (prior) {
        errors.push(`paragrafo duplicato tra ${prior} e ${field}`);
      } else {
        paragraphFingerprints.set(key, field);
      }
    }
  }

  if (opts.kind === "front") {
    const front = matter as FrontMatter;
    const dedicationHay = normalizeHay(front.dedication || "");
    const letterHay = normalizeHay(front.letterToReader || "");
    if (dedicationHay && letterHay && dedicationHay.length > 30 && letterHay.includes(dedicationHay)) {
      errors.push("letterToReader: ripete la dedica verbatim");
    }
  }

  return errors;
}

export function applyEditorialQualityToMatterFields<T extends FrontMatter | BackMatter>(
  matter: T,
  context: EditorialQualityPipelineContext,
): T {
  const result = { ...matter } as Record<string, string>;
  for (const [key, value] of Object.entries(matter)) {
    if (!String(value || "").trim()) continue;
    result[key] = runEditorialQualityPipeline(String(value), {
      ...context,
      contentKind: context.contentKind,
    }).text;
  }
  return result as T;
}
